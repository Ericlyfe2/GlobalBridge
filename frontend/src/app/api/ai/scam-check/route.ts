import OpenAI from "openai";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { extractJson, normalize, mockFallback, type ScamResult } from "./logic";

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
