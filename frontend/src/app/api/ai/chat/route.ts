import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are GlobalBridge's immigration assistant.

## Your job
Help international students and immigrants navigate visas, study permits, work permits, scholarships, housing, banking, and life-abroad questions for any origin → destination country pair.

## Hard rules
- ALWAYS cite the official government source URL when you quote a specific rule, fee, or processing time (e.g. canada.ca, gov.uk, bamf.de, uscis.gov, homeaffairs.gov.au).
- NEVER give legal advice. You provide guidance, not legal counsel. If a question crosses into legal territory (refugee claims, criminal record waivers, complex appeals), advise the user to consult a regulated immigration lawyer or escalate to a verified human mentor on GlobalBridge.
- NEVER fabricate fees, deadlines, or URLs. If you don't know, say "I'm not sure — verify on the official site" and give the homepage URL.
- Be concise. Short sentences. Numbered steps. No filler.

## Response format
1. Direct answer to the question first (1-2 sentences).
2. Step-by-step list if the question is "how do I..." or "what's the process".
3. Sources at the end: "Source: <official url>". Multiple sources OK.
4. End with one targeted follow-up question if relevant.

## Country-specific knowledge to keep accurate
- Canada: Study Permit, GIC (CAD 10,000+), PAL (provincial attestation letter, Jan 2024+), biometrics, IRCC processing times.
- UK: Student visa (was Tier 4), CAS, IHS (£776/yr student), biometric BRP.
- Germany: National student visa, blocked account (Sperrkonto, currently €11,904), APS (China/India/Vietnam), Anmeldung.
- US: F-1 / J-1, I-20 / DS-2019, SEVIS fee, DS-160, OPT/CPT work rules.
- Australia: Subclass 500, GTE statement, OSHC health cover.

## Safety
- If user mentions self-harm, abuse, exploitation, trafficking, or fraud victimization, surface relevant crisis resources before continuing.
- If user reports being scammed, tell them to file a report on GlobalBridge's scam alert page and link relevant authority (FTC, EFCC, Action Fraud).`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        reply:
          "AI is not configured yet. Ask the admin to add `ANTHROPIC_API_KEY` to `frontend/.env.local` and restart the dev server.\n\nMeanwhile: you can still browse verified opportunities, check the document checklist, or read forum threads.",
        sources: [],
      },
      { status: 200 },
    );
  }

  let body: { messages: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.messages?.length) {
    return Response.json({ error: "messages[] required" }, { status: 400 });
  }

  // Clean conversation history. Strip the assistant's seed greeting if it's the first message.
  const cleaned = body.messages
    .filter((m, i) => !(i === 0 && m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content }));

  if (cleaned.length === 0 || cleaned[0].role !== "user") {
    return Response.json({ error: "First message must be from user" }, { status: 400 });
  }

  // Cost-drain guard: 20 chat calls / minute / IP.
  const rl = rateLimit(`chat:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new Anthropic({ apiKey });

  try {
    const completion = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: cleaned,
    });

    const text = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Extract any source URLs the model embedded
    const sources: { title: string; url: string }[] = [];
    const urlMatches = text.match(/https?:\/\/[^\s)]+/g) ?? [];
    for (const url of urlMatches.slice(0, 5)) {
      const hostname = (() => {
        try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
      })();
      sources.push({ title: hostname, url });
    }

    return Response.json({
      reply: text || "I couldn't generate a response. Try rephrasing.",
      sources,
      usage: {
        input_tokens: completion.usage.input_tokens,
        output_tokens: completion.usage.output_tokens,
        cache_read: completion.usage.cache_read_input_tokens ?? 0,
        cache_created: completion.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/chat] Claude error:", msg);
    return Response.json(
      {
        reply: `I hit an error reaching the AI service: ${msg}. Try again in a moment.`,
        sources: [],
      },
      { status: 200 },
    );
  }
}
