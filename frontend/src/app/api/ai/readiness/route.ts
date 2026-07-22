import OpenAI from "openai";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const PILLARS = ["documents", "finances", "housing", "job", "community"] as const;
type PillarKey = (typeof PILLARS)[number];

const PILLAR_LABEL: Record<PillarKey, string> = {
  documents: "Documents",
  finances: "Finances",
  housing: "Housing",
  job: "Job / income",
  community: "Community",
};

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

type Action = { title: string; detail: string; pillar: PillarKey };
type PillarOut = { key: PillarKey; label: string; score: number; note: string };
type ReadinessResult = { overall: number; pillars: PillarOut[]; actions: Action[] };

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

  const scores = normalizePillars(body?.pillars);
  const overall = Math.round(PILLARS.reduce((s, k) => s + scores[k], 0) / PILLARS.length);

  if (!apiKey) {
    return Response.json(mockFallback(scores, overall), { status: 200 });
  }

  const rl = rateLimit(`readiness:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ pillars: scores, destination: body.destination ?? null, purpose: body.purpose ?? null }),
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "";
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
        input_tokens: completion.usage?.prompt_tokens ?? 0,
        output_tokens: completion.usage?.completion_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/readiness] OpenAI error:", msg);
    return Response.json(mockFallback(scores, overall), { status: 200 });
  }
}

function normalizePillars(input: Partial<Record<PillarKey, number>> | undefined): Record<PillarKey, number> {
  const out = {} as Record<PillarKey, number>;
  for (const k of PILLARS) {
    const v = Number(input?.[k]);
    out[k] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  }
  return out;
}

function autoNote(score: number): string {
  if (score >= 80) return "On track";
  if (score >= 50) return "Making progress";
  if (score >= 25) return "Needs attention";
  return "Not started";
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
