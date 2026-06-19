import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { getCachedTranslation, setCachedTranslation } from "@/lib/translation-cache-server";

export const runtime = "nodejs";

const LANG_NAMES: Record<string, string> = {
  en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian",
  pt: "Portuguese", ar: "Arabic", zh: "Chinese (Simplified)", ja: "Japanese",
  ko: "Korean", ru: "Russian", tr: "Turkish", hi: "Hindi", sw: "Swahili",
};

type Body = {
  texts: string[];
  target: string;
  context?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { texts, target, context } = body;
  if (!Array.isArray(texts) || !target) {
    return Response.json({ error: "texts[] and target required" }, { status: 400 });
  }

  if (target === "en" || texts.length === 0) {
    return Response.json({ translations: texts });
  }

  const cached = await getCachedTranslation(texts, target);
  if (cached) {
    return Response.json({ translations: cached, lang: target, cached: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ translations: texts, note: "translation-disabled" });
  }

  const rl = rateLimit(`translate-dynamic:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const langName = LANG_NAMES[target] ?? target;

  try {
    const client = new Anthropic({ apiKey });
    const numbered = texts.map((t, i) => `${i}: ${t}`).join("\n");
    const contextHint = context ? ` Context: this is ${context}.` : "";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system:
        `You are a professional translator specializing in international education and immigration content. ` +
        `Translate each numbered line into ${langName}. Preserve meaning, tone, formatting, and all placeholders. ` +
        `Do NOT translate brand names (GlobalBridge, Common App, LinkedIn), URLs, or code.` +
        contextHint +
        ` Return ONLY a JSON array of strings in the same order, no keys, no commentary.`,
      messages: [{ role: "user", content: numbered }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let translations: string[];
    try {
      translations = JSON.parse(jsonStr);
    } catch {
      translations = texts;
    }
    if (!Array.isArray(translations) || translations.length !== texts.length) {
      translations = texts;
    }

    await setCachedTranslation(texts, target, translations);
    return Response.json({ translations, lang: target });
  } catch (e) {
    return Response.json(
      { translations: texts, error: e instanceof Error ? e.message : "translate failed" },
      { status: 200 },
    );
  }
}
