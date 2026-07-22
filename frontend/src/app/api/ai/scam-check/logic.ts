// Pure helpers for the Scam Shield route. Kept out of `route.ts` because
// Next.js App Router only allows HTTP-method exports from a route module.

export type Flag = { phrase: string; category: string; why: string; severity: "low" | "med" | "high" };
export type ScamResult = {
  score: number;
  verdict: "Likely safe" | "Be cautious" | "High scam risk";
  summary: string;
  flags: Flag[];
  advice: string[];
};

/** Keep verdict consistent with score even if the model drifts. */
export function normalize(r: ScamResult): ScamResult {
  const score = Math.max(0, Math.min(100, Math.round(r.score)));
  const verdict = score <= 33 ? "Likely safe" : score <= 66 ? "Be cautious" : "High scam risk";
  return {
    score,
    verdict,
    summary: r.summary ?? "",
    flags: Array.isArray(r.flags) ? r.flags.slice(0, 12) : [],
    advice: Array.isArray(r.advice) && r.advice.length ? r.advice.slice(0, 4) : defaultAdvice(score),
  };
}

export function defaultAdvice(score: number): string[] {
  if (score > 66)
    return [
      "Do not send any money or personal documents.",
      "Insist on an in-person or video viewing before paying anything.",
      "Report this listing so we can warn other students.",
    ];
  if (score > 33)
    return [
      "Verify the person's identity and the address independently.",
      "Never pay a deposit before seeing a signed agreement.",
    ];
  return ["Looks reasonable, but still verify the address and use traceable payment methods."];
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

/**
 * Heuristic fallback used when there is no OPENAI_API_KEY or the API fails.
 * Scans for well-known scam signals so the demo is meaningful even offline.
 */
export function mockFallback(text: string): ScamResult {
  const flags: Flag[] = [];

  const signals: { re: RegExp; category: string; why: string; severity: Flag["severity"] }[] = [
    { re: /western union|moneygram|gift card|bitcoin|crypto|wire (the )?(money|deposit|funds)/i, category: "Off-platform payment", why: "Untraceable payment methods are the #1 sign of a rental or job scam.", severity: "high" },
    { re: /(no|without) (viewing|inspection|visit)|can'?t (show|view)|keys? will be (mailed|sent|couriered)/i, category: "No viewing", why: "Legitimate landlords let you view a property before you pay.", severity: "high" },
    { re: /(deposit|first month|payment).{0,30}(before|prior|to secure|to reserve|upfront)/i, category: "Upfront payment", why: "Being pushed to pay before signing anything is a classic scam pattern.", severity: "high" },
    { re: /processing fee|application fee|visa fee|training fee|background[- ]check fee|registration fee/i, category: "Upfront fee", why: "Real employers and scholarships do not charge you fees to apply.", severity: "high" },
    { re: /(act|reply|pay|respond) (now|today|immediately|fast)|offer expires|many (people|others) (are )?interested|limited (time|slots)/i, category: "Urgency", why: "Pressure to act fast stops you from checking the offer properly.", severity: "med" },
    { re: /(send|share|provide|confirm).{0,30}(passport|visa|bank (details|login)|ssn|social security|card number)/i, category: "Sensitive data request", why: "You should never share passport, visa, or bank credentials to 'confirm eligibility'.", severity: "high" },
    { re: /i(?:'m| am) (currently )?(abroad|overseas|out of the country|on a mission|missionary)/i, category: "Absent landlord", why: "\"I'm abroad so I can't show it\" is a very common fake-landlord script.", severity: "med" },
    { re: /guaranteed (job|income|visa|approval)|earn \$?\d{3,}\s*(\/|per )?(day|week)/i, category: "Too good to be true", why: "Guaranteed money or approvals with little effort are almost always fake.", severity: "med" },
  ];

  for (const s of signals) {
    const m = text.match(s.re);
    if (m) {
      flags.push({ phrase: m[0], category: s.category, why: s.why, severity: s.severity });
    }
  }

  // Score from weighted flags.
  const weight = { low: 8, med: 18, high: 30 } as const;
  let score = flags.reduce((sum, f) => sum + weight[f.severity], 0);
  score = Math.max(0, Math.min(100, score));
  // Small nudge up if multiple high-severity flags stack.
  const highs = flags.filter((f) => f.severity === "high").length;
  if (highs >= 2) score = Math.min(100, score + 10);

  const verdict = score <= 33 ? "Likely safe" : score <= 66 ? "Be cautious" : "High scam risk";
  const summary =
    score > 66
      ? "Multiple strong scam signals detected — treat this as fraudulent until proven otherwise."
      : score > 33
        ? "Some warning signs are present. Verify everything before paying or sharing documents."
        : flags.length
          ? "Mostly fine, but one minor signal is worth double-checking."
          : "No common scam patterns detected. Still verify the address and use traceable payments.";

  return { score, verdict, summary, flags, advice: defaultAdvice(score) };
}
