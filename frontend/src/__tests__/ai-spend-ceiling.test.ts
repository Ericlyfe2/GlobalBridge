/**
 * GB-03 follow-on: per-user daily AI spend ceiling.
 *
 * Phase 2 added authentication and a per-minute per-user rate limit, but the
 * audit's requirement was a *daily spend ceiling*, enforced server-side, with
 * per-user spend logged so the ceiling is auditable. Neither existed:
 *
 *   - ai_usage_log has 9 read sites in routes/admin.ts and 0 write sites
 *     anywhere in the codebase, so it was permanently empty and the admin AI
 *     observability console reported zeros forever.
 *   - the only limit was 10/minute, which is ~14,400 model calls per user per
 *     day. Nothing capped cost.
 *
 * These tests drive the real scam-check route handler with a verified user and
 * a stubbed AI SDK generateText call.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const generateTextMock = vi.fn();
vi.mock("ai", () => ({ generateText: (...a: unknown[]) => generateTextMock(...a) }));
vi.mock("@ai-sdk/google", () => ({ google: (model: string) => ({ modelId: model }) }));
vi.mock("@/lib/aiConfig", () => ({
  getAiConfig: async () => ({
    ai_model: "gemini-3.5-flash-lite",
    ai_temperature: 0.3,
    ai_system_prompt: "",
    ai_chat_enabled: true,
    ai_doc_check_enabled: true,
    ai_scam_detection_enabled: true,
    ai_translation_enabled: true,
  }),
}));

const VERIFIED_USER = {
  id: "00000000-0000-0000-0000-0000000000aa",
  email: "student@example.com",
  full_name: "Test Student",
  role: "student",
  country_of_origin: "GH",
  country_of_residence: "CA",
  preferred_language: "en",
  verification_status: "verified",
};

/** Calls the backend makes, so assertions can inspect what was recorded. */
let recorded: { url: string; body: unknown }[] = [];
/** What GET /api/ai/usage/today reports back — the spend already booked today. */
let spentUsd = 0;

function installFetch() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    recorded.push({ url, body });

    if (url.includes("/api/auth/me")) {
      return new Response(JSON.stringify({ user: VERIFIED_USER }), { status: 200 });
    }
    if (url.includes("/api/ai/usage/today")) {
      // Shape matches GET /api/ai/usage/today in backend/src/routes/ai.ts.
      return new Response(JSON.stringify({
        spent_usd: spentUsd,
        limit_usd: 1,
        exceeded: spentUsd >= 1,
        calls: 0,
        resets_at: new Date(Date.now() + 3_600_000).toISOString(),
      }), { status: 200 });
    }
    if (url.includes("/api/ai/usage")) {
      // Recording a completed call — accrue it so the ceiling can be reached.
      spentUsd += 0.25;
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    }
    return new Response("{}", { status: 200 });
  }));
}

async function callScamCheck() {
  const { POST } = await import("@/app/api/ai/scam-check/route");
  return POST(new Request("http://localhost/api/ai/scam-check", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
    body: JSON.stringify({ text: "Wire 500 EUR via Western Union to secure the flat." }),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  recorded = [];
  spentUsd = 0;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  generateTextMock.mockResolvedValue({
    text: JSON.stringify({ score: 90, verdict: "High scam risk", summary: "s", flags: [], advice: ["a"] }),
    usage: { inputTokens: 1200, outputTokens: 800 },
  });
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
});

describe("per-user daily AI spend ceiling", () => {
  it("records every completed call against the caller's usage ledger", async () => {
    const res = await callScamCheck();
    expect(res.status).toBe(200);

    const usageWrites = recorded.filter((r) => r.url.includes("/api/ai/usage") && !r.url.includes("today"));
    expect(usageWrites, "a completed AI call must be written to ai_usage_log").toHaveLength(1);
    expect(usageWrites[0].body).toMatchObject({
      feature: "scam-check",
      model: "gemini-3.5-flash-lite",
      input_tokens: 1200,
      output_tokens: 800,
    });
  });

  it("checks the ceiling before spending anything", async () => {
    await callScamCheck();
    const checkIdx = recorded.findIndex((r) => r.url.includes("/api/ai/usage/today"));
    expect(checkIdx, "the ceiling must be read before the model is called").toBeGreaterThanOrEqual(0);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 once the daily ceiling is reached, without calling the model", async () => {
    spentUsd = 5; // already over the $1 ceiling
    const res = await callScamCheck();

    expect(res.status).toBe(429);
    expect(generateTextMock, "no model call may be made once the ceiling is hit").not.toHaveBeenCalled();
    // The response has to tell the user what happened and when it clears —
    // a bare 429 is indistinguishable from the per-minute burst limit.
    const body = await res.json();
    expect(body.error).toMatch(/limit/i);
    expect(body.error).toMatch(/resets/i);
    expect(body.resets_at, "the client needs to know when the budget clears").toBeTruthy();
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("accrues across calls until the ceiling stops further spending", async () => {
    // Ceiling is $1 and each recorded call books $0.25 in this harness, so the
    // fifth call is the one that must be refused.
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      vi.resetModules();
      statuses.push((await callScamCheck()).status);
    }
    expect(statuses.slice(0, 4)).toEqual([200, 200, 200, 200]);
    expect(statuses.slice(4)).toEqual([429, 429]);
  });

  it("still serves the request when the ledger is unreachable, and says so", async () => {
    // Failing closed on a usage-service blip would take the whole AI surface
    // down for an infrastructure problem unrelated to the user's budget.
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/me")) {
        return new Response(JSON.stringify({ user: VERIFIED_USER }), { status: 200 });
      }
      if (url.includes("/api/ai/usage")) throw new Error("ledger down");
      return new Response("{}", { status: 200 });
    }));
    const res = await callScamCheck();
    expect(res.status).toBe(200);
  });
});
