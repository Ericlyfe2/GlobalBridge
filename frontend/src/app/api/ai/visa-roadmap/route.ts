import { chatComplete, isAiConfigured } from "@/lib/ai-client";
import { requireAiUser, tooLarge, totalChars } from "@/lib/ai-auth";
import { extractJson, mockFallback, type Roadmap } from "./logic";
import { getAiConfig } from "@/lib/aiConfig";

export const runtime = "nodejs";

const MAX_FIELD_CHARS = 400;

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
  const aiConfig = await getAiConfig();

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

  if (!isAiConfigured()) {
    return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
  }

  if (totalChars(origin, destination, purpose) > MAX_FIELD_CHARS) {
    return tooLarge(MAX_FIELD_CHARS);
  }
  // Authenticated + per-user rate limited: this call spends OpenAI credits.
  const gate = await requireAiUser(req, { feature: "visa-roadmap", limit: 8, body });
  if ("response" in gate) return gate.response;

  try {
    const completion = await chatComplete({
      model: aiConfig.ai_model,
      maxTokens: 2400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Build a ${purpose} roadmap from ${origin} to ${destination}. Return strict JSON per the schema.`,
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
    const json = extractJson(raw) as Roadmap | null;
    if (!json || !Array.isArray(json.phases) || json.phases.length === 0) {
      console.error("[/api/ai/visa-roadmap] non-JSON response:", raw.slice(0, 200));
      return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
    }
    return Response.json({
      ...json,
      usage: {
        input_tokens: completion.inputTokens,
        output_tokens: completion.outputTokens,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/visa-roadmap] AI provider error:", msg);
    return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
  }
}
