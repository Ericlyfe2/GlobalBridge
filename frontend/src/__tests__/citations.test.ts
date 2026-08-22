/**
 * GB-14 regression guards — AI citation honesty.
 *
 * The chat route regexed every https:// URL out of the model's own reply and
 * rendered it as a source with confidence "web". Nothing checked that the URL
 * existed. A model that invented
 *
 *   https://www.canada.ca/en/immigration/fees/study-permit-2027-schedule.html   (404)
 *   https://www.ircc-pal.gc.ca/attestation/apply                                (no such host)
 *
 * produced two citations titled "canada.ca" and "ircc-pal.gc.ca", visually
 * indistinguishable from a real one. On a platform whose users are targeted by
 * visa and housing scams, a fabricated authoritative link is a safety harm.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TrustedSource } from "@/lib/citations";

/**
 * Fresh module per test. getTrustedSources caches the allow-list for 5 minutes,
 * which is intentional — a transient outage should not immediately strip
 * citations — but it means a warm cache from a previous test would mask the
 * fail-closed behaviour being asserted here.
 */
async function citationsModule() {
  vi.resetModules();
  return import("@/lib/citations");
}

const TRUSTED: TrustedSource[] = [
  { name: "Government of Canada", host: "canada.ca", type: "gov", confidence_weight: 1 },
  { name: "UK Government", host: "gov.uk", type: "gov", confidence_weight: 1 },
];

const RAG = [
  {
    title: "Canada study permit basics",
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html",
  },
];

/** Stubs the trusted-source endpoint and controls which URLs "exist". */
function installFetch(opts: { trusted?: TrustedSource[]; reachable?: (url: string) => number } = {}) {
  const reachable = opts.reachable ?? (() => 200);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/knowledge/trusted-sources")) {
      return new Response(JSON.stringify({ sources: opts.trusted ?? TRUSTED }), { status: 200 });
    }
    if (init?.method === "HEAD" || init?.method === "GET") {
      const status = reachable(url);
      if (status === 0) throw new Error("ENOTFOUND");
      return new Response(null, { status });
    }
    return new Response("{}", { status: 200 });
  }));
}

beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });
afterEach(() => vi.unstubAllGlobals());

describe("hallucinated citations", () => {
  const REPLY = `The current GIC minimum is CAD 20,635.
Fee schedule: https://www.canada.ca/en/immigration/fees/study-permit-2027-schedule.html
Attestation: https://www.ircc-pal.gc.ca/attestation/apply
Overview: https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html`;

  it("drops an invented path on a real government host", async () => {
    installFetch({ reachable: (u) => (u.includes("2027-schedule") ? 404 : 200) });
    const { citations, dropped } = await (await citationsModule()).buildCitations(REPLY, RAG);

    expect(dropped).toContain("https://www.canada.ca/en/immigration/fees/study-permit-2027-schedule.html");
    expect(citations.map((c) => c.url)).not.toContain(
      "https://www.canada.ca/en/immigration/fees/study-permit-2027-schedule.html",
    );
  });

  it("drops an invented hostname that merely looks official", async () => {
    installFetch();
    const { citations, dropped } = await (await citationsModule()).buildCitations(REPLY, RAG);
    // ircc-pal.gc.ca is not in the allow-list, so it never even gets checked.
    expect(dropped).toContain("https://www.ircc-pal.gc.ca/attestation/apply");
    expect(citations.some((c) => c.url.includes("ircc-pal"))).toBe(false);
  });

  it("keeps the retrieved source that a human curated", async () => {
    installFetch();
    const { citations } = await (await citationsModule()).buildCitations(REPLY, RAG);
    const retrieved = citations.find((c) => c.provenance === "retrieved");
    expect(retrieved?.url).toBe(RAG[0].source_url);
    expect(retrieved?.title).toBe("Canada study permit basics");
  });

  it("renders nothing at all rather than a low-confidence link", async () => {
    // Down-labelling is not a defence: a citation that renders carries
    // authority regardless of the badge next to it.
    installFetch({ reachable: () => 404 });
    const { citations } = await (await citationsModule()).buildCitations(
      "See https://www.canada.ca/invented and https://random-blog.example/post",
      [],
    );
    expect(citations).toEqual([]);
  });
});

