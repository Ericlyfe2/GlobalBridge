/**
 * GB-09 regression guards — the dead AI proxy and roadmap persistence.
 *
 * backend/src/routes/ai.ts had four endpoints POSTing to AI_SERVICE_URL, the
 * removed Python microservice: /chat, /checklist, /doc-check and /translate.
 * All four failed with "fetch failed" on every call while the docs claimed the
 * service was gone.
 *
 * The consequence that reached users: /checklist was the ONLY writer to
 * visa_checklists, so a generated visa roadmap could never persist and the
 * student dashboard's visa-progress tile was null for everyone.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";

const query = vi.fn();
const queryOne = vi.fn();
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));
vi.mock("../middleware/auth", () => ({
  requireAuth: function requireAuth(_r: Request, _s: Response, n: NextFunction) { n(); },
  optionalAuth: function optionalAuth(_r: Request, _s: Response, n: NextFunction) { n(); },
  requireRole: () => function requireRoleInner(_r: Request, _s: Response, n: NextFunction) { n(); },
  requireAdmin: () => function requireAdminInner(_r: Request, _s: Response, n: NextFunction) { n(); },
  isAdmin: () => false,
  clearUserCache: vi.fn(),
}));

import { aiRouter } from "../routes/ai";

const ME = "aaaaaaaa-0000-0000-0000-000000000001";
const PHASES = [
  { id: "decide", title: "Decide and research", timeframe: "Weeks 1-2", cost: "$0", documents: ["Passport"], tip: "Start early." },
  { id: "apply", title: "Apply to institutions", timeframe: "Weeks 3-8", cost: "$150", documents: ["Transcripts"], tip: "Apply broadly." },
  { id: "visa", title: "Submit the visa application", timeframe: "Weeks 9-14", cost: "$235", documents: ["Proof of funds"], tip: "Book biometrics." },
];

function mockRes() {
  const res = { _status: 200, _json: undefined as unknown } as {
    _status: number; _json: unknown;
    status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>;
  };
  res.status = vi.fn((c: number) => { res._status = c; return res; });
  res.json = vi.fn((b: unknown) => { res._json = b; return res; });
  return res;
}

async function callRoute(router: Router, method: string, path: string, req: Partial<Request>) {
  const res = mockRes();
  const errors: unknown[] = [];
  const next = vi.fn((e?: unknown) => { if (e) errors.push(e); }) as unknown as NextFunction;
  type Layer = { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (q: Request, s: Response, n: NextFunction) => unknown }[] } };
  let matched = false;
  for (const layer of (router as unknown as { stack: Layer[] }).stack) {
    const route = layer.route;
    if (!route || route.path !== path || !route.methods[method]) continue;
    matched = true;
    for (let i = 0; i < route.stack.length; i++) {
      await route.stack[i].handle(req as Request, res as unknown as Response, next);
      if (res.status.mock.calls.length > 0 || res.json.mock.calls.length > 0) break;
    }
    break;
  }
  if (!matched) throw new Error(`route not found: ${method.toUpperCase()} ${path}`);
  return { res, errors };
}

const asMe = (body?: unknown, params: Record<string, string> = {}) => ({
  user: { sub: ME, firebaseUid: "fb", email: "a@b.com", role: "student" as const },
  body, params, query: {},
});

/** Every route the AI router exposes, as "METHOD /path". */
function routesOf(router: Router): string[] {
  type Layer = { route?: { path: string; methods: Record<string, boolean> } };
  const out: string[] = [];
  for (const layer of (router as unknown as { stack: Layer[] }).stack) {
    if (!layer.route) continue;
    for (const m of Object.keys(layer.route.methods)) out.push(`${m.toUpperCase()} ${layer.route.path}`);
  }
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

// ── the dead proxy is gone ──────────────────────────────────────────────────
describe("GB-09 — the removed Python service", () => {
  it("no longer exposes any endpoint that proxied to it", () => {
    const routes = routesOf(aiRouter);
    for (const dead of ["POST /chat", "POST /checklist", "POST /doc-check", "POST /translate"]) {
      expect(routes, `${dead} proxied to AI_SERVICE_URL and always failed`).not.toContain(dead);
    }
  });

  it("still exposes the routes that do real work", () => {
    const routes = routesOf(aiRouter);
    for (const live of [
      "POST /conversations", "GET /conversations", "GET /conversations/:id",
      "POST /messages", "GET /usage/today", "POST /usage",
      "POST /checklists", "GET /checklists", "PATCH /checklists/:id", "DELETE /checklists/:id",
    ]) {
      expect(routes).toContain(live);
    }
  });

  it("leaves no AI_SERVICE_URL reference in the router module", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(join(__dirname, "..", "routes", "ai.ts"), "utf8");
    expect(src).not.toContain("AI_SERVICE_URL");
    expect(src).not.toContain("localhost:8000");
  });
});

