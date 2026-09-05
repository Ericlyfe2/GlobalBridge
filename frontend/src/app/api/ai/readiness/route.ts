import { chatComplete, isAiConfigured } from "@/lib/ai-client";
import { requireAiUser, tooLarge, totalChars } from "@/lib/ai-auth";
import { getAiConfig } from "@/lib/aiConfig";
import {
  PILLARS, PILLAR_LABEL, normalizePillars, autoNote, extractJson, mockFallback,
  type PillarKey, type Action, type PillarOut,
} from "./logic";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are GlobalBridge's Readiness Coach.

## Your job
A user self-reports how ready they feel (0-100) across five pillars: documents, finances,
housing, job, community — plus optional destination and purpose. Write 3 concrete,
prioritized next actions that would raise their overall readiness the most.

## Rules
- Focus the actions on the LOWEST-scoring pillars first.
- Each action is specific and doable within the platform's world (visa docs, proof of funds,
  verified housing, sponsorship jobs, mentor community).
- Output STRICT JSON only. No prose, no markdown fences.

## JSON schema
{
  "actions": [
    { "title": string (short imperative), "detail": string (one sentence why/how), "pillar": one of "documents"|"finances"|"housing"|"job"|"community" }
  ],
  "notes": { "documents": string, "finances": string, "housing": string, "job": string, "community": string }
}
Return exactly 3 actions. Each note is a short (<= 12 word) status phrase for that pillar.`;

type Body = {
  pillars?: Partial<Record<PillarKey, number>>;
  destination?: string;
  purpose?: string;
};

export async function POST(req: Request) {
  const aiConfig = await getAiConfig();

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scores = normalizePillars(body?.pillars);
  const overall = Math.round(PILLARS.reduce((s, k) => s + scores[k], 0) / PILLARS.length);

  if (!isAiConfigured()) {
    return Response.json(mockFallback(scores, overall), { status: 200 });
  }

  // Authenticated + per-user rate limited: this call spends OpenAI credits.
  const gate = await requireAiUser(req, { feature: "readiness", limit: 8, body });
  if ("response" in gate) return gate.response;

  try {
    const completion = await chatComplete({
      model: aiConfig.ai_model,
      maxTokens: 1300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ pillars: scores, destination: body.destination ?? null, purpose: body.purpose ?? null }),
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
    const json = extractJson(raw) as { actions?: Action[]; notes?: Record<string, string> } | null;
    if (!json || !Array.isArray(json.actions)) {
      console.error("[/api/ai/readiness] non-JSON response:", raw.slice(0, 200));
      return Response.json(mockFallback(scores, overall), { status: 200 });
    }
    const pillars: PillarOut[] = PILLARS.map((k) => ({
      key: k,
      label: PILLAR_LABEL[k],
      score: scores[k],
      note: json.notes?.[k] ?? autoNote(scores[k]),
    }));
    return Response.json({
      overall,
      pillars,
      actions: json.actions.slice(0, 3),
      usage: {
        input_tokens: completion.inputTokens,
        output_tokens: completion.outputTokens,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/readiness] AI provider error:", msg);
    return Response.json(mockFallback(scores, overall), { status: 200 });
  }
}
