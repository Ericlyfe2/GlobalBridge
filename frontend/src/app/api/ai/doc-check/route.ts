import { chatComplete, isAiConfigured } from "@/lib/ai-client";
import { requireAiUser, tooLarge, totalChars } from "@/lib/ai-auth";
import { getAiConfig } from "@/lib/aiConfig";

export const runtime = "nodejs";

const MAX_DOC_CHARS = 30_000;

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

/**
 * Which engine produced this result (mirrors scam-check's GB-14 fix). The
 * mock findings below are specific-sounding but entirely canned — "OCR
 * confidence: 98%" for a document nobody uploaded an image of — so the
 * frontend must be able to tell them apart from a real model analysis
 * instead of presenting fabricated findings as if they were real.
 */
type Engine = "ai" | "heuristic" | "disabled";

export async function POST(req: Request) {
  const aiConfig = await getAiConfig();

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.docType) {
    return Response.json({ error: "docType required" }, { status: 400 });
  }

  if (!aiConfig.ai_doc_check_enabled) {
    return Response.json(
      { score: 0, label: "Needs fixes" as const, summary: "The document checker has been turned off by an admin.", findings: [], disabled: true, engine: "disabled" as Engine },
      { status: 200 },
    );
  }

  if (!isAiConfigured()) {
    return Response.json({ ...mockFallback(body.docType), engine: "heuristic" as Engine }, { status: 200 });
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

  if (totalChars(body.docType, body.fileName, body.notes, body.meta?.name, body.meta?.expiry, body.meta?.country) > MAX_DOC_CHARS) {
    return tooLarge(MAX_DOC_CHARS);
  }
  // Authenticated + per-user rate limited: this call spends OpenAI credits.
  const gate = await requireAiUser(req, { feature: "doc-check", limit: 10, body });
  if ("response" in gate) return gate.response;

  try {
    const completion = await chatComplete({
      model: aiConfig.ai_model,
      // Measured 2196/2200 tokens used in production (99.8% of cap) -- the
      // model was being cut off mid-JSON, forcing every real call into the
      // heuristic fallback. Raised with real headroom, not another sliver.
      maxTokens: 3200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Run validity checks for this document. Return strict JSON per the schema.\n\n${userPrompt}`,
        },
      ],
    });

    // Book this call against the caller's daily budget. ai_usage_log is
    // what the admin AI console reads and what the ceiling is computed from.
    await gate.record({
      model: aiConfig.ai_model,
      input_tokens: completion.inputTokens,
      output_tokens: completion.outputTokens,
    });

    const text = completion.text;

    const json = extractJson(text);
    if (!json) {
      console.error("[/api/ai/doc-check] non-JSON response:", text.slice(0, 200));
      return Response.json({ ...mockFallback(body.docType), engine: "heuristic" as Engine }, { status: 200 });
    }

    return Response.json({
      ...json,
      engine: "ai" as Engine,
      usage: {
        input_tokens: completion.inputTokens,
        output_tokens: completion.outputTokens,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/ai/doc-check] AI provider error:", msg);
    return Response.json({ ...mockFallback(body.docType), engine: "heuristic" as Engine }, { status: 200 });
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

/**
 * Deliberately a Checklist, not a DocCheckResult: there is no `score`, because
 * scoring a document this route never received is exactly the fabrication being
 * removed. The UI branches on `engine` and renders these without a gauge.
 */
function mockFallback(docType: string): Checklist {
  const map: Record<string, Checklist> = {
    passport: passportMock(),
    bank_statement: bankMock(),
    transcript: transcriptMock(),
    acceptance: acceptanceMock(),
    study_permit: permitMock(),
    national_id: nationalIdMock(),
  };
  return map[docType] ?? passportMock();
}

/**
 * ── Why these are checklists and not findings ───────────────────────────────
 * This route never receives the file. It gets docType, fileName, fileSize and
 * the user's own notes — nothing else. So nothing here can legitimately report
 * what a document *contains*.
 *
 * These previously read as observations of the uploaded file: "OCR confidence:
 * 98%. MRZ readable", "Document reads 'ADU SARFO, KWAKU'", "Top-right glare",
 * "Watermark continuous, hash-based forgery scan clean", "Registrar stamp
 * visible". Every one of those was invented, and marking them severity "ok"
 * asserted the check had *passed* on a document nobody opened.
 *
 * Rewritten as instructions the applicant performs themselves. Everything is
 * severity "warn" — an open action item — because nothing here has been
 * verified and a green tick would be the same lie in a different shape. The
 * score is omitted for this path; the UI renders these as a checklist rather
 * than a validity gauge.
 */
type ChecklistItem = { id: string; label: string; detail: string; severity: "warn" };
type Checklist = { label: "Pre-submission checklist"; summary: string; findings: ChecklistItem[] };

const CHECKLIST_SUMMARY =
  "We can't read your file — this is the standard checklist for this document type. Work through it against the document yourself.";

function passportMock(): Checklist {
  return {
    label: "Pre-submission checklist",
    summary: CHECKLIST_SUMMARY,
    findings: [
      { id: "p1", label: "Check expiry is at least 6 months past your intended arrival", detail: "Required by most embassies including the UK, Canada and Schengen states.", severity: "warn" },
      { id: "p2", label: "Check the name order matches your application exactly",        detail: "Passports often print SURNAME, GIVEN NAMES while forms expect the reverse. A mismatch is a common rejection reason.", severity: "warn" },
      { id: "p3", label: "Check the bio page scan is evenly lit and uncropped",          detail: "Glare across the photo or the machine-readable lines at the bottom is the most common reason a scan is rejected.", severity: "warn" },
      { id: "p4", label: "Check all four corners of the page are visible",               detail: "Cropped edges are frequently rejected by automated intake systems.", severity: "warn" },
      { id: "p5", label: "Check the scan is in colour",                                  detail: "Greyscale or black-and-white copies are often refused.", severity: "warn" },
    ],
  };
}

function bankMock(): Checklist {
  return {
    label: "Pre-submission checklist",
    summary: CHECKLIST_SUMMARY,
    findings: [
      { id: "b1", label: "Check the account holder name matches your application", detail: "It must match your passport spelling, not a shortened or informal version.", severity: "warn" },
      { id: "b2", label: "Check the statement is dated within the last 3 months",  detail: "Most embassies reject statements older than three months.", severity: "warn" },
      { id: "b3", label: "Check the currency is stated explicitly",                detail: "Amounts printed without a currency code cause avoidable queries. A bank letter can clarify it.", severity: "warn" },
      { id: "b4", label: "Check it is on official bank letterhead",                detail: "Print on letterhead or attach a bank-confirmation letter.", severity: "warn" },
      { id: "b5", label: "Check enough history is shown",                          detail: "Several months of transaction history is a stronger signal than a single closing balance.", severity: "warn" },
    ],
  };
}

function transcriptMock(): Checklist {
  return {
    label: "Pre-submission checklist",
    summary: CHECKLIST_SUMMARY,
    findings: [
      { id: "t1", label: "Check the official seal and registrar signature are present", detail: "An unsealed transcript is usually treated as unofficial.", severity: "warn" },
      { id: "t2", label: "Check the grading scale is stated",                           detail: "A GPA without its scale cannot be interpreted by an admissions officer.", severity: "warn" },
      { id: "t3", label: "Check every semester is included",                            detail: "Gaps invite questions about withdrawn or failed terms.", severity: "warn" },
      { id: "t4", label: "Check whether a sealed envelope is required",                 detail: "Some institutions, particularly in the US, require the transcript to arrive sealed by the registrar.", severity: "warn" },
      { id: "t5", label: "Check whether a certified translation is needed",             detail: "Required if the transcript is not in the destination country's official language.", severity: "warn" },
    ],
  };
}

function acceptanceMock(): Checklist {
  return {
    label: "Pre-submission checklist",
    summary: CHECKLIST_SUMMARY,
    findings: [
      { id: "a1", label: "Check the institution's DLI or SEVP code is shown", detail: "Required by IRCC (Canada) and USCIS (US) respectively.", severity: "warn" },
      { id: "a2", label: "Check the programme name and start date appear",    detail: "Both are needed to establish study intent.", severity: "warn" },
      { id: "a3", label: "Check whether the offer is conditional",            detail: "Outstanding conditions weaken a visa application — resolve them first if you can.", severity: "warn" },
      { id: "a4", label: "Check the tuition amount is stated",                detail: "It anchors your proof-of-funds calculation.", severity: "warn" },
    ],
  };
}

function permitMock(): Checklist {
  return {
    label: "Pre-submission checklist",
    summary: CHECKLIST_SUMMARY,
    findings: [
      { id: "v1", label: "Check the permit runs past your intended arrival date", detail: "Airlines can refuse boarding on a permit close to expiry.", severity: "warn" },
      { id: "v2", label: "Check the work-hour conditions printed on it",          detail: "Study permits usually cap term-time work — know your limit before you accept a job.", severity: "warn" },
      { id: "v3", label: "Check you have your biometrics receipt",                detail: "Keep the visa application centre receipt with the permit.", severity: "warn" },
      { id: "v4", label: "Check whether your programme needs a co-op permit",     detail: "A separate permit is required for placements in some countries — request it alongside, not after.", severity: "warn" },
    ],
  };
}

function nationalIdMock(): Checklist {
  return {
    label: "Pre-submission checklist",
    summary: CHECKLIST_SUMMARY,
    findings: [
      { id: "n1", label: "Check every field on the front is legible", detail: "Reshoot rather than submit a blurred or shadowed scan.", severity: "warn" },
      { id: "n2", label: "Check whether both sides are required",     detail: "Many embassies require the reverse side as well.", severity: "warn" },
      { id: "n3", label: "Check the expiry date",                     detail: "An ID expiring during your application window may be refused.", severity: "warn" },
    ],
  };
}
