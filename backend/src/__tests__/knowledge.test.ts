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
vi.mock("../lib/embeddings", () => ({
  getEmbedding: (...a: unknown[]) => getEmbedding(...a),
  generateEmbedding: vi.fn(),
}));

let authedRole: "student" | "admin" = "admin";
vi.mock("../middleware/auth", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { sub: "u1", firebaseUid: "fb1", email: "a@b.com", role: authedRole };
    next();
  },
  requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  },
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

async function callRoute(router: Router, method: "get" | "post" | "patch", path: string, req: Partial<Request>): Promise<FakeRes> {
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

describe("POST /", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    authedRole = "admin";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects non-admin users with 403", async () => {
    authedRole = "student";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");

    const res = await callRoute(knowledgeRouter, "post", "/", { body: { title: "t", content: "c", category: "cat" } });

    expect(res._status).toBe(403);
  });

  it("creates without OPENAI_API_KEY and stores a null embedding", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "t", category: "cat", created_at: new Date().toISOString() });

    const res = await callRoute(knowledgeRouter, "post", "/", { body: { title: "t", content: "c", category: "cat" } });

    expect(getEmbedding).not.toHaveBeenCalled();
    const params = queryOne.mock.calls[0][1] as unknown[];
    expect(params[7]).toBeNull(); // embedding param
    expect(res._status).toBe(201);
  });

  it("creates with a cached embedding when OPENAI_API_KEY is set", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    queryOne.mockResolvedValueOnce({ id: "kb-2", title: "t", category: "cat", created_at: new Date().toISOString() });

    await callRoute(knowledgeRouter, "post", "/", { body: { title: "t", content: "c", category: "cat" } });

    expect(getEmbedding).toHaveBeenCalledWith("t\nc");
  });
});

describe("PATCH /:id", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    authedRole = "admin";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("re-embeds when content changes", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", content: "Old content" }); // existing lookup
    getEmbedding.mockResolvedValueOnce([0.5]);
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", category: "cat", updated_at: new Date().toISOString() }); // update result

    await callRoute(knowledgeRouter, "patch", "/:id", { params: { id: "kb-1" }, body: { content: "New content" } });

    expect(getEmbedding).toHaveBeenCalledWith("Old title\nNew content");
  });

  it("skips re-embedding when neither title nor content changes", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", content: "Old content" });
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", category: "cat", updated_at: new Date().toISOString() });

    await callRoute(knowledgeRouter, "patch", "/:id", { params: { id: "kb-1" }, body: { tags: ["new-tag"] } });

    expect(getEmbedding).not.toHaveBeenCalled();
  });
});

describe("GET /", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies category and search filters with pagination", async () => {
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    query.mockResolvedValueOnce([{ id: "kb-1", title: "Visa Basics" }]); // entries
    query.mockResolvedValueOnce([{ count: "1" }]); // count

    const res = await callRoute(knowledgeRouter, "get", "/", {
      query: { category: "visa", search: "basics", limit: "10", offset: "0" },
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("category = $1");
    expect(sql).toContain("ILIKE");
    expect(params).toEqual(expect.arrayContaining(["visa", "%basics%", 10, 0]));
    expect((res._json as { total: number }).total).toBe(1);
  });
});
