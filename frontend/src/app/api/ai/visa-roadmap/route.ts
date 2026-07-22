import OpenAI from "openai";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

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

type Phase = { id: string; title: string; timeframe: string; cost: string; documents: string[]; tip: string };
type Roadmap = { title: string; totalWeeks: number; phases: Phase[] };

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
  const origin = (body?.origin ?? "").trim();
  const destination = (body?.destination ?? "").trim();
  const purpose = (body?.purpose ?? "study").trim();
  if (!origin || !destination) {
    return Response.json({ error: "origin and destination required" }, { status: 400 });
  }

  if (!apiKey) {
    return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
  }

  const rl = rateLimit(`visa-roadmap:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      max_tokens: 1600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Build a ${purpose} roadmap from ${origin} to ${destination}. Return strict JSON per the schema.`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const json = extractJson(raw) as Roadmap | null;
    if (!json || !Array.isArray(json.phases) || json.phases.length === 0) {
      console.error("[/api/ai/visa-roadmap] non-JSON response:", raw.slice(0, 200));
      return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
    }
    return Response.json({
      ...json,
      usage: {
        input_tokens: completion.usage?.prompt_tokens ?? 0,
        output_tokens: completion.usage?.completion_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/visa-roadmap] OpenAI error:", msg);
    return Response.json(mockFallback(origin, destination, purpose), { status: 200 });
  }
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

export function mockFallback(origin: string, destination: string, purpose: string): Roadmap {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const purposeLabel = purpose === "work" ? "Work" : purpose === "settle" ? "Settlement" : "Study";
  const phases: Phase[] = purpose === "work"
    ? [
        { id: "offer",   title: "Secure a job offer & sponsorship", timeframe: "Weeks 1–6",  cost: "Varies",     documents: ["CV / resume", "Reference letters", "Job offer letter"], tip: "Target employers with a proven visa-sponsorship track record." },
        { id: "eligib",  title: "Confirm visa eligibility",         timeframe: "Weeks 6–8",  cost: "$0",         documents: ["Passport", "Qualification certificates"], tip: "Check the destination's skilled-worker occupation list first." },
        { id: "docs",    title: "Gather & certify documents",       timeframe: "Weeks 8–11", cost: "$100–$400",  documents: ["Proof of funds", "Police clearance", "Medical exam"], tip: "Start police-clearance requests early — they can take weeks." },
        { id: "apply",   title: "Submit work-visa application",     timeframe: "Weeks 11–13", cost: "$200–$1,500", documents: ["Sponsorship certificate", "Biometrics"], tip: "Save a copy of every submitted document as PDF." },
        { id: "decision",title: "Decision & biometrics",            timeframe: "Weeks 13–18", cost: "$85",        documents: ["Appointment confirmation"], tip: "Book your biometrics appointment the moment it's offered." },
        { id: "arrive",  title: "Travel & settle in",               timeframe: "Weeks 18–20", cost: "$500–$2,000", documents: ["Visa vignette", "Accommodation proof"], tip: "Use GlobalBridge's Toolkit to set up banking and a SIM on arrival." },
      ]
    : purpose === "settle"
      ? [
          { id: "assess",  title: "Assess residency pathway",       timeframe: "Weeks 1–4",   cost: "$0",        documents: ["Passport", "Current visa"], tip: "Points-based routes reward language scores and work history." },
          { id: "lang",    title: "Language & qualification proof",  timeframe: "Weeks 4–10",  cost: "$200–$350", documents: ["Language test result", "Credential assessment"], tip: "Book the language test early; slots fill up fast." },
          { id: "express", title: "Enter the immigration pool",      timeframe: "Weeks 10–12", cost: "$0",        documents: ["Profile submission"], tip: "Keep your profile updated — scores change with each draw." },
          { id: "invite",  title: "Receive invitation & apply",      timeframe: "Weeks 12–24", cost: "$800–$1,500", documents: ["Proof of funds", "Police clearance", "Medical exam"], tip: "Respond within the deadline; invitations expire." },
          { id: "land",    title: "Confirm residency & land",        timeframe: "Weeks 24–30", cost: "$500+",     documents: ["Confirmation of residency", "Landing forms"], tip: "Register for healthcare and a tax number in your first week." },
        ]
      : [
          { id: "choose",  title: "Choose program & get admission", timeframe: "Weeks 1–8",   cost: "$50–$150/app", documents: ["Transcripts", "Statement of purpose", "Reference letters"], tip: "Apply to a safety, a match, and a reach school." },
          { id: "offer",   title: "Accept offer & pay deposit",     timeframe: "Weeks 8–10",  cost: "$200–$2,000",  documents: ["Acceptance letter", "Tuition deposit receipt"], tip: "Keep the official acceptance letter — the visa needs it." },
          { id: "funds",   title: "Prove funds & finances",         timeframe: "Weeks 10–12", cost: "$0",           documents: ["Bank statements", "Scholarship / sponsor letter"], tip: "Funds usually must sit in the account for a minimum period." },
          { id: "apply",   title: "Submit study-visa application",  timeframe: "Weeks 12–14", cost: "$150–$500",    documents: ["Passport", "Acceptance letter", "Proof of funds", "Photos"], tip: "Double-check photo specs — wrong sizing is a top rejection reason." },
          { id: "bio",     title: "Biometrics & interview",         timeframe: "Weeks 14–18", cost: "$85",          documents: ["Appointment letter", "Application summary"], tip: "Rehearse your study plan; interviews test genuine intent." },
          { id: "travel",  title: "Travel & arrival setup",         timeframe: "Weeks 18–20", cost: "$500–$2,000",  documents: ["Visa", "Accommodation proof", "Enrolment confirmation"], tip: "Sort housing before you fly, and verify listings with Scam Shield." },
        ];

  return {
    title: `${purposeLabel} visa roadmap: ${cap(origin)} → ${cap(destination)}`,
    totalWeeks: purpose === "settle" ? 30 : 20,
    phases,
  };
}
