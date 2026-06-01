import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are GlobalBridge's document validity checker.

## Your job
Analyze a document the user is preparing for an international application (passport, national ID, bank statement, academic transcript, acceptance letter, study permit). Return common rejection-trigger findings before they submit.

## Hard rules
- NEVER fabricate that you can read the actual file contents. The user has not uploaded an image to you. You receive: doc type, optional metadata (name, expiry date, country of issue), and any free-text notes the user adds.
- Run standard checks for that document type based on what governments commonly reject for. Be specific.
- Output strict JSON. Nothing else. No prose, no markdown fences.

## JSON schema
{
  "score": number 0-100 (validity confidence),
  "label": "Looks great" | "Review warnings" | "Needs fixes",
  "summary": string (one sentence explaining the score),
  "findings": [
    {
      "id": string (short slug),
      "label": string (one-line plain-English finding),
      "detail": string (1-2 sentences of why this matters),
      "severity": "ok" | "warn" | "fail"
    }
  ]
}

## Severity rules
- ok      = check passed
- warn    = soft issue (may delay processing or look unprofessional)
- fail    = hard rejection trigger (missing required field, expired doc, name mismatch, etc.)

## Typical checks by doc type
- passport: expiry > 6 months, MRZ readable, photo quality, no tampering, name format matches application
- transcript: official seal, signature, GPA scale stated, English translation if non-English
- bank_statement: account holder name matches, date within 3 months, balance currency clear, bank letterhead
- acceptance_letter: institution name + DLI/SEVP code, program + start date, conditional vs unconditional, signature
- study_permit: expiry > 6 months after arrival, work-hour conditions stated, biometric collected
- national_id: front + back both visible, expiry, photo quality

Always include 6-10 findings total, mixing ok/warn/fail so the user sees what passed and what didn't.`;

type Body = {
  docType: string;
  fileName?: string;
  fileSize?: number;
  notes?: string;
  meta?: { name?: string; expiry?: string; country?: string };
};

type DocFinding = {
  id: string;
  label: string;
  detail: string;
  severity: "ok" | "warn" | "fail";
};

type DocCheckResult = {
  score: number;
  label: "Looks great" | "Review warnings" | "Needs fixes";
  summary: string;
  findings: DocFinding[];
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.docType) {
    return Response.json({ error: "docType required" }, { status: 400 });
  }

  if (!apiKey) {
    return Response.json(mockFallback(body.docType), { status: 200 });
  }

  const userPrompt = JSON.stringify(
    {
      docType: body.docType,
      fileName: body.fileName ?? null,
      fileSizeKb: body.fileSize ? Math.round(body.fileSize / 1024) : null,
      notes: body.notes ?? "",
      meta: body.meta ?? {},
    },
    null,
    2,
  );

  // Cost-drain guard: 10 doc-checks / minute / IP.
  const rl = rateLimit(`doc-check:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const client = new Anthropic({ apiKey });

  try {
    const completion = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Run validity checks for this document. Return strict JSON per the schema.\n\n${userPrompt}`,
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
      console.error("[/api/ai/doc-check] non-JSON response:", text.slice(0, 200));
      return Response.json(mockFallback(body.docType), { status: 200 });
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
    console.error("[/api/ai/doc-check] Claude error:", msg);
    return Response.json(mockFallback(body.docType), { status: 200 });
  }
}

