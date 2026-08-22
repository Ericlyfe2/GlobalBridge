/**
 * Phase 6 regression guards — GB-05, GB-06, GB-07, GB-11.
 *
 * GB-05  GET /api/users/:id was unauthenticated and returned legal name plus
 *        country of origin plus country of residence. UUIDs are not secret —
 *        the public mentor directory and public jobs feed hand them out.
 * GB-06  POST /api/auth/register-profile was a plain upsert with
 *        `role = EXCLUDED.role`, so any account could re-POST it and reassign
 *        its own role to mentor or employer, with no audit trail.
 * GB-07  GET /api/housing/:id had no status filter, so an archived listing
 *        stayed readable — address and all — at its direct URL.
 * GB-11  Any authenticated user could publish a scam alert naming a real person
 *        straight to the unauthenticated public feed, with no review and no
 *        takedown path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";

const query = vi.fn();
const queryOne = vi.fn();
const recordAudit = vi.fn();
const setCustomUserClaims = vi.fn();

vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));
vi.mock("../lib/audit", () => ({ recordAudit: (...a: unknown[]) => recordAudit(...a) }));
vi.mock("../lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    setCustomUserClaims: (...a: unknown[]) => setCustomUserClaims(...a),
    deleteUser: vi.fn(),
    revokeRefreshTokens: vi.fn(),
  },
}));
vi.mock("../middleware/auth", () => ({
  requireAuth: function requireAuth(_r: Request, _s: Response, n: NextFunction) { n(); },
  optionalAuth: function optionalAuth(_r: Request, _s: Response, n: NextFunction) { n(); },
  requireRole: () => function requireRoleInner(_r: Request, _s: Response, n: NextFunction) { n(); },
  requireAdmin: () => function requireAdminInner(_r: Request, _s: Response, n: NextFunction) { n(); },
  isAdmin: (role: string) => role === "admin" || role === "super_admin",
  clearUserCache: vi.fn(),
}));

import { usersRouter } from "../routes/users";
import { authRouter } from "../routes/auth";
import { housingRouter } from "../routes/housing";
import { moderationRouter } from "../routes/moderation";

const ME = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER = "bbbbbbbb-0000-0000-0000-000000000002";

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
  const next = vi.fn((e?: unknown) => { if (e) throw e; }) as unknown as NextFunction;
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
  return res;
}

/** Middleware mounted ahead of the handler, by name. */
function guardsOn(router: Router, method: string, path: string): string[] {
  type Layer = { route?: { path: string; methods: Record<string, boolean>; stack: { handle: { name?: string } }[] } };
  for (const layer of (router as unknown as { stack: Layer[] }).stack) {
    const route = layer.route;
    if (!route || route.path !== path || !route.methods[method]) continue;
    return route.stack.slice(0, -1).map((s) => s.handle?.name ?? "");
  }
  throw new Error(`route not found: ${method.toUpperCase()} ${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

// ── GB-05 ───────────────────────────────────────────────────────────────────
describe("GB-05 — another user's profile", () => {
  const row = {
    id: OTHER, full_name: "Ama Owusu", avatar_url: null, role: "mentor",
    country_of_origin: "Ghana", country_of_residence: "Canada",
    bio: "5 years in Toronto.", trust_score: 92,
    verification_status: "verified", share_country_of_origin: false,
  };

  it("requires a session", () => {
    expect(guardsOn(usersRouter, "get", "/:id")).toContain("requireAuth");
  });

  it("withholds country_of_origin unless that user shared it", async () => {
    queryOne.mockResolvedValueOnce(row);
    const res = await callRoute(usersRouter, "get", "/:id", {
      user: { sub: ME, firebaseUid: "f", email: "a@b.com", role: "student" as const },
      params: { id: OTHER },
    });
    const user = (res._json as { user: Record<string, unknown> }).user;
    expect(user).not.toHaveProperty("country_of_origin");
    expect(user.full_name).toBe("Ama Owusu"); // the profile still works
  });

  it("returns country_of_origin once shared", async () => {
    queryOne.mockResolvedValueOnce({ ...row, share_country_of_origin: true });
    const res = await callRoute(usersRouter, "get", "/:id", {
      user: { sub: ME, firebaseUid: "f", email: "a@b.com", role: "student" as const },
      params: { id: OTHER },
    });
    expect((res._json as { user: Record<string, unknown> }).user.country_of_origin).toBe("Ghana");
  });

  it("collapses verification_status to a boolean for other users", async () => {
    // The raw value distinguishes "rejected" — i.e. suspended — which is
    // nobody else's business.
    queryOne.mockResolvedValueOnce({ ...row, verification_status: "rejected" });
    const res = await callRoute(usersRouter, "get", "/:id", {
      user: { sub: ME, firebaseUid: "f", email: "a@b.com", role: "student" as const },
      params: { id: OTHER },
    });
    const user = (res._json as { user: Record<string, unknown> }).user;
    expect(user).not.toHaveProperty("verification_status");
    expect(user.is_verified).toBe(false);
  });

  it("gives admins and the user themselves the full record", async () => {
    for (const viewer of [
      { sub: OTHER, role: "student" as const }, // self
      { sub: ME, role: "admin" as const },
    ]) {
      queryOne.mockResolvedValueOnce(row);
      const res = await callRoute(usersRouter, "get", "/:id", {
        user: { ...viewer, firebaseUid: "f", email: "a@b.com" },
        params: { id: OTHER },
      });
      const user = (res._json as { user: Record<string, unknown> }).user;
      expect(user.country_of_origin).toBe("Ghana");
      expect(user.verification_status).toBe("verified");
    }
  });
});

// ── GB-06 ───────────────────────────────────────────────────────────────────
describe("GB-06 — register-profile is a one-shot", () => {
  type ExistingRow = { id: string; role: string; profile_completed_at: string | null };
  const call = (role: string, existing: ExistingRow) => {
    queryOne.mockResolvedValueOnce(existing);                      // SELECT existing
    // What the upsert returns: the stored role on a replay, the requested one
    // on a genuine first registration — mirroring the SQL's CASE expression.
    queryOne.mockResolvedValueOnce({ id: ME, role: existing.profile_completed_at ? existing.role : role });
    return callRoute(authRouter, "post", "/register-profile", {
      user: { sub: ME, firebaseUid: "fb-1", email: "s@e.com", role: "student" as const },
      body: { full_name: "Test Student", role, country_of_origin: "Ghana" },
    });
  };

  it("honours the requested role on a genuine first registration", async () => {
    await call("mentor", { id: ME, role: "student", profile_completed_at: null });
    const upsert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO users"))!;
    expect(String(upsert[0])).toContain("users.profile_completed_at IS NULL");
    expect(setCustomUserClaims).toHaveBeenCalledWith("fb-1", { role: "mentor" });
  });

  it("keeps the stored role on a replay, whatever the body asks for", async () => {
    await call("employer", { id: ME, role: "student", profile_completed_at: "2026-01-01T00:00:00Z" });
    // The SQL itself must refuse — not a JS branch that a later edit could skip.
    const upsert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO users"))!;
    expect(String(upsert[0])).toMatch(/role = CASE WHEN users\.profile_completed_at IS NULL/);
    // And the Firebase claim mirrors the stored role, not the attempt.
    expect(setCustomUserClaims).toHaveBeenCalledWith("fb-1", { role: "student" });
  });

  it("audit-logs a refused escalation attempt", async () => {
    await call("employer", { id: ME, role: "student", profile_completed_at: "2026-01-01T00:00:00Z" });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.role_change_rejected",
        metadata: expect.objectContaining({ attempted_role: "employer", current_role: "student" }),
      }),
    );
  });

  it("stays quiet when the replay asks for the role it already has", async () => {
    await call("student", { id: ME, role: "student", profile_completed_at: "2026-01-01T00:00:00Z" });
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

// ── GB-07 ───────────────────────────────────────────────────────────────────
describe("GB-07 — moderated listings are not readable by direct URL", () => {
  const listing = (status: string) => ({
    id: "l1", landlord_id: OTHER, title: "Shared apartment in Mitte",
    address: "Linienstraße 12, Berlin", status,
  });

  const fetchAs = (viewer: { sub: string; role: string } | null, status: string) => {
    queryOne.mockResolvedValueOnce(listing(status));
    return callRoute(housingRouter, "get", "/:id", {
      ...(viewer ? { user: { ...viewer, firebaseUid: "f", email: "a@b.com" } } : {}),
      params: { id: "l1" },
    } as Partial<Request>);
  };

  it("404s an archived listing for an anonymous visitor", async () => {
    const res = await fetchAs(null, "archived");
    expect(res._status).toBe(404);
    expect(JSON.stringify(res._json)).not.toContain("Linienstraße");
  });

  it("404s a pending_review listing for a signed-in stranger", async () => {
    const res = await fetchAs({ sub: ME, role: "student" }, "pending_review");
    expect(res._status).toBe(404);
  });

  it("still serves an active listing to anonymous visitors", async () => {
    const res = await fetchAs(null, "active");
    expect(res._status).toBe(200);
  });

  it("lets the landlord and an admin see their own non-active listing", async () => {
    expect((await fetchAs({ sub: OTHER, role: "student" }, "archived"))._status).toBe(200);
    expect((await fetchAs({ sub: ME, role: "admin" }, "archived"))._status).toBe(200);
  });

  it("keeps optionalAuth so anonymous browsing still works", () => {
    expect(guardsOn(housingRouter, "get", "/:id")).toContain("optionalAuth");
  });
});

// ── GB-11 ───────────────────────────────────────────────────────────────────
describe("GB-11 — scam alerts are reviewed before publication", () => {
  it("the public feed only returns approved alerts", async () => {
    await callRoute(moderationRouter, "get", "/scam-alerts", {});
    expect(String(query.mock.calls[0][0])).toContain("verified_by_admin = TRUE");
  });

  it("a submission is not published, and says so", async () => {
    queryOne.mockResolvedValueOnce({ id: "a1", verified_by_admin: false });
    const res = await callRoute(moderationRouter, "post", "/scam-alerts", {
      user: { sub: ME, firebaseUid: "f", email: "a@b.com", role: "student" as const },
      body: { title: "A scam listing", description: "x".repeat(30), scam_type: "housing" },
    });
    expect(res._status).toBe(201);
    expect(res._json).toMatchObject({ pending_review: true });
    // Nothing in the INSERT may set verified_by_admin.
    const insert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO scam_alerts"))!;
    expect(String(insert[0])).not.toContain("verified_by_admin");
  });

  it("has an admin approval path that is the only way to publish", async () => {
    queryOne.mockResolvedValueOnce({ id: "a1" });
    const res = await callRoute(moderationRouter, "post", "/scam-alerts/:id/approve", {
      user: { sub: ME, firebaseUid: "f", email: "a@b.com", role: "admin" as const },
      params: { id: "a1" },
    });
    expect(res._status).not.toBe(404);
    expect(String(queryOne.mock.calls[0][0])).toContain("verified_by_admin = TRUE");
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "scam_alert.approve" }));
  });

  it("has a takedown path for an already-published accusation", async () => {
    queryOne.mockResolvedValueOnce({ id: "a1", title: "Named person is a fraud", reported_by: OTHER });
    const res = await callRoute(moderationRouter, "delete", "/scam-alerts/:id", {
      user: { sub: ME, firebaseUid: "f", email: "a@b.com", role: "admin" as const },
      params: { id: "a1" },
      body: { reason: "unsubstantiated" },
    });
    expect(res._json).toMatchObject({ ok: true });
    expect(String(queryOne.mock.calls[0][0])).toContain("DELETE FROM scam_alerts");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "scam_alert.takedown", metadata: expect.objectContaining({ reason: "unsubstantiated" }) }),
    );
  });

  it("both moderation routes are admin-gated", () => {
    for (const [m, p] of [["post", "/scam-alerts/:id/approve"], ["delete", "/scam-alerts/:id"], ["get", "/scam-alerts/pending"]] as const) {
      expect(guardsOn(moderationRouter, m, p), `${m} ${p}`).toContain("requireRoleInner");
    }
  });

  it("lets a submitter see their own pending alert", async () => {
    await callRoute(moderationRouter, "get", "/scam-alerts/mine", {
      user: { sub: ME, firebaseUid: "f", email: "a@b.com", role: "student" as const },
    });
    expect(String(query.mock.calls[0][0])).toContain("reported_by = $1");
    expect(query.mock.calls[0][1]).toEqual([ME]);
  });
});
