import OpenAI from "openai";
import { requireAiUser, tooLarge, totalChars } from "@/lib/ai-auth";
import { getAiConfig } from "@/lib/aiConfig";

export const runtime = "nodejs";

const MAX_TRANSLATE_CHARS = 20_000;
const MAX_TRANSLATE_ITEMS = 200;

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

  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const aiConfig = await getAiConfig();
  // Graceful fallback: echo source (so UI still works without a key, or when
  // an admin has turned translation off)
  if (!apiKey || !aiConfig.ai_translation_enabled) {
    return Response.json({ translations: texts, note: "translation-disabled" });
  }

  if (texts.length > MAX_TRANSLATE_ITEMS) {
    return Response.json(
      { error: `Too many strings in one request (max ${MAX_TRANSLATE_ITEMS}).` },
      { status: 400 },
    );
  }
  if (totalChars(texts) > MAX_TRANSLATE_CHARS) {
    return tooLarge(MAX_TRANSLATE_CHARS);
  }
  // Authenticated + per-user rate limited: this call spends OpenAI credits.
  const gate = await requireAiUser(req, { feature: "translate", limit: 60, body });
  if ("response" in gate) return gate.response;

  const langName = LANG_NAMES[target] ?? target;

  try {
    const client = new OpenAI({ apiKey, baseURL });
    // Batch: number each string, ask for a JSON array back to preserve order + count.
    const numbered = texts.map((t, i) => `${i}: ${t}`).join("\n");
    const msg = await client.chat.completions.create({
      model: aiConfig.ai_model,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are a professional UI translator. Translate each numbered line into ${langName}. ` +
                   `Preserve meaning, tone, and any placeholders. Do NOT translate brand names (GlobalBridge), ` +
                   `URLs, or code. Return ONLY a JSON array of strings in the same order, no keys, no commentary.`,
        },
        { role: "user", content: numbered },
      ],
    });

    // Book this call against the caller's daily budget. ai_usage_log is
    // what the admin AI console reads and what the ceiling is computed from.
    await gate.record({
      model: aiConfig.ai_model,
      input_tokens: msg.usage?.prompt_tokens ?? 0,
      output_tokens: msg.usage?.completion_tokens ?? 0,
    });

    const raw = msg.choices[0]?.message?.content?.trim() || "[]";
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