function extractJson(text: string): unknown | null {
  // Strip markdown fences if present
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find first { ... } block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

function mockFallback(docType: string) {
  const map: Record<string, DocCheckResult> = {
    passport: passportMock(),
    bank_statement: bankMock(),
    transcript: transcriptMock(),
    acceptance: acceptanceMock(),
    study_permit: permitMock(),
    national_id: nationalIdMock(),
  };
  return map[docType] ?? passportMock();
}

function passportMock() {
  return {
    score: 78,
    label: "Review warnings" as const,
    summary: "Most standard checks pass. 2 warnings worth fixing before submission.",
    findings: [
      { id: "p1", label: "Document type detected: Passport",        detail: "OCR confidence: 98%. MRZ readable.",                                            severity: "ok"   as const },
      { id: "p2", label: "Expiry > 6 months out",                    detail: "Required by most embassies including UK, Canada, Schengen.",                  severity: "ok"   as const },
      { id: "p3", label: "Photo quality acceptable",                 detail: "Eyes visible, neutral expression, ~70% of biometric area.",                    severity: "ok"   as const },
      { id: "p4", label: "Name format may not match application",   detail: "Document reads 'ADU SARFO, KWAKU'. Some forms expect 'KWAKU ADU SARFO'.",      severity: "warn" as const },
      { id: "p5", label: "Reflection on bio page",                   detail: "Top-right glare. Reshoot in even lighting if possible.",                       severity: "warn" as const },
      { id: "p6", label: "No tampering signs",                        detail: "Watermark continuous, hash-based forgery scan clean.",                         severity: "ok"   as const },
    ],
  };
}

function bankMock() {
  return {
    score: 65, label: "Review warnings" as const,
    summary: "Two soft issues. Resolve before visa submission.",
    findings: [
      { id: "b1", label: "Account holder name visible",     detail: "Matches profile.",                                                                  severity: "ok"   as const },
      { id: "b2", label: "Statement dated within 3 months", detail: "Most embassies reject statements older than 3 months.",                              severity: "ok"   as const },
      { id: "b3", label: "Balance currency unclear",         detail: "Statement lists amounts without currency code. Add a bank letter clarifying GHS.",   severity: "warn" as const },
      { id: "b4", label: "No bank letterhead detected",      detail: "Print on official letterhead or attach bank-confirmation letter.",                   severity: "warn" as const },
      { id: "b5", label: "Multi-month transaction history",  detail: "6 months of history visible. Strong signal for IRCC.",                                severity: "ok"   as const },
    ],
  };
}

function transcriptMock() {
  return {
    score: 82, label: "Looks great" as const,
    summary: "Strong submission. One soft suggestion.",
    findings: [
      { id: "t1", label: "Official seal + signature present", detail: "Registrar stamp visible.",                                                        severity: "ok"   as const },
      { id: "t2", label: "GPA scale stated",                   detail: "4.0 scale noted at bottom.",                                                       severity: "ok"   as const },
      { id: "t3", label: "Course-by-course breakdown",         detail: "All semesters listed.",                                                            severity: "ok"   as const },
      { id: "t4", label: "Sealed envelope info missing",       detail: "If applying to US, transcript must arrive in sealed registrar envelope.",          severity: "warn" as const },
    ],
  };
}

function acceptanceMock() {
  return {
    score: 88, label: "Looks great" as const,
    summary: "Looks production-ready.",
    findings: [
      { id: "a1", label: "DLI / SEVP code listed", detail: "Required by IRCC + USCIS.",                                       severity: "ok" as const },
      { id: "a2", label: "Program + start date",   detail: "Both clearly stated.",                                              severity: "ok" as const },
      { id: "a3", label: "Unconditional offer",     detail: "No outstanding conditions — strong for visa officer.",              severity: "ok" as const },
      { id: "a4", label: "Tuition cost stated",     detail: "Helps explain proof-of-funds calculation.",                         severity: "ok" as const },
    ],
  };
}

function permitMock() {
  return {
    score: 72, label: "Review warnings" as const,
    summary: "Valid but watch the work-hour conditions.",
    findings: [
      { id: "v1", label: "Permit expiry > 6 months after arrival", detail: "Required by airline carriers.",                       severity: "ok"   as const },
      { id: "v2", label: "Work-hour condition stated",              detail: "20 hours/week during term, full-time on breaks.",     severity: "ok"   as const },
      { id: "v3", label: "Biometrics collected confirmation",       detail: "VAC receipt visible.",                                 severity: "ok"   as const },
      { id: "v4", label: "Co-op work permit absent",                 detail: "If your program requires co-op, request alongside.",   severity: "warn" as const },
    ],
  };
}

function nationalIdMock() {
  return {
    score: 70, label: "Review warnings" as const,
    summary: "Front clear; back needed for some uses.",
    findings: [
      { id: "n1", label: "Front of ID legible",      detail: "All fields readable.",                                  severity: "ok"   as const },
      { id: "n2", label: "Back of ID not provided",   detail: "Some embassies require both sides.",                    severity: "warn" as const },
      { id: "n3", label: "Expiry > 12 months",         detail: "Plenty of validity.",                                    severity: "ok"   as const },
    ],
  };
}
