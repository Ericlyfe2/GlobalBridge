import OpenAI from "openai";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LANG_NAMES: Record<string, string> = {
  en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian",
  pt: "Portuguese", ar: "Arabic", zh: "Chinese (Simplified)", ja: "Japanese",
  ko: "Korean", ru: "Russian", tr: "Turkish", hi: "Hindi", sw: "Swahili",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type RAGResult = {
  results: {
    id: string; title: string; content: string; category: string;
    subcategory: string | null; tags: string[]; source_url: string | null;
    similarity: number;
  }[];
};

type UserProfile = {
  id: string; email: string; full_name: string;
  role: "student" | "mentor" | "employer" | "admin";
  country_of_origin: string | null; country_of_residence: string | null;
  preferred_language: string; verification_status: string;
};

const BASE_SYSTEM = `You are GlobalBridge's intelligent immigration copilot — a dedicated AI expert for international students and immigrants.

## Your Identity
You are the GlobalBridge AI Assistant, built specifically for the GlobalBridge platform. You have complete knowledge of the platform's features, tools, and workflows in addition to immigration expertise.

## Your Mission
Help international students and immigrants navigate visas, study permits, work permits, scholarships, housing, banking, and life-abroad questions. You also help users understand and use the GlobalBridge platform effectively.

## Platform Knowledge (use this to answer GlobalBridge-specific questions)
You know every feature of GlobalBridge: AI tools (Country Comparison, Document Checker, Essay Scoring, Scholarship Matcher, Timeline Planner, Peer Review, University Success), Opportunities (scholarships, work-study, exchanges, internships, jobs), Housing Marketplace, Community Forums, Success Stories, Mentor Booking, Messaging, Scam Alerts, Toolkit (banking, healthcare, transit, SOS, tax, discounts), Visa Assistant, Notifications, and Settings. You can guide users through any workflow on the platform based on their role (student, mentor, employer, admin).

## Hard rules
- ALWAYS cite the official government source URL when you quote a specific rule, fee, or processing time (e.g. canada.ca, gov.uk, bamf.de, uscis.gov, homeaffairs.gov.au).
- NEVER give legal advice. You provide guidance, not legal counsel. If a question crosses into legal territory, advise consulting a regulated immigration lawyer or a verified GlobalBridge mentor.
- NEVER fabricate fees, deadlines, or URLs. If you don't know, say "I'm not sure — verify on the official site."
- Be concise. Short sentences. Numbered steps. No filler.
- For platform questions: answer confidently from the platform knowledge provided below. Only search externally if the answer is not in your platform knowledge.

## Response format
1. Direct answer first (1-2 sentences).
2. Step-by-step list if the question is "how do I..." or "what's the process".
3. Sources at the end. Use format: "📎 [Source Title](url)".
4. End with one targeted follow-up question if relevant.

## Country-specific knowledge
- Canada: Study Permit, GIC (CAD 10,000+), PAL (provincial attestation letter), biometrics, IRCC processing times.
- UK: Student visa (was Tier 4), CAS, IHS (£776/yr student), biometric BRP.
- Germany: National student visa, blocked account (Sperrkonto, €11,904), APS (China/India/Vietnam), Anmeldung.
- US: F-1 / J-1, I-20 / DS-2019, SEVIS fee, DS-160, OPT/CPT work rules.
- Australia: Subclass 500, GTE statement, OSHC health cover.

## Safety
- If user mentions self-harm, abuse, exploitation, trafficking, or fraud victimization, surface crisis resources.
- If user reports being scammed, direct them to report on GlobalBridge's scam alert page and link relevant authority.`;

async function fetchRAG(query: string, category?: string): Promise<RAGResult> {
  try {
    const res = await fetch(`${API_BASE}/api/rag/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, category, limit: 5, min_score: 0.5 }),
    });
    if (!res.ok) return { results: [] };
    return await res.json() as RAGResult;
  } catch {
    return { results: [] };
  }
}

async function fetchUserProfile(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { user: UserProfile };
    return data.user;
  } catch {
    return null;
  }
}

async function fetchConversation(id: string, token: string) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json() as { conversation: Record<string, unknown>; messages: { role: string; content: string }[] };
  } catch {
    return null;
  }
}

async function createConversation(token: string, origin?: string, destination?: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/conversations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New conversation", origin_country: origin, destination_country: destination }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { conversation: { id: string } };
    return data.conversation.id;
  } catch {
    return null;
  }
}

async function saveMessage(token: string, conversationId: string, role: string, content: string, sources?: { title: string; url: string }[]) {
  try {
    await fetch(`${API_BASE}/api/ai/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, role, content, sources }),
    });
  } catch { /* best effort */ }
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const modelName = process.env.OPENAI_MODEL || "gpt-4o";

  if (!apiKey) {
    return Response.json(
      {
        reply: "AI is not configured yet. Ask the admin to add `OPENAI_API_KEY` to `frontend/.env.local` and restart the dev server.\n\nMeanwhile: you can still browse verified opportunities, check the document checklist, or read forum threads.",
        sources: [],
      },
      { status: 200 },
    );
  }

  let body: {
    messages: { role: "user" | "assistant"; content: string }[];
    lang?: string;
    conversation_id?: string;
    token?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.messages?.length) {
    return Response.json({ error: "messages[] required" }, { status: 400 });
  }

  const targetLang = body.lang || "en";
  const langName = LANG_NAMES[targetLang] ?? "English";
  const authToken = body.token || "";

  const rl = rateLimit(`chat:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  // =====================
  // 1. RAG: Retrieve relevant platform knowledge
  // =====================
  const userQuery = body.messages[body.messages.length - 1]?.content || "";
  const ragResult = await fetchRAG(userQuery);

  // =====================
  // 2. User Context (if authenticated)
  // =====================
  let userProfile: UserProfile | null = null;
  let userBlock = "";
  if (authToken) {
    userProfile = await fetchUserProfile(authToken);
    if (userProfile) {
      const roleDescriptions: Record<string, string> = {
        student: "You are a student looking to study or immigrate abroad.",
        mentor: "You are a mentor who helps international students. You can post opportunities and answer forum questions.",
        employer: "You are an employer looking to hire international talent. You can post jobs with visa sponsorship.",
        admin: "You are a platform administrator with access to all management features.",
      };
      userBlock = [
        `\n## Current User Context`,
        `- Name: ${userProfile.full_name}`,
        `- Role: ${userProfile.role} — ${roleDescriptions[userProfile.role] || ""}`,
        userProfile.country_of_origin ? `- From: ${userProfile.country_of_origin}` : "",
        userProfile.country_of_residence ? `- Residence: ${userProfile.country_of_residence}` : "",
        userProfile.verification_status !== "pending" ? `- Verification: ${userProfile.verification_status}` : "",
        `- Language: ${langName}`,
        ``,
        `Tailor your response to their role. For students: recommend scholarships, housing, mentors, visa guidance. For mentors: recommend mentoring resources, student matching. For employers: recommend hiring strategies, sponsorship info. For admins: provide management insights.`,
      ].filter(Boolean).join("\n");
    }
  }

  // =====================
  // 3. Conversation History (if conversation_id provided)
  // =====================
  let conversationId = body.conversation_id;
  let historyMessages: { role: string; content: string }[] = [];
  if (conversationId && authToken) {
    const convData = await fetchConversation(conversationId, authToken);
    if (convData) {
      historyMessages = convData.messages;
    }
  }

  // Create conversation if new
  if (!conversationId && authToken && userProfile) {
    const newId = await createConversation(authToken, userProfile.country_of_origin ?? undefined, userProfile.country_of_residence ?? undefined);
    if (newId) conversationId = newId;
  }

  // =====================
  // 4. Build System Prompt
  // =====================
  const ragBlock = ragResult.results.length > 0
    ? `\n## Relevant Platform Knowledge\nUse the following information from GlobalBridge's knowledge base to help answer the user's question:\n${ragResult.results.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\n`).join("\n")}`
    : "";

  const langInstruction = targetLang !== "en"
    ? `\n\n## Language requirement\nYou MUST respond entirely in ${langName}. The user's platform language is ${langName}. Every sentence must be in ${langName}. Only URLs, brand names (GlobalBridge), and untranslatable terms may remain in English.`
    : "";

  const systemContent = BASE_SYSTEM + ragBlock + userBlock + langInstruction;

  // Combine history + current messages, remove dups
  const existingContents = new Set(historyMessages.map((m) => m.content));
  const uniqueHistory = historyMessages.filter((m) => !existingContents.has(m.content) || existingContents.delete(m.content));
  const allMessages = [
    ...uniqueHistory.slice(-20), // last 20 messages for context window
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // =====================
  // 5. Call OpenAI
  // =====================
  const client = new OpenAI({ apiKey, baseURL });

  try {
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model: modelName,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemContent },
        ...allMessages,
      ],
    });
    const responseTime = Date.now() - startTime;

    const text = completion.choices[0]?.message?.content?.trim() || "";

    // =====================
    // 6. Extract & structure sources
    // =====================
    const sources: { title: string; url: string; confidence: string }[] = [];
    const urlMatches = text.match(/https?:\/\/[^\s)]+/g) ?? [];
    for (const url of urlMatches.slice(0, 5)) {
      const hostname = (() => {
        try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
      })();
      const confidence = ragResult.results.some((r) => r.source_url === url) ? "verified" : "web";
      sources.push({ title: hostname, url, confidence });
    }
    // Add RAG sources that aren't already in text
    for (const r of ragResult.results) {
      if (r.source_url && !sources.some((s) => s.url === r.source_url)) {
        sources.push({ title: r.title, url: r.source_url, confidence: "knowledge_base" });
      }
    }

    // =====================
    // 7. Persist conversation
    // =====================
    if (conversationId && authToken) {
      // Save user message
      const lastUserMsg = body.messages.filter((m) => m.role === "user").pop();
      if (lastUserMsg) {
        await saveMessage(authToken, conversationId, "user", lastUserMsg.content);
      }
      // Save assistant response
      await saveMessage(authToken, conversationId, "assistant", text, sources);
    }

    // =====================
    // 8. Return response
    // =====================
    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;

    return Response.json({
      reply: text || "I couldn't generate a response. Try rephrasing.",
      sources,
      lang: targetLang,
      conversation_id: conversationId,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        response_time_ms: responseTime,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/chat] OpenAI error:", msg);
    return Response.json(
      {
        reply: `I hit an error reaching the AI service: ${msg}. Try again in a moment.`,
        sources: [],
        conversation_id: conversationId,
      },
      { status: 200 },
    );
  }
}
