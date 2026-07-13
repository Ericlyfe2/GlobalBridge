import OpenAI from "openai";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const COUNTRY_NAMES: Record<string, string> = {
  gh: "Ghana", ng: "Nigeria", ke: "Kenya", za: "South Africa",
  rw: "Rwanda", ug: "Uganda", tz: "Tanzania", et: "Ethiopia",
  eg: "Egypt", ma: "Morocco", sn: "Senegal", ci: "Ivory Coast",
  in: "India", pk: "Pakistan", bd: "Bangladesh", lk: "Sri Lanka",
  vn: "Vietnam", ph: "Philippines", id: "Indonesia", my: "Malaysia",
  ca: "Canada", us: "United States", gb: "United Kingdom",
  de: "Germany", fr: "France", nl: "Netherlands", se: "Sweden",
  no: "Norway", dk: "Denmark", fi: "Finland", ie: "Ireland",
  be: "Belgium", ch: "Switzerland", at: "Austria", it: "Italy",
  es: "Spain", pt: "Portugal", au: "Australia", nz: "New Zealand",
  jp: "Japan", kr: "South Korea", cn: "China", sg: "Singapore",
  ae: "UAE", sa: "Saudi Arabia", qa: "Qatar", il: "Israel",
  br: "Brazil", mx: "Mexico", ar: "Argentina", cl: "Chile",
  tr: "Turkey", ru: "Russia", ua: "Ukraine", pl: "Poland",
  cz: "Czech Republic", hu: "Hungary", ro: "Romania", gr: "Greece",
};

type ComparisonCategory = {
  label: string;
  country1: string;
  country2: string;
  icon: string;
};

type ComparisonResult = {
  categories: ComparisonCategory[];
  summary: string;
  verdict: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const modelName = process.env.OPENAI_MODEL || "gpt-4o";
  if (!apiKey) {
    return Response.json(
      { error: "AI comparison is not configured yet. Add OPENAI_API_KEY to .env.local" },
      { status: 503 },
    );
  }

  let body: { country1: string; country2: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { country1, country2, lang = "en" } = body;
  if (!country1 || !country2) {
    return Response.json({ error: "country1 and country2 required (ISO-2 codes)" }, { status: 400 });
  }

  const name1 = COUNTRY_NAMES[country1.toLowerCase()] ?? country1.toUpperCase();
  const name2 = COUNTRY_NAMES[country2.toLowerCase()] ?? country2.toUpperCase();

  const rl = rateLimit(`compare:${clientIp(req)}`, 15, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new OpenAI({ apiKey, baseURL });

  const langInstruction =
    lang !== "en"
      ? `\nAll text fields (summary, verdict, category labels, and each country's text) MUST be in ${COUNTRY_NAMES[lang] ?? lang}. Only ISO codes, numbers, and the JSON structure may remain in English.`
      : "";

  const system = `You are a global immigration and lifestyle data analyst. Given two country ISO codes, produce a structured side-by-side comparison.

Return ONLY valid JSON with this exact shape — no markdown, no commentary:
{
  "categories": [
    {
      "label": "Cost of Living",
      "country1": "Brief 1-2 sentence description for country 1",
      "country2": "Brief 1-2 sentence description for country 2",
      "icon": "dollar"
    },
    {
      "label": "Visa & Immigration",
      "country1": "...",
      "country2": "...",
      "icon": "passport"
    },
    {
      "label": "Job Market",
      "country1": "...",
      "country2": "...",
      "icon": "briefcase"
    },
    {
      "label": "Housing",
      "country1": "...",
      "country2": "...",
      "icon": "home"
    },
    {
      "label": "Education",
      "country1": "...",
      "country2": "...",
      "icon": "graduation"
    },
    {
      "label": "Healthcare",
      "country1": "...",
      "country2": "...",
      "icon": "heart"
    },
    {
      "label": "Culture & Safety",
      "country1": "...",
      "country2": "...",
      "icon": "shield"
    },
    {
      "label": "Banking & Finance",
      "country1": "...",
      "country2": "...",
      "icon": "bank"
    }
  ],
  "summary": "One-paragraph high-level comparison of the two countries.",
  "verdict": "Which country is better for international students/immigrants overall and why (2-3 sentences)."
}

Rules:
- Be factual, specific, and cite approximate figures where possible (e.g. "Rent for a 1BR in city center: $800-1,200/mo").
- Keep each description to 1-2 sentences (max 40 words).
- Focus on the perspective of an international student or immigrant from a developing country.
- If you don't know a specific figure, give a reasonable estimate range based on general knowledge.
- icons must be one of: dollar, passport, briefcase, home, graduation, heart, shield, bank.${langInstruction}`;

  try {
    const msg = await client.chat.completions.create({
      model: modelName,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Compare ${name1} (${country1}) vs ${name2} (${country2}) for an international student/immigrant.` },
      ],
    });

    const raw = msg.choices[0]?.message?.content?.trim() || "";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let result: ComparisonResult;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      return Response.json({
        categories: [],
        summary: `Comparison data for ${name1} vs ${name2} is temporarily unavailable. Please try again.`,
        verdict: "",
      });
    }

    if (!Array.isArray(result.categories) || result.categories.length === 0) {
      return Response.json({
        categories: [],
        summary: `Comparison data for ${name1} vs ${name2} is temporarily unavailable. Please try again.`,
        verdict: "",
      });
    }

    return Response.json({
      ...result,
      country1Name: name1,
      country2Name: name2,
      country1Code: country1.toLowerCase(),
      country2Code: country2.toLowerCase(),
    });
  } catch (err) {
    const msgError = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/compare-countries] OpenAI error:", msgError);
    return Response.json(
      {
        categories: [],
        summary: `Comparison failed: ${msg}. Try again in a moment.`,
        verdict: "",
        country1Name: name1,
        country2Name: name2,
        country1Code: country1.toLowerCase(),
        country2Code: country2.toLowerCase(),
      },
      { status: 200 },
    );
  }
}
