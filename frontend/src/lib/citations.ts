/**
 * Which URLs the assistant is allowed to present as a source.
 *
 * ── The bug this replaces (GB-14) ───────────────────────────────────────────
 * The chat route regexed every https:// URL out of the model's own reply and
 * pushed it into `sources` with confidence "web". Nothing checked whether the
 * URL existed. A model that invented
 *
 *   https://www.canada.ca/en/immigration/fees/study-permit-2027-schedule.html   (404)
 *   https://www.ircc-pal.gc.ca/attestation/apply                                (no such host)
 *
 * produced two entries titled "canada.ca" and "ircc-pal.gc.ca" in the citations
 * UI, indistinguishable from a real one. On a platform whose users are the
 * targets of visa and housing scams, a fabricated authoritative-looking link is
 * a direct safety harm, not a quality nit.
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 * A URL is shown only if it is either:
 *   - retrieved      — it came from the RAG context, so a human curated it, or
 *   - official       — its host is in the trusted_sources allow-list AND the
 *                      URL is reachable.
 * Anything else is dropped. It is never rendered as a citation, however
 * official the hostname looks.
 *
 * Dropping rather than down-labelling is deliberate: a citation that renders at
 * all carries authority, and "we showed you a link but tagged it low-confidence"
 * is not a defence when someone wires money to a scammer.
 */

export type SourceProvenance = "retrieved" | "official";

export type Citation = {
  title: string;
  url: string;
  provenance: SourceProvenance;
  /** Human-readable, shown next to the link. */
  label: string;
};

export type TrustedSource = { name: string; host: string; type: string; confidence_weight: number };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const LABELS: Record<SourceProvenance, string> = {
  retrieved: "From GlobalBridge's verified knowledge base",
  official: "Official source, link checked",
};

// ── trusted-source allow-list ───────────────────────────────────────────────

let cache: { value: TrustedSource[]; expires: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

export async function getTrustedSources(): Promise<TrustedSource[]> {
  if (cache && cache.expires > Date.now()) return cache.value;
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/trusted-sources`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { sources: TrustedSource[] };
    cache = { value: data.sources ?? [], expires: Date.now() + CACHE_TTL_MS };
    return cache.value;
  } catch {
    // Fail closed. If the allow-list is unreachable we cannot tell an official
    // domain from an invented one, so no model-produced URL is promoted —
    // retrieved sources still show, because those were curated by a human.
    return [];
  }
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** True when `host` is the trusted host or a subdomain of it. */
export function isTrustedHost(host: string, trusted: TrustedSource[]): boolean {
  return trusted.some((t) => host === t.host || host.endsWith(`.${t.host}`));
}

// ── reachability ────────────────────────────────────────────────────────────

/** Total budget for checking a whole response's candidate links. */
const REACHABILITY_TIMEOUT_MS = 3000;

/**
 * Does this URL resolve to something that answers?
 *
 * A 403 or 405 counts as reachable: many government sites refuse HEAD or block
 * unfamiliar agents, but a refusal proves the host resolved and the server
 * answered. What we are ruling out is the invented path and the invented
 * hostname — a 404 and a DNS failure respectively.
 */
export async function isReachable(url: string, signal?: AbortSignal): Promise<boolean> {
  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(url, { method, redirect: "follow", signal });
    return res.status;
  };
  try {
    let status = await attempt("HEAD");
    // Some hosts answer 405 to HEAD; retry once with GET before judging.
    if (status === 405 || status === 501) status = await attempt("GET");
    if (status === 404 || status === 410) return false;
    return status < 500 || status === 503;
  } catch {
    // DNS failure, TLS failure, connection refused, or our own timeout.
    return false;
  }
}

// ── the entry point the routes use ──────────────────────────────────────────

export type RagResult = { title: string; source_url: string | null };

/**
 * Build the citation list for a model reply.
 *
 * `verifyReachability` exists so tests and offline environments can skip the
 * network hop; in production it stays on, because an unreachable "official"
 * link is exactly the failure being guarded against.
 */
export async function buildCitations(
  replyText: string,
  ragResults: RagResult[],
  opts: { verifyReachability?: boolean } = {},
): Promise<{ citations: Citation[]; dropped: string[] }> {
  const verify = opts.verifyReachability ?? true;
  const trusted = await getTrustedSources();

  const retrievedUrls = new Set(
    ragResults.map((r) => r.source_url).filter((u): u is string => Boolean(u)),
  );

  const citations: Citation[] = [];
  const dropped: string[] = [];

  // Retrieved sources first — a human curated these, and they should outrank
  // anything the model produced. This is the trusted-source preference the
  // docs described and nothing implemented.
  for (const r of ragResults) {
    if (!r.source_url) continue;
    if (citations.some((c) => c.url === r.source_url)) continue;
    citations.push({
      title: r.title,
      url: r.source_url,
      provenance: "retrieved",
      label: LABELS.retrieved,
    });
  }

  // Then model-produced URLs, but only from allow-listed hosts.
  const candidates: string[] = [];
  for (const url of replyText.match(/https?:\/\/[^\s)\]}<>"']+/g) ?? []) {
    const clean = url.replace(/[.,;:]+$/, "");
    if (retrievedUrls.has(clean)) continue;
    if (candidates.includes(clean) || citations.some((c) => c.url === clean)) continue;
    const host = hostOf(clean);
    if (!host) { dropped.push(clean); continue; }
    if (!isTrustedHost(host, trusted)) { dropped.push(clean); continue; }
    candidates.push(clean);
  }

  const toCheck = candidates.slice(0, 5);
  let reachable: boolean[] = toCheck.map(() => true);
  if (verify && toCheck.length > 0) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REACHABILITY_TIMEOUT_MS);
    try {
      reachable = await Promise.all(toCheck.map((u) => isReachable(u, ctrl.signal)));
    } finally {
      clearTimeout(timer);
    }
  }

  toCheck.forEach((url, i) => {
    if (!reachable[i]) { dropped.push(url); return; }
    const trust = trusted.find((t) => {
      const h = hostOf(url);
      return h ? h === t.host || h.endsWith(`.${t.host}`) : false;
    });
    citations.push({
      title: trust?.name ?? hostOf(url) ?? url,
      url,
      provenance: "official",
      label: LABELS.official,
    });
  });

  // Anything past the check budget is unverified, so it is dropped too.
  dropped.push(...candidates.slice(5));

  return { citations, dropped };
}
