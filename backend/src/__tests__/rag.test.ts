import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction, Router } from "express";

const query = vi.fn();
const queryOne = vi.fn();
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
  redis: null,
}));

const getEmbedding = vi.fn();
const generateEmbedding = vi.fn();
vi.mock("../lib/embeddings", () => ({
  getEmbedding: (...a: unknown[]) => getEmbedding(...a),
  generateEmbedding: (...a: unknown[]) => generateEmbedding(...a),
}));

vi.mock("../middleware/auth", () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

interface FakeRes {
  _status: number;
  _json: unknown;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function mockRes(): FakeRes {
  const res = { _status: 0, _json: undefined } as FakeRes;
  res.status = vi.fn().mockImplementation((code: number) => { res._status = code; return res; });
  res.json = vi.fn().mockImplementation((body: unknown) => { res._json = body; return res; });
  return res;
}

async function callRoute(router: Router, method: "get" | "post", path: string, req: Partial<Request>): Promise<FakeRes> {
  const res = mockRes();
  const next = vi.fn() as unknown as NextFunction;
  const fullReq = req as Request;
  for (const layer of (router as unknown as { stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (req: Request, res: Response, next: NextFunction) => unknown }[] } }[] }).stack) {
    const route = layer.route;
    if (!route || route.path !== path || !route.methods[method]) continue;
    for (const handler of route.stack) {
      await handler.handle(fullReq, res as unknown as Response, next);
      if ((res.status as ReturnType<typeof vi.fn>).mock.calls.length > 0 ||
          (res.json as ReturnType<typeof vi.fn>).mock.calls.length > 0) break;
    }
    break;
  }
  return res;
}

describe("POST /search", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("uses vector search when OPENAI_API_KEY is set", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    getEmbedding.mockResolvedValueOnce(Array(1536).fill(0.01));
    query.mockResolvedValueOnce([{ id: "1", title: "Visa Basics", similarity: 0.82 }]);

    const res = await callRoute(ragRouter, "post", "/search", { body: { query: "visa help" } });

    expect(getEmbedding).toHaveBeenCalledWith("visa help");
    expect(res._json).toMatchObject({ method: "vector" });
    expect((res._json as { results: { title: string }[] }).results[0].title).toBe("Visa Basics");
  });

  it("falls back to text search when OPENAI_API_KEY is unset", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    query.mockResolvedValueOnce([{ id: "1", title: "Housing FAQ", score: 0.4 }]);

    const res = await callRoute(ragRouter, "post", "/search", { body: { query: "housing" } });

    expect(getEmbedding).not.toHaveBeenCalled();
    expect(res._json).toMatchObject({ method: "text" });
    expect((res._json as { results: { title: string }[] }).results[0].title).toBe("Housing FAQ");
  });

  it("threads the category filter into the vector query", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    getEmbedding.mockResolvedValueOnce(Array(1536).fill(0.01));
    query.mockResolvedValueOnce([]);

    await callRoute(ragRouter, "post", "/search", { body: { query: "visa", category: "visa" } });

    const [sql, params] = query.mock.calls[0];
    expect(sql as string).toContain("AND category = $3");
    expect(params).toContain("visa");
  });

  it("threads min_score into the similarity threshold query", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    getEmbedding.mockResolvedValueOnce(Array(1536).fill(0.01));
    query.mockResolvedValueOnce([]);

    await callRoute(ragRouter, "post", "/search", { body: { query: "visa", min_score: 0.7 } });

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe(0.7);
  });

  it("uses correct parameter indices in vector search without category", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    getEmbedding.mockResolvedValueOnce(Array(1536).fill(0.01));
    query.mockResolvedValueOnce([]);

    await callRoute(ragRouter, "post", "/search", { body: { query: "housing", limit: 10 } });

    const [sql, params] = query.mock.calls[0];
    // When category is not provided, params array should have exactly 3 elements: [vecStr, min_score, limit]
    expect(params).toHaveLength(3);
    // The LIMIT clause should reference $3 (not $4) when no category is provided
    expect((sql as string).includes("LIMIT $3")).toBe(true);
    expect((sql as string).includes("LIMIT $4")).toBe(false);
  });

  it("uses correct parameter indices in text fallback search without category", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    query.mockResolvedValueOnce([]);

    await callRoute(ragRouter, "post", "/search", { body: { query: "housing", limit: 10 } });

    const [sql, params] = query.mock.calls[0];
    // When category is not provided, params array should have exactly 2 elements: [queryText, limit]
    expect(params).toHaveLength(2);
    // The LIMIT clause should reference $2 (not $3) when no category is provided
    expect((sql as string).includes("LIMIT $2")).toBe(true);
    expect((sql as string).includes("LIMIT $3")).toBe(false);
  });
});
