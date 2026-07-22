import OpenAI from "openai";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are GlobalBridge's Scam Shield — an AI that protects international students and immigrants from fraud.

## Your job
Analyze a piece of text the user pasted (a rental/housing listing, a job offer, a scholarship message, or a direct message) and decide how likely it is to be a scam that targets newcomers.

## What newcomers get scammed by (weight these heavily)
- Requests to wire money, pay a deposit, or send gift cards BEFORE viewing a property or signing anything
- "No viewing needed" / landlord conveniently abroad / keys mailed after payment
- Upfront "processing", "visa", "training", or "background-check" fees for a job or scholarship
- Job offers with unrealistic pay for little work, or that ask for bank/passport details early
- Pressure and urgency ("act today", "many people interested", "offer expires")
- Off-platform payment (Western Union, MoneyGram, crypto, direct bank transfer to a personal account)
- Poor grammar mixed with official-sounding claims; mismatched or free email domains
- Requests for copies of passport, visa, or bank login "to confirm eligibility"

## Hard rules
- Judge ONLY the text provided. Do not invent facts not present.
- Be protective but fair: a normal, legitimate listing should score LOW risk.
- "phrase" values MUST be verbatim substrings copied from the user's text so they can be highlighted.
- Output STRICT JSON only. No prose, no markdown fences.

## JSON schema
{
  "score": number 0-100 (0 = clearly safe, 100 = clearly a scam),
  "verdict": "Likely safe" | "Be cautious" | "High scam risk",
  "summary": string (one sentence explaining the score to a newcomer),
  "flags": [
    {
      "phrase": string (verbatim substring from the input that triggered the flag),
      "category": string (short label, e.g. "Upfront payment", "No viewing", "Urgency", "Off-platform payment", "Sensitive data request"),
      "why": string (one sentence: why this is a warning sign),
      "severity": "low" | "med" | "high"
    }
  ],
  "advice": [ string ] (2-4 concrete, calm next steps for the user)
}

Score bands: 0-33 => "Likely safe", 34-66 => "Be cautious", 67-100 => "High scam risk".
Always return at least one advice item. If safe, flags may be an empty array.`;

type Body = { text?: string; kind?: string };

type Flag = { phrase: string; category: string; why: string; severity: "low" | "med" | "high" };
type ScamResult = {
  score: number;
  verdict: "Likely safe" | "Be cautious" | "High scam risk";
  summary: string;
  flags: Flag[];
  advice: string[];
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const modelName = process.env.OPENAI_MODEL || "gpt-4o";

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (body?.text ?? "").trim();
  if (!text) {
    return Response.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > 6000) {
    return Response.json({ error: "Text too long (max 6000 chars)" }, { status: 400 });
  }

  if (!apiKey) {
    return Response.json(mockFallback(text), { status: 200 });
  }

  // Cost-drain guard: 10 scam checks / minute / IP.
  const rl = rateLimit(`scam-check:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this ${body.kind ?? "message"} for scam risk. Return strict JSON per the schema.\n\n"""\n${text}\n"""`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const json = extractJson(raw) as ScamResult | null;
    if (!json || typeof json.score !== "number") {
      console.error("[/api/ai/scam-check] non-JSON response:", raw.slice(0, 200));
      return Response.json(mockFallback(text), { status: 200 });
    }

    return Response.json({
      ...normalize(json),
      usage: {
        input_tokens: completion.usage?.prompt_tokens ?? 0,
        output_tokens: completion.usage?.completion_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/scam-check] OpenAI error:", msg);
    return Response.json(mockFallback(text), { status: 200 });
  }
}

/** Keep verdict consistent with score even if the model drifts. */
function normalize(r: ScamResult): ScamResult {
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

function defaultAdvice(score: number): string[] {
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

function extractJson(text: string): unknown | null {
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
  const lc = text.toLowerCase();
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
