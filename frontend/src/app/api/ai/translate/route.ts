import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LANG_NAMES: Record<string, string> = {
  en: "English", fr: "French", es: "Spanish", ar: "Arabic", zh: "Chinese (Simplified)",
  hi: "Hindi", sw: "Swahili", pt: "Portuguese", de: "German", tw: "Twi", yo: "Yoruba",
};

type Body = { texts: string[]; target: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { texts, target } = body;
  if (!Array.isArray(texts) || !target) {
    return Response.json({ error: "texts[] and target required" }, { status: 400 });
  }

  // English target or no text → no-op
  if (target === "en" || texts.length === 0) {
    return Response.json({ translations: texts });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Graceful fallback: echo source (so UI still works without a key)
  if (!apiKey) {
    return Response.json({ translations: texts, note: "translation-disabled" });
  }

  // Cost-drain guard. Public (used for UI translation on logged-out pages) and
  // batched, so allow more than the per-user tools: 60 calls / minute / IP.
  const rl = rateLimit(`translate:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const langName = LANG_NAMES[target] ?? target;

  try {
    const client = new Anthropic({ apiKey });
    // Batch: number each string, ask for a JSON array back to preserve order + count.
    const numbered = texts.map((t, i) => `${i}: ${t}`).join("\n");
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system:
        `You are a professional UI translator. Translate each numbered line into ${langName}. ` +
        `Preserve meaning, tone, and any placeholders. Do NOT translate brand names (GlobalBridge), ` +
        `URLs, or code. Return ONLY a JSON array of strings in the same order, no keys, no commentary.`,
      messages: [{ role: "user", content: numbered }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
    // Strip markdown fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let translations: string[];
    try {
      translations = JSON.parse(jsonStr);
    } catch {
      // Fallback: split lines
      translations = texts;
    }
    if (!Array.isArray(translations) || translations.length !== texts.length) {
      translations = texts;
    }
    return Response.json({ translations });
  } catch (e) {
    return Response.json(
      { translations: texts, error: e instanceof Error ? e.message : "translate failed" },
      { status: 200 },
    );
  }
}