describe("trusted-source preference", () => {
  it("puts retrieved sources ahead of model-produced ones", async () => {
    installFetch();
    const { citations } = await (await citationsModule()).buildCitations(REPLY_WITH_OFFICIAL, RAG);
    expect(citations[0].provenance).toBe("retrieved");
  });

  const REPLY_WITH_OFFICIAL = "Guidance: https://www.gov.uk/student-visa";

  it("promotes an allow-listed host to official, with the source's real name", async () => {
    installFetch();
    const { citations } = await (await citationsModule()).buildCitations(REPLY_WITH_OFFICIAL, []);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({ provenance: "official", title: "UK Government" });
  });

  it("accepts a subdomain of a trusted host", async () => {
    expect((await citationsModule()).isTrustedHost("ircc.canada.ca", TRUSTED)).toBe(true);
    expect((await citationsModule()).isTrustedHost("canada.ca", TRUSTED)).toBe(true);
  });

  it("rejects a lookalike that merely ends with the name", async () => {
    expect((await citationsModule()).isTrustedHost("canada.ca.evil.com", TRUSTED)).toBe(false);
    expect((await citationsModule()).isTrustedHost("notcanada.ca", TRUSTED)).toBe(false);
    expect((await citationsModule()).isTrustedHost("fake-gov.uk", TRUSTED)).toBe(false);
  });

  it("fails closed when the allow-list is unreachable", async () => {
    // Unable to tell official from invented, promote nothing. Retrieved
    // sources still show, because a human curated those.
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("trusted-sources")) throw new Error("down");
      return new Response(null, { status: 200 });
    }));
    const { citations } = await (await citationsModule()).buildCitations(REPLY_WITH_OFFICIAL, RAG);
    expect(citations.every((c) => c.provenance === "retrieved")).toBe(true);
  });
});

describe("reachability judgement", () => {
  it("treats a 403 as reachable — many gov sites refuse unfamiliar agents", async () => {
    installFetch({ reachable: () => 403 });
    const { citations } = await (await citationsModule()).buildCitations("https://www.gov.uk/student-visa", []);
    expect(citations).toHaveLength(1);
  });

  it("treats a DNS failure as unverifiable", async () => {
    installFetch({ reachable: () => 0 });
    const { citations, dropped } = await (await citationsModule()).buildCitations("https://www.gov.uk/student-visa", []);
    expect(citations).toEqual([]);
    expect(dropped).toContain("https://www.gov.uk/student-visa");
  });

  it("treats a 410 Gone as unverifiable", async () => {
    installFetch({ reachable: () => 410 });
    const { citations } = await (await citationsModule()).buildCitations("https://www.gov.uk/removed-page", []);
    expect(citations).toEqual([]);
  });

  it("can be switched off without changing what is allowed through", async () => {
    installFetch({ reachable: () => 404 });
    const { citations } = await (await citationsModule()).buildCitations("https://www.gov.uk/student-visa", [], {
      verifyReachability: false,
    });
    // Still only allow-listed hosts — skipping the network hop must not skip
    // the allow-list.
    expect(citations).toHaveLength(1);
    const untrusted = await (await citationsModule()).buildCitations("https://random-blog.example/x", [], {
      verifyReachability: false,
    });
    expect(untrusted.citations).toEqual([]);
  });
});

describe("URL extraction hygiene", () => {
  it("strips trailing punctuation from a sentence-final URL", async () => {
    installFetch();
    const { citations } = await (await citationsModule()).buildCitations("Check https://www.gov.uk/student-visa.", []);
    expect(citations[0]?.url).toBe("https://www.gov.uk/student-visa");
  });

  it("does not emit the same URL twice", async () => {
    installFetch();
    const { citations } = await (await citationsModule()).buildCitations(
      "https://www.gov.uk/student-visa and again https://www.gov.uk/student-visa",
      [],
    );
    expect(citations).toHaveLength(1);
  });

  it("never double-lists a URL that is both retrieved and mentioned in the reply", async () => {
    installFetch();
    const { citations } = await (await citationsModule()).buildCitations(`See ${RAG[0].source_url}`, RAG);
    expect(citations.filter((c) => c.url === RAG[0].source_url)).toHaveLength(1);
  });
});
