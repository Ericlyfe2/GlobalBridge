/**
 * Type-confusion guards on the AI routes.
 *
 * Every one of these bodies is valid JSON with a well-formed shape — the only
 * thing wrong is the *type* of a field the handler then called a string method
 * on. `text?: string` is a compile-time annotation and buys nothing against an
 * arbitrary request body, and `?? ""` only substitutes for null/undefined, so
 * a number or array sailed through into `.trim()` and threw an unhandled
 * TypeError. The caller saw an empty HTTP 500 with no error body at all.
 *
 * Found by fuzzing the live routes: scam-check (number, array), visa-roadmap
 * (number, array, object across three fields) and score-essay (number) all
 * returned 500. The assertion here is deliberately weak — "not a 5xx" — because
 * the contract that matters is that malformed input is *handled*, not which
 * specific 4xx it maps to.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as scamCheck } from "@/app/api/ai/scam-check/route";
import { POST as visaRoadmap } from "@/app/api/ai/visa-roadmap/route";
import { POST as scoreEssay } from "@/app/api/ai/score-essay/route";

vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@ai-sdk/google", () => ({ google: (model: string) => ({ modelId: model }) }));
vi.mock("@/lib/aiConfig", () => ({
  getAiConfig: async () => ({
    ai_model: "gemini-2.5-flash",
    ai_temperature: 0.3,
    ai_system_prompt: "",
    ai_chat_enabled: true,
    ai_doc_check_enabled: true,
    ai_scam_detection_enabled: true,
    ai_translation_enabled: true,
  }),
}));

function post(body: unknown) {
  return new Request("http://localhost/api/ai/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Each case is a body whose field type is wrong in a way that used to crash. */
const CASES: [string, (req: Request) => Promise<Response>, unknown][] = [
  ["scam-check: numeric text", scamCheck, { text: 12345 }],
  ["scam-check: array text", scamCheck, { text: ["a", "b"] }],
  ["scam-check: object text", scamCheck, { text: { a: 1 } }],
  ["scam-check: boolean text", scamCheck, { text: true }],
  ["visa-roadmap: numeric origin", visaRoadmap, { origin: 123, destination: "Canada" }],
  ["visa-roadmap: array destination", visaRoadmap, { origin: "Ghana", destination: ["a"] }],
  ["visa-roadmap: object purpose", visaRoadmap, { origin: "Ghana", destination: "UK", purpose: { x: 1 } }],
  ["visa-roadmap: all numeric", visaRoadmap, { origin: 1, destination: 2, purpose: 3 }],
  ["score-essay: numeric essay", scoreEssay, { essay: 42 }],
  ["score-essay: array essay", scoreEssay, { essay: ["para one"] }],
  ["score-essay: object essay", scoreEssay, { essay: { body: "x" } }],
];

describe("AI routes survive type-confused request bodies", () => {
  beforeEach(() => {
    // No provider key: the routes take their offline/heuristic path, which is
    // enough to prove the *input handling* never throws. The crash being
    // guarded here happened well before any provider call.
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  it.each(CASES)("%s does not 500", async (_label, handler, body) => {
    const res = await handler(post(body));
    expect(res.status).toBeLessThan(500);
  });

  it("still accepts a genuinely valid body", async () => {
    const res = await scamCheck(post({ text: "Wire the deposit via Western Union today" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.score).toBe("number");
  });

  it("still rejects a genuinely empty body", async () => {
    const res = await scamCheck(post({ text: "   " }));
    expect(res.status).toBe(400);
  });
});
