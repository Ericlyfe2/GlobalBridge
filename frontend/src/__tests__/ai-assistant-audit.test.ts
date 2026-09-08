import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as chatPost } from "@/app/api/ai/chat/route";

const generateTextMock = vi.fn();
vi.mock("ai", () => ({ generateText: (...a: unknown[]) => generateTextMock(...a) }));
vi.mock("@ai-sdk/google", () => ({ google: (model: string) => ({ modelId: model }) }));

vi.mock("@/lib/aiConfig", () => ({
  getAiConfig: async () => ({
    ai_model: "gemini-2.5-flash",
    ai_temperature: 0.3,
    ai_system_prompt: null, // Test null system prompt handling
    ai_chat_enabled: true,
    ai_doc_check_enabled: true,
    ai_scam_detection_enabled: true,
    ai_translation_enabled: true,
  }),
}));

const TEST_USER = {
  id: "00000000-0000-0000-0000-0000000000aa",
  email: "student@example.com",
  full_name: "Kwaku Adu",
  role: "student",
  country_of_origin: "GH",
  country_of_residence: "CA",
  preferred_language: "en",
  verification_status: "verified",
};

describe("AI Red Team & Error Contract Audit", () => {
  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-gemini-key";
    generateTextMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        if (u.includes("/api/auth/me")) {
          return new Response(JSON.stringify({ user: TEST_USER }), { status: 200 });
        }
        if (u.includes("/api/ai/usage/today")) {
          return new Response(JSON.stringify({ spent_usd: 0, limit_usd: 1, exceeded: false }), { status: 200 });
        }
        if (u.includes("/api/ai/usage")) {
          return new Response(JSON.stringify({ ok: true }), { status: 201 });
        }
        if (u.includes("/api/rag/search")) {
          return new Response(JSON.stringify({ results: [] }), { status: 200 });
        }
        if (u.includes("/api/knowledge/trusted-sources")) {
          return new Response(JSON.stringify({ sources: [{ name: "Canada.ca", host: "canada.ca", type: "government", confidence_weight: 1 }] }), { status: 200 });
        }
        if (u.includes("/api/content/ai-config")) {
          return new Response(JSON.stringify({ ai_model: "gemini-2.5-flash", ai_system_prompt: null }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }),
    );
  });

  it("rejects unauthenticated AI chat requests with 401 and clean error message", async () => {
    const req = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello AI" }],
      }),
    });
    const res = await chatPost(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Sign in to use GlobalBridge AI tools.");
  });

  // Ordering regression: the availability checks (isAiConfigured /
  // ai_chat_enabled) once ran before the body was parsed, so with no provider
  // key every malformed request came back 503 not_configured. That hides a
  // caller's mistake behind a server excuse, and made request validation
  // impossible to exercise locally. The tests above cannot catch it because
  // beforeEach sets a key; this one deliberately removes it.
  it("still reports malformed input as 400 when the AI is unconfigured", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const badJson = await chatPost(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ broken json",
      }),
    );
    expect(badJson.status).toBe(400);

    const empty = await chatPost(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );
    expect(empty.status).toBe(400);

    // A well-formed request is the only one that should surface the outage.
    const wellFormed = await chatPost(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      }),
    );
    expect(wellFormed.status).toBe(503);
    const body = await wellFormed.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("not_configured");
  });

  it("rejects invalid JSON payloads with 400", async () => {
    const req = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ broken json",
    });
    const res = await chatPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("rejects empty messages array with 400", async () => {
    const req = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ messages: [] }),
    });
    const res = await chatPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("messages[] required");
  });

  it("rejects excessively large input payloads with 413", async () => {
    const giantText = "A".repeat(30_000);
    const req = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({
        messages: [{ role: "user", content: giantText }],
      }),
    });
    const res = await chatPost(req);
    expect(res.status).toBe(413);
  });

  it("successfully responds when authenticated and properly drops unverifiable links", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "For a Canadian study permit, check https://www.canada.ca/en/immigration.html and fake link https://www.scam-visa.com/fake",
      usage: { inputTokens: 40, outputTokens: 30 },
    });

    const req = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "How do I apply for a Canada study permit?" }],
      }),
    });

    const res = await chatPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.reply).toContain("For a Canadian study permit");
    expect(Array.isArray(data.sources)).toBe(true);
    // scam-visa.com must NOT be in sources
    expect(data.sources.some((s: { url: string }) => s.url.includes("scam-visa.com"))).toBe(false);
  });

  it("returns 503 with explicit error when AI provider throws an outage error", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("Google Generative AI 503 Overloaded"));

    const req = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Tell me about housing in Germany" }],
      }),
    });

    const res = await chatPost(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("provider_error");
    expect(data.error.message).toContain("temporarily unavailable");
  });

  it("returns 503 when AI is not configured", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const req = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await chatPost(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("not_configured");
  });
});
