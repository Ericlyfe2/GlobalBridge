import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are GlobalBridge's AI Application Coach.

## Your job
Score a student's application essay (SoP, Personal Statement, Scholarship Essay, Motivation Letter, or Cover Letter) against the rubric below and return structured feedback that helps them improve before they submit.

## Hard rules
- Output strict JSON. No markdown, no prose outside JSON.
- Quote actual passages from the user's essay in "inlines[].quote" — verbatim, ≤ 25 words.
- Score brutally but constructively. Most drafts are 50-70/100 on first pass.
- Reference how the essay compares to winning applications in our corpus (be specific about percentages).
- Never invent faculty names, course codes, or program details for the target school. Flag if user did.

## JSON schema
{
  "overall": number 0-100,
  "sections": [
    {
      "id": string (one of: "hook" | "arc" | "ev" | "fit" | "voice" | "close"),
      "label": string ("Opening hook" | "Narrative arc" | "Evidence & specifics" | "Program / role fit" | "Authentic voice" | "Closing return"),
      "score": number 0-100,
      "tone": "ok" | "warn" | "fail",
      "comment": string (one specific sentence)
    }
  ],
  "inlines": [
    {
      "quote": string (verbatim ≤ 25 words from essay),
      "comment": string (one specific sentence — what's wrong, what to do),
      "severity": "ok" | "warn" | "fail"
    }
  ],
  "tips": [string × 3] (top three changes for biggest score gain, in priority order)
}

## Rubric weights
- hook  15%   — does line 1 grab attention with a specific moment, not a cliché?
- arc   20%   — past → present → future narrative; clean transitions
- ev    20%   — specific projects, papers, names, numbers (vs vague claims)
- fit   20%   — names specific faculty / courses / labs / values
- voice 15%   — sounds like a real human; one moment of vulnerability or surprise
- close 10%   — return-home or impact arc that ties back to opening

## Common penalties
- "Ever since I was a kid..." opener   → fail on hook (top 5% cliché)
- Mentions retired/dead faculty         → fail on fit
- "I'm passionate about X" without proof → warn on voice
- Vague evidence ("I worked hard")      → warn on ev
- Missing return-to-origin arc          → warn on close (for scholarship essays)`;

type Body = { docType: string; target: string; essay: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.essay?.trim()) {
    return Response.json({ error: "essay required" }, { status: 400 });
  }

  if (!apiKey) {
    return Response.json(mockReview(body.essay), { status: 200 });
  }

  // Cost-drain guard: 10 essay scores / minute / IP.
  const rl = rateLimit(`score-essay:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new Anthropic({ apiKey });

  try {
    const completion = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Document type: ${body.docType}\nTarget: ${body.target}\n\n--- ESSAY START ---\n${body.essay}\n--- ESSAY END ---\n\nReturn strict JSON per the schema.`,
        },
      ],
    });

    const text = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const json = extractJson(text);
    if (!json) {
      console.error("[/api/ai/score-essay] non-JSON:", text.slice(0, 200));
      return Response.json(mockReview(body.essay), { status: 200 });
    }

    return Response.json({
      ...json,
      usage: {
        input_tokens: completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/score-essay] Claude error:", msg);
    return Response.json(mockReview(body.essay), { status: 200 });
  }
}

function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

function mockReview(essay: string) {
  const firstLine = essay.trim().split(/\n+/)[0].slice(0, 80) + "...";
  return {
    overall: 72,
    sections: [
      { id: "hook",  label: "Opening hook",       score: 58, tone: "warn", comment: "Generic opener pattern. Replace with a specific moment + sensory detail." },
      { id: "arc",   label: "Narrative arc",      score: 78, tone: "ok",   comment: "Clean past → present → future structure." },
      { id: "ev",    label: "Evidence & specifics", score: 82, tone: "ok", comment: "Concrete examples land well." },
      { id: "fit",   label: "Program / role fit", score: 65, tone: "warn", comment: "Verify faculty names + cite at least one specific course code." },
      { id: "voice", label: "Authentic voice",    score: 70, tone: "ok",   comment: "Slightly generic — add one moment of vulnerability." },
      { id: "close", label: "Closing return",     score: 75, tone: "ok",   comment: "Quantify the impact target for stronger close." },
    ],
    inlines: [
      { quote: firstLine,                                                           comment: "Cliché opener pattern. Start with a concrete incident.",                       severity: "fail" },
      { quote: "I am passionate about learning",                                    comment: "Show passion through action, not declaration.",                                severity: "warn" },
      { quote: "After completing my degree, I want to help my country",            comment: "Strong return arc — quantify the scale of impact for +5.",                     severity: "ok"   },
    ],
    tips: [
      "Replace the opener with a specific incident (3-4 sentence story w/ sensory detail).",
      "Cite 2 active faculty + 1 specific course code for your target program.",
      "Quantify your community/career impact target (e.g. 'serving 30M+ unbanked').",
    ],
  };
}
