import { chatComplete, isAiConfigured } from "@/lib/ai-client";
import { requireAiUser, tooLarge, totalChars } from "@/lib/ai-auth";
import { extractJson, normalize, mockFallback, type ScamResult } from "./logic";
import { getAiConfig } from "@/lib/aiConfig";

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

export async function POST(req: Request) {
  const aiConfig = await getAiConfig();

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

  if (!aiConfig.ai_scam_detection_enabled) {
    // A safety tool going silent must never look like "safe" — default to
    // the cautious middle band rather than a fake specific analysis.
    return Response.json(
      {
        score: 50, verdict: "Be cautious" as const,
        summary: "Scam Shield has been turned off by an admin — we can't analyze this right now.",
        flags: [], advice: ["Use your own judgement and the safety tips on the Scam Alerts page."],
        engine: "disabled" as const,
        disabled: true,
      },
      { status: 200 },
    );
  }

  if (!isAiConfigured()) {
    return Response.json({ ...mockFallback(text), engine: "heuristic" as const }, { status: 200 });
  }

  // Authenticated + per-user rate limited: this call spends OpenAI credits.
  const gate = await requireAiUser(req, { feature: "scam-check", limit: 10, body });
  if ("response" in gate) return gate.response;

  try {
    const completion = await chatComplete({
      model: aiConfig.ai_model,
      maxTokens: 2200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this ${body.kind ?? "message"} for scam risk. Return strict JSON per the schema.\n\n"""\n${text}\n"""`,
        },
      ],
    });

    // Book this call against the caller's daily budget. ai_usage_log is
    // what the admin AI console reads and what the ceiling is computed from.
    await gate.record({
      model: aiConfig.ai_model,
      input_tokens: completion.inputTokens,
      output_tokens: completion.outputTokens,
    });

    const raw = completion.text;
    const json = extractJson(raw) as ScamResult | null;
    if (!json || typeof json.score !== "number") {
      console.error("[/api/ai/scam-check] non-JSON response:", raw.slice(0, 200));
      return Response.json({ ...mockFallback(text), engine: "heuristic" as const }, { status: 200 });
    }

    return Response.json({
      ...normalize(json),
      engine: "ai" as const,
      usage: {
        input_tokens: completion.inputTokens,
        output_tokens: completion.outputTokens,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/scam-check] AI provider error:", msg);
    return Response.json({ ...mockFallback(text), engine: "heuristic" as const }, { status: 200 });
  }
}
