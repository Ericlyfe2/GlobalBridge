// Pure helpers for the Readiness route. Kept out of `route.ts` because
// Next.js App Router only allows HTTP-method exports from a route module.

export const PILLARS = ["documents", "finances", "housing", "job", "community"] as const;
export type PillarKey = (typeof PILLARS)[number];

export const PILLAR_LABEL: Record<PillarKey, string> = {
  documents: "Documents",
  finances: "Finances",
  housing: "Housing",
  job: "Job / income",
  community: "Community",
};

export type Action = { title: string; detail: string; pillar: PillarKey };
export type PillarOut = { key: PillarKey; label: string; score: number; note: string };
export type ReadinessResult = { overall: number; pillars: PillarOut[]; actions: Action[] };

export function normalizePillars(input: Partial<Record<PillarKey, number>> | undefined): Record<PillarKey, number> {
  const out = {} as Record<PillarKey, number>;
  for (const k of PILLARS) {
    const v = Number(input?.[k]);
    out[k] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  }
  return out;
}

export function autoNote(score: number): string {
  if (score >= 80) return "On track";
  if (score >= 50) return "Making progress";
  if (score >= 25) return "Needs attention";
  return "Not started";
}

export function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

const ACTION_LIBRARY: Record<PillarKey, Action> = {
  documents: { title: "Run your documents through the AI Document Checker", detail: "Catch rejection triggers (expiry, name mismatch, missing seals) before you submit.", pillar: "documents" },
  finances:  { title: "Build a proof-of-funds statement", detail: "Most visas want funds seasoned for a set period — start the paper trail now.", pillar: "finances" },
  housing:   { title: "Shortlist 3 verified housing listings", detail: "Use verified listings and vet each one with Scam Shield before paying anything.", pillar: "housing" },
  job:       { title: "Check the Visa Sponsorship Tracker", detail: "Target employers that already sponsor visas to shorten your job hunt.", pillar: "job" },
  community: { title: "Connect with a mentor in your destination", detail: "A mentor who made the move de-risks every decision that follows.", pillar: "community" },
};

export function mockFallback(scores: Record<PillarKey, number>, overall: number): ReadinessResult {
  const pillars: PillarOut[] = PILLARS.map((k) => ({
    key: k, label: PILLAR_LABEL[k], score: scores[k], note: autoNote(scores[k]),
  }));
  // Lowest three pillars drive the recommended actions.
  const actions = [...PILLARS]
    .sort((a, b) => scores[a] - scores[b])
    .slice(0, 3)
    .map((k) => ACTION_LIBRARY[k]);
  return { overall, pillars, actions };
}
