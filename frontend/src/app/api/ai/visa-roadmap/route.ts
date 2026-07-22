import OpenAI from "openai";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { extractJson, mockFallback, type Roadmap } from "./logic";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are GlobalBridge's Visa Roadmap planner.

## Your job
Given an origin country, a destination country, and a purpose (study, work, or settle),
produce a realistic, ordered roadmap of the phases a person goes through — from deciding to
move all the way to arrival and settling in.

## Rules
- Be practical and specific to the destination where possible (visa names, common steps).
- Order phases chronologically. 5-8 phases is ideal.
- Costs are rough estimates in USD as a short string (e.g. "$150–$500"). Use "Varies" if unknown.
- Documents are short noun phrases (e.g. "Valid passport", "Proof of funds").
- Output STRICT JSON only. No prose, no markdown fences.

## JSON schema
{
  "title": string (e.g. "Study visa roadmap: Ghana → Canada"),
  "totalWeeks": number (rough end-to-end estimate),
  "phases": [
    {
      "id": string (short slug),
      "title": string,
      "timeframe": string (e.g. "Weeks 1–3"),
      "cost": string,
      "documents": [ string ],
      "tip": string (one practical sentence)
    }
  ]
}`;

type Body = { origin?: string; destination?: string; purpose?: string };

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
  const origin = (body?.origin ?? "").trim();
  const destination = (body?.destination ?? "").trim();
  const purpose = (body?.purpose ?? "study").trim();
  if (!origin || !destination) {
    return Response.json({ error: "origin and destination required" }, { status: 400 });
  }

  if (!apiKey) {
    return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
  }

  const rl = rateLimit(`visa-roadmap:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      max_tokens: 1600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Build a ${purpose} roadmap from ${origin} to ${destination}. Return strict JSON per the schema.`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const json = extractJson(raw) as Roadmap | null;
    if (!json || !Array.isArray(json.phases) || json.phases.length === 0) {
      console.error("[/api/ai/visa-roadmap] non-JSON response:", raw.slice(0, 200));
      return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
    }
    return Response.json({
      ...json,
      usage: {
        input_tokens: completion.usage?.prompt_tokens ?? 0,
        output_tokens: completion.usage?.completion_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/visa-roadmap] OpenAI error:", msg);
    return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
  }
}
