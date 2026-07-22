import { describe, it, expect } from "vitest";
import { mockFallback as scamFallback } from "@/app/api/ai/scam-check/logic";
import { mockFallback as roadmapFallback } from "@/app/api/ai/visa-roadmap/logic";
import { mockFallback as readinessFallback } from "@/app/api/ai/readiness/logic";

describe("Scam Shield mockFallback", () => {
  it("flags a classic rental scam as high risk", () => {
    const text =
      "I am currently abroad so I cannot show the place. Wire the deposit via Western Union to secure it today!";
    const r = scamFallback(text);
    expect(r.score).toBeGreaterThan(66);
    expect(r.verdict).toBe("High scam risk");
    expect(r.flags.length).toBeGreaterThan(0);
    // phrases must be verbatim substrings so the UI can highlight them
    for (const f of r.flags) {
      expect(text.toLowerCase()).toContain(f.phrase.toLowerCase());
    }
  });

  it("flags an upfront-fee job scam", () => {
    const text = "Pay a one-time $95 training fee and send a copy of your passport to confirm eligibility.";
    const r = scamFallback(text);
    expect(r.score).toBeGreaterThan(33);
    expect(r.flags.some((f) => /fee|passport/i.test(f.category))).toBe(true);
  });

  it("treats a normal listing as likely safe with advice", () => {
    const text = "Bright one-bedroom near the tram. Viewings on weekends. Standard tenancy agreement and deposit protection.";
    const r = scamFallback(text);
    expect(r.score).toBeLessThanOrEqual(33);
    expect(r.verdict).toBe("Likely safe");
    expect(r.advice.length).toBeGreaterThan(0);
  });

  it("clamps the score to the 0-100 range", () => {
    const spammy = "Western Union bitcoin gift card no viewing wire the deposit processing fee send your passport act now guaranteed job";
    const r = scamFallback(spammy);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("Visa Roadmap mockFallback", () => {
  it("returns an ordered study roadmap by default", () => {
    const r = roadmapFallback("Ghana", "Canada", "study");
    expect(r.title).toContain("Ghana");
    expect(r.title).toContain("Canada");
    expect(r.phases.length).toBeGreaterThanOrEqual(5);
    expect(r.totalWeeks).toBeGreaterThan(0);
    for (const p of r.phases) {
      expect(p.title).toBeTruthy();
      expect(Array.isArray(p.documents)).toBe(true);
    }
  });

  it("varies phases by purpose", () => {
    const work = roadmapFallback("India", "Germany", "work");
    const settle = roadmapFallback("India", "Germany", "settle");
    expect(work.phases[0].title).not.toBe(settle.phases[0].title);
    expect(work.title).toContain("Work");
    expect(settle.title).toContain("Settlement");
  });
});

describe("Readiness mockFallback", () => {
  it("averages pillars into the overall score", () => {
    const scores = { documents: 100, finances: 0, housing: 50, job: 50, community: 50 };
    const overall = Math.round((100 + 0 + 50 + 50 + 50) / 5);
    const r = readinessFallback(scores, overall);
    expect(r.overall).toBe(50);
    expect(r.pillars).toHaveLength(5);
  });

  it("recommends actions for the lowest-scoring pillars", () => {
    const scores = { documents: 90, finances: 10, housing: 15, job: 80, community: 85 };
    const r = readinessFallback(scores, 56);
    expect(r.actions).toHaveLength(3);
    const pillars = r.actions.map((a) => a.pillar);
    // finances (10) and housing (15) are the two weakest — both should be addressed
    expect(pillars).toContain("finances");
    expect(pillars).toContain("housing");
  });
});
