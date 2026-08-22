/**
 * Phase 11 regression guards — GB-16, GB-17, GB-19, GB-20, GB-18.
 *
 * GB-16  Every `:id` route passed req.params straight into SQL, so a non-UUID
 *        raised `invalid input syntax for type uuid` and surfaced as a 500.
 *        Unmatched API routes returned Express's HTML error page.
 * GB-17  Housing accepted `limit` but no `offset`, so everything past the first
 *        page was unreachable — and ordering by rating DESC meant new listings
 *        were exactly the ones nobody could see.
 * GB-19  rubric_scores was a bare z.record, so {} validated: an empty review
 *        earned a full credit. The 403 message also under-reported how many
 *        reviews were actually needed.
 * GB-20  Admin role changes never cleared requireAuth's 60s cache or refreshed
 *        the Firebase claim, and the audit row recorded column names only.
 * GB-18  Forum vote buttons had no endpoint behind them.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";

const query = vi.fn();
const queryOne = vi.fn();
const recordAudit = vi.fn();
const clearUserCache = vi.fn();
const setCustomUserClaims = vi.fn();

vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));
vi.mock("../lib/audit", () => ({ recordAudit: (...a: unknown[]) => recordAudit(...a) }));
vi.mock("../lib/push", () => ({ dispatchNotification: vi.fn(), pushEnabled: false }));
vi.mock("../lib/health", () => ({ collectHealth: vi.fn() }));
vi.mock("../lib/firebase-admin", () => ({
  adminAuth: {
    setCustomUserClaims: (...a: unknown[]) => setCustomUserClaims(...a),
    revokeRefreshTokens: vi.fn(),
    deleteUser: vi.fn(),
  },
}));
vi.mock("../middleware/auth", () => ({
  requireAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  optionalAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  requireRole: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  requireAdmin: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  isAdmin: () => true,
  isSuperAdmin: () => true,
  clearUserCache: (...a: unknown[]) => clearUserCache(...a),
}));

import { housingRouter } from "../routes/housing";
import { peerReviewRouter } from "../routes/peerReview";
import { adminRouter } from "../routes/admin";
import { forumsRouter } from "../routes/forums";
import { apiNotFound, UUID_RE, installUuidParamValidation } from "../middleware/validate";
import { errorHandler } from "../middleware/error";

const ME = "aaaaaaaa-0000-0000-0000-000000000001";

function mockRes() {
  const res = { _status: 200, _json: undefined as unknown } as {
    _status: number; _json: unknown;
    status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>;
  };
  res.status = vi.fn((c: number) => { res._status = c; return res; });
  res.json = vi.fn((b: unknown) => { res._json = b; return res; });
  res.set = vi.fn(() => res);
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

const asUser = (body?: unknown, params: Record<string, string> = {}, q: Record<string, string> = {}) => ({
  user: { sub: ME, firebaseUid: "fb-1", email: "a@b.com", role: "admin" as const },
  body, params, query: q,
});

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

// ── GB-16 ───────────────────────────────────────────────────────────────────
describe("GB-16 — malformed ids and unmatched routes", () => {
  it("recognises real UUIDs and rejects the shapes that reached SQL", () => {
    expect(UUID_RE.test("beb9d7e0-e78d-4ea3-aa08-ed6c6424a160")).toBe(true);
    for (const bad of ["not-a-uuid", "123", "", "beb9d7e0e78d4ea3aa08ed6c6424a160", "'; DROP TABLE users--"]) {
      expect(UUID_RE.test(bad), `${bad} must not pass`).toBe(false);
    }
  });

  it("registers a param validator on every router it is given", () => {
    const calls: string[] = [];
    const fake = { param: (name: string) => { calls.push(name); return fake; } } as unknown as Router;
    installUuidParamValidation([fake]);
    expect(calls).toContain("id");
    expect(calls).toContain("userId");
  });

  it("answers a bad id with 400 and names the parameter", async () => {
    const res = mockRes();
    const handlers: Record<string, (r: Request, s: Response, n: NextFunction, v: string) => void> = {};
    const fake = {
      param: (name: string, fn: (r: Request, s: Response, n: NextFunction, v: string) => void) => {
        handlers[name] = fn; return fake;
      },
    } as unknown as Router;
    installUuidParamValidation([fake]);

    const next = vi.fn();
    handlers.id({} as Request, res as unknown as Response, next as unknown as NextFunction, "not-a-uuid");
    expect(res._status).toBe(400);
    expect(res._json).toMatchObject({ param: "id" });
    expect(next).not.toHaveBeenCalled();

    handlers.id({} as Request, res as unknown as Response, next as unknown as NextFunction, "beb9d7e0-e78d-4ea3-aa08-ed6c6424a160");
    expect(next).toHaveBeenCalled();
  });

  it("returns JSON, not an HTML page, for an unmatched API route", () => {
    const res = mockRes();
    apiNotFound(
      { path: "/api/does-not-exist", method: "GET" } as Request,
      res as unknown as Response,
      vi.fn() as unknown as NextFunction,
    );
    expect(res._status).toBe(404);
    expect(res._json).toMatchObject({ error: expect.stringContaining("/api/does-not-exist") });
  });

  it("leaves non-API paths to the app's own handling", () => {
    const next = vi.fn();
    apiNotFound({ path: "/health", method: "GET" } as Request, mockRes() as unknown as Response, next as unknown as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it("maps a Postgres 22P02 to 400 rather than 500", () => {
    // Backstop for any param name the validator list does not cover.
    const res = mockRes();
    errorHandler(
      Object.assign(new Error("invalid input syntax for type uuid"), { code: "22P02" }),
      {} as Request, res as unknown as Response, vi.fn() as unknown as NextFunction,
    );
    expect(res._status).toBe(400);
  });

  it("still returns 500 for a genuine server fault", () => {
    const res = mockRes();
    errorHandler(new Error("boom"), {} as Request, res as unknown as Response, vi.fn() as unknown as NextFunction);
    expect(res._status).toBe(500);
  });
});

// ── GB-17 ───────────────────────────────────────────────────────────────────
describe("GB-17 — housing pagination", () => {
  it("threads offset into the query so page two is reachable", async () => {
    await callRoute(housingRouter, "get", "/", asUser(undefined, {}, { limit: "2", offset: "4" }));
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("OFFSET");
    expect(params.slice(-2)).toEqual([2, 4]);
  });

  it("defaults to the first page", async () => {
    await callRoute(housingRouter, "get", "/", asUser(undefined, {}, {}));
    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params.slice(-2)).toEqual([60, 0]);
  });

  it("rejects a negative offset instead of silently ignoring it", async () => {
    const { errors } = await callRoute(housingRouter, "get", "/", asUser(undefined, {}, { offset: "-5" }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ── GB-19 ───────────────────────────────────────────────────────────────────
describe("GB-19 — peer review credit farming", () => {
  const postReview = (body: unknown) => {
    queryOne.mockResolvedValueOnce({ user_id: "someone-else" });
    return callRoute(peerReviewRouter, "post", "/submissions/:id/reviews", asUser(body, { id: "s1" }));
  };
  const FULL = { hook: 70, arc: 70, ev: 70, fit: 70, voice: 70, close: 70 };
  const REAL_COMMENT = "x".repeat(150);

  it("rejects an empty rubric, which used to earn a full credit", async () => {
    const { errors } = await postReview({ rubric_scores: {}, comments: REAL_COMMENT });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a partially scored rubric", async () => {
    const { errors } = await postReview({ rubric_scores: { hook: 80 }, comments: REAL_COMMENT });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a review with no substantive feedback", async () => {
    const { errors } = await postReview({ rubric_scores: FULL, comments: "nice" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts a complete, written review", async () => {
    queryOne.mockReset();
    queryOne.mockResolvedValueOnce({ user_id: "someone-else" });
    queryOne.mockResolvedValueOnce({ id: "r1" });
    const { res } = await callRoute(peerReviewRouter, "post", "/submissions/:id/reviews",
      asUser({ rubric_scores: FULL, comments: REAL_COMMENT }, { id: "s1" }));
    expect(res._status).toBe(201);
  });

  it("tells the truth about how many reviews are still needed", async () => {
    // credits = reviewsGiven - 3 * submissionsMade. At one submission and no
    // reviews that is -3, and six reviews are needed to reach the threshold —
    // the old message said three.
    queryOne.mockReset();
    queryOne.mockResolvedValueOnce({ n: 1 });   // submissionsMade
    queryOne.mockResolvedValueOnce({ n: 0 });   // reviewsGiven (inside creditsFor)
    queryOne.mockResolvedValueOnce({ n: 1 });   // submissionsMade (inside creditsFor)
    const { res } = await callRoute(peerReviewRouter, "post", "/submissions",
      asUser({ doc_type: "SOP", target: "LSE", body: "x".repeat(60) }));
    expect(res._status).toBe(403);
    expect(res._json).toMatchObject({ credits: -3, reviews_needed: 6 });
    expect(String((res._json as { error: string }).error)).toContain("6 more drafts");
  });
});

// ── GB-20 ───────────────────────────────────────────────────────────────────
describe("GB-20 — admin role changes", () => {
  const patchUser = (body: unknown, target = { role: "student", firebase_uid: "fb-target", verification_status: "verified" }) => {
    queryOne.mockReset();
    queryOne.mockResolvedValueOnce(target);
    queryOne.mockResolvedValue({ id: "u1" });
    return callRoute(adminRouter, "patch", "/users/:id", asUser(body, { id: "u1" }));
  };

  it("clears the auth cache so a demotion takes effect immediately", async () => {
    await patchUser({ role: "mentor" });
    expect(clearUserCache).toHaveBeenCalledWith("fb-target");
  });

  it("refreshes the Firebase claim the client reads", async () => {
    await patchUser({ role: "mentor" });
    expect(setCustomUserClaims).toHaveBeenCalledWith("fb-target", { role: "mentor" });
  });

  it("audits the old and new value, not just the column name", async () => {
    await patchUser({ role: "employer" });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.update",
        metadata: expect.objectContaining({
          changes: expect.objectContaining({ role: { from: "student", to: "employer" } }),
        }),
      }),
    );
  });

  it("does not record a change when the value is unchanged", async () => {
    await patchUser({ role: "student" });
    const call = recordAudit.mock.calls[0][0] as { metadata: { changes: Record<string, unknown> } };
    expect(call.metadata.changes).not.toHaveProperty("role");
  });
});

// ── GB-18 ───────────────────────────────────────────────────────────────────
describe("GB-18 — forum voting has real persistence", () => {
  const vote = (body: unknown) => {
    queryOne.mockReset();
    queryOne.mockResolvedValueOnce({ id: "p1" });      // target exists
    queryOne.mockResolvedValueOnce({ score: 3 });      // recomputed tally
    return callRoute(forumsRouter, "post", "/vote/:id", asUser(body, { id: "p1" }));
  };

  it("records an upvote and returns the server's tally", async () => {
    const { res } = await vote({ target_type: "post", value: 1 });
    expect(res._json).toMatchObject({ score: 3, my_vote: 1 });
  });

  it("is idempotent — one row per voter per target", async () => {
    await vote({ target_type: "post", value: 1 });
    const insert = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO forum_votes"))!;
    expect(String(insert[0])).toContain("ON CONFLICT (user_id, target_type, target_id) DO UPDATE");
  });

  it("clears a vote with value 0 rather than storing a zero", async () => {
    await vote({ target_type: "post", value: 0 });
    expect(query.mock.calls.some((c) => String(c[0]).includes("DELETE FROM forum_votes"))).toBe(true);
  });

  it("recomputes the tally from the votes rather than incrementing", async () => {
    // An increment drifts from the rows that justify it on any retry.
    await vote({ target_type: "post", value: 1 });
    const update = queryOne.mock.calls.find((c) => String(c[0]).includes("SET upvotes"))!;
    expect(String(update[0])).toContain("SELECT SUM(value)");
    expect(String(update[0])).not.toContain("upvotes + 1");
  });

  it("rejects a vote value outside -1, 0, 1", async () => {
    queryOne.mockResolvedValueOnce({ id: "p1" });
    const { errors } = await callRoute(forumsRouter, "post", "/vote/:id",
      asUser({ target_type: "post", value: 99 }, { id: "p1" }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("404s a target that does not exist", async () => {
    queryOne.mockReset();
    queryOne.mockResolvedValueOnce(null);
    const { res } = await callRoute(forumsRouter, "post", "/vote/:id",
      asUser({ target_type: "post", value: 1 }, { id: "p1" }));
    expect(res._status).toBe(404);
  });
});
