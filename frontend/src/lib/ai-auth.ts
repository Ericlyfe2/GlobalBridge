/**
 * Auth + input-size gate for the /api/ai/* route handlers.
 *
 * These handlers spend money on every call. They used to accept anonymous
 * requests: the token was an optional field in the request body, and a missing
 * or invalid one simply degraded the request to "anonymous" while still billing
 * OpenAI. The only protection was an in-process IP rate limiter, whose counters
 * reset on every cold lambda and whose key (x-forwarded-for) is client-supplied.
 *
 * Verification is delegated to the Express API rather than re-implemented here.
 * `GET /api/auth/me` runs firebase-admin's verifyIdToken with checkRevoked=true,
 * so a deleted, suspended or signed-out user is rejected — the same boundary
 * every other authenticated route in the product uses. There is no second
 * source of truth to drift.
 */

import { rateLimit, tooMany } from "@/lib/rate-limit";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** How long the API is given to verify a token before we fail closed. */
const VERIFY_TIMEOUT_MS = 6000;

export type AiUser = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "mentor" | "employer" | "admin" | "super_admin";
  country_of_origin: string | null;
  country_of_residence: string | null;
  preferred_language: string;
  verification_status: string;
};

/**
 * The caller's Firebase ID token.
 *
 * `Authorization: Bearer` is the real interface. `body.token` is accepted only
 * because the assistant page shipped that way; both are the same credential.
 */
export function extractToken(req: Request, body?: unknown): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const t = header.slice(7).trim();
    if (t) return t;
  }
  const legacy = (body as { token?: unknown } | null | undefined)?.token;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
}

/** 401 with a message the UI can show as-is. */
export function unauthorized(): Response {
  return Response.json(
    { error: "Sign in to use GlobalBridge AI tools." },
    { status: 401 },
  );
}

/** 413 naming the actual limit, so the user knows how much to cut. */
export function tooLarge(limit: number): Response {
  return Response.json(
    { error: `That's too long to analyse — keep it under ${limit.toLocaleString()} characters.` },
    { status: 413 },
  );
}

/** 429 for the daily budget, distinct from the per-minute rate limit. */
function ceilingReached(resetsAt: string | undefined): Response {
  return Response.json(
    {
      error:
        "You've reached today's AI usage limit. It resets at midnight UTC — " +
        "meanwhile you can still browse opportunities, housing and the community.",
      resets_at: resetsAt,
    },
    { status: 429, headers: resetsAt ? { "Retry-After": String(secondsUntil(resetsAt)) } : undefined },
  );
}

function secondsUntil(iso: string): number {
  const s = Math.ceil((new Date(iso).getTime() - Date.now()) / 1000);
  return Number.isFinite(s) && s > 0 ? s : 60;
}

type Quota = { spent_usd: number; limit_usd: number; exceeded: boolean; resets_at?: string };

/**
 * Today's spend for this user, from the server-side ledger.
 *
 * Returns null when the ledger cannot be reached. Callers treat that as
 * "allow": failing closed would take the entire AI surface offline for an
 * infrastructure blip unrelated to anyone's budget, and the per-minute limiter
 * plus the input caps still bound the damage in that window.
 */
async function fetchQuota(token: string): Promise<Quota | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/ai/usage/today`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Quota;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type UsageRecord = {
  feature: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_hit?: boolean;
  response_time_ms?: number;
  error?: string;
};

/**
 * Write one completed call to the caller's ledger.
 *
 * Best-effort and never throws: a bookkeeping failure must not turn a
 * successful answer into an error for the user. The cost of a missed row is
 * that one call goes unbilled against the ceiling, which is strictly better
 * than failing a request the model already answered.
 */
async function recordUsage(token: string, usage: UsageRecord): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/ai/usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(usage),
    });
  } catch {
    /* ledger unavailable — see doc comment */
  }
}

/**
 * Verify the caller and return their profile, or null.
 *
 * Fails closed: a network error or timeout talking to the API rejects the
 * request rather than letting it through unauthenticated.
 */
export async function verifyUser(token: string): Promise<AiUser | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AiUser };
    return data.user ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One call that every AI route starts with: authenticate, then rate-limit.
 *
 * The limiter is keyed on the verified Postgres user id rather than an IP
 * header, so the budget follows the account. That also fixes the shared-IP
 * problem this audience actually has — dozens of students behind one campus or
 * dorm NAT no longer draw down a single pooled quota.
 *
 * Returns either the user or a Response to return immediately.
 */
export type AiSession = {
  user: AiUser;
  /** Books this call against the caller's daily budget. Never throws. */
  record: (usage: Omit<UsageRecord, "feature"> & { feature?: string }) => Promise<void>;
};

export async function requireAiUser(
  req: Request,
  opts: { feature: string; limit: number; windowMs?: number; body?: unknown },
): Promise<AiSession | { response: Response }> {
  const token = extractToken(req, opts.body);
  if (!token) return { response: unauthorized() };

  const user = await verifyUser(token);
  if (!user) return { response: unauthorized() };

  // Per-minute burst limit — cheap, in-process, keyed on the verified user.
  const rl = rateLimit(`${opts.feature}:${user.id}`, opts.limit, opts.windowMs ?? 60_000);
  if (!rl.ok) return { response: tooMany(rl.retryAfter) };

  // Daily spend ceiling — the real cost bound. Checked before the model is
  // called, so an over-budget request costs nothing.
  const quota = await fetchQuota(token);
  if (quota?.exceeded) return { response: ceilingReached(quota.resets_at) };

  return {
    user,
    record: (usage) => recordUsage(token, { feature: opts.feature, ...usage }),
  };
}

/**
 * Total characters across every user-supplied string in a payload.
 *
 * max_tokens caps only what the model writes back. Without an input cap a single
 * request can carry megabytes of prompt, which is the expensive half.
 */
export function totalChars(...parts: (string | string[] | undefined | null)[]): number {
  let n = 0;
  for (const p of parts) {
    if (typeof p === "string") n += p.length;
    else if (Array.isArray(p)) for (const s of p) n += typeof s === "string" ? s.length : 0;
  }
  return n;
}