// ── roadmap persistence ─────────────────────────────────────────────────────
describe("GB-09 — visa roadmap persistence", () => {
  it("writes a generated roadmap to visa_checklists", async () => {
    queryOne.mockResolvedValueOnce(null);                              // no previous
    queryOne.mockResolvedValueOnce({ id: "c1", items: PHASES });       // insert
    const { res } = await callRoute(aiRouter, "post", "/checklists", asMe({
      origin_country: "Ghana", destination_country: "Canada", visa_type: "study", items: PHASES,
    }));

    expect(res._status).toBe(201);
    const insert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO visa_checklists"))!;
    expect(insert).toBeTruthy();
    expect((insert[1] as unknown[])[0]).toBe(ME); // scoped to the caller
  });

  it("replaces the previous roadmap for the same destination instead of duplicating", async () => {
    queryOne.mockResolvedValueOnce({ id: "old", completed_items: [] });
    queryOne.mockResolvedValueOnce({ id: "c2" });
    await callRoute(aiRouter, "post", "/checklists", asMe({
      origin_country: "Ghana", destination_country: "Canada", visa_type: "study", items: PHASES,
    }));
    const del = query.mock.calls.find((c) => String(c[0]).includes("DELETE FROM visa_checklists"));
    expect(del, "regenerating must not pile up duplicate checklists").toBeTruthy();
  });

  it("carries completed phases across a regeneration", async () => {
    // Losing someone's ticked-off progress because they regenerated would be a
    // worse bug than the one being fixed.
    queryOne.mockResolvedValueOnce({ id: "old", completed_items: ["decide", "apply"] });
    queryOne.mockResolvedValueOnce({ id: "c3" });
    await callRoute(aiRouter, "post", "/checklists", asMe({
      origin_country: "Ghana", destination_country: "Canada", visa_type: "study", items: PHASES,
    }));
    const insert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO visa_checklists"))!;
    expect((insert[1] as unknown[])[5]).toEqual(["decide", "apply"]);
  });

  it("drops carried-over completions for phases the new roadmap no longer has", async () => {
    queryOne.mockResolvedValueOnce({ id: "old", completed_items: ["decide", "phase-that-vanished"] });
    queryOne.mockResolvedValueOnce({ id: "c4" });
    await callRoute(aiRouter, "post", "/checklists", asMe({
      origin_country: "Ghana", destination_country: "Canada", visa_type: "study", items: PHASES,
    }));
    const insert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO visa_checklists"))!;
    expect((insert[1] as unknown[])[5]).toEqual(["decide"]);
  });

  it("rejects a roadmap with no phases", async () => {
    const { errors } = await callRoute(aiRouter, "post", "/checklists", asMe({
      origin_country: "Ghana", destination_country: "Canada", visa_type: "study", items: [],
    }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("GB-09 — ticking phases off", () => {
  const patch = (body: unknown, existing: unknown = { id: "c1", items: PHASES }) => {
    queryOne.mockReset();
    queryOne.mockResolvedValueOnce(existing);
    queryOne.mockResolvedValueOnce({ id: "c1", completed_items: ["decide"] });
    return callRoute(aiRouter, "patch", "/checklists/:id", asMe(body, { id: "c1" }));
  };

  it("marks a phase complete", async () => {
    const { res } = await patch({ phase_id: "decide", completed: true });
    expect(res._json).toMatchObject({ checklist: { completed_items: ["decide"] } });
  });

  it("computes the new set in SQL, so two devices cannot clobber each other", async () => {
    await patch({ phase_id: "decide", completed: true });
    const update = queryOne.mock.calls.find((c) => String(c[0]).includes("UPDATE visa_checklists"))!;
    // A read-modify-write in the handler would lose one of two concurrent toggles.
    expect(String(update[0])).toMatch(/completed_items\s*=/);
    expect(String(update[0])).toContain("unnest");
  });

  it("un-ticks a phase with a set difference rather than a rewrite", async () => {
    await patch({ phase_id: "decide", completed: false });
    const update = queryOne.mock.calls.find((c) => String(c[0]).includes("UPDATE visa_checklists"))!;
    expect(String(update[0])).toContain("EXCEPT");
  });

  it("refuses a phase id that is not in this checklist", async () => {
    const { res } = await patch({ phase_id: "not-a-phase", completed: true });
    expect(res._status).toBe(400);
  });

  it("404s someone else's checklist rather than revealing it exists", async () => {
    const { res } = await patch({ phase_id: "decide", completed: true }, null);
    expect(res._status).toBe(404);
  });

  it("scopes every read and write to the caller", async () => {
    await patch({ phase_id: "decide", completed: true });
    for (const call of queryOne.mock.calls) {
      const sql = String(call[0]);
      if (!sql.includes("visa_checklists")) continue;
      expect(sql, `unscoped query: ${sql}`).toContain("user_id = $2");
    }
  });
});
