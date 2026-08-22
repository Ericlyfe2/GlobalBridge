/**
 * GB-08 regression guards — mentor booking.
 *
 * Booking accepted anything. Two students could hold the same mentor at the
 * same moment; a mentor who had switched themselves off still received
 * bookings; slot_date/slot_time were bare z.string() over a VARCHAR(10) column,
 * so "25:99" and "not-time" were stored verbatim; and no endpoint anywhere
 * could move a booking out of 'pending', which made Journey 3 — receive
 * booking, confirm booking — unimplementable.
 *
 * The overlap guarantee itself is enforced by a Postgres exclusion constraint
 * and is verified against the live database separately; these tests cover the
 * route behaviour around it, including that a 23P01 becomes a clean 409.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";

const query = vi.fn();
const queryOne = vi.fn();
const dispatchNotification = vi.fn();

vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));
vi.mock("../lib/push", () => ({
  dispatchNotification: (...a: unknown[]) => dispatchNotification(...a),
  pushEnabled: false,
}));
vi.mock("../lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("../lib/firebase-admin", () => ({
  adminAuth: { deleteUser: vi.fn(), revokeRefreshTokens: vi.fn(), setCustomUserClaims: vi.fn() },
}));
vi.mock("../middleware/auth", () => ({
  requireAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  optionalAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  requireRole: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  requireAdmin: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  isAdmin: () => false,
  clearUserCache: vi.fn(),
}));

import { contentRouter } from "../routes/content";
import { usersRouter } from "../routes/users";

const MENTOR = "11111111-1111-1111-1111-111111111111";
const STUDENT = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";
const FUTURE = "2027-03-15";

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

const asUser = (sub: string, body: unknown, params: Record<string, string> = {}) => ({
  user: { sub, firebaseUid: "fb", email: "a@b.com", role: "student" as const },
  body,
  params,
  query: {},
});

/** Default happy-path DB responses: mentor exists and is available, slot is future. */
function mentorAvailable(opts: { available?: boolean; declaredWindows?: number; fits?: number } = {}) {
  queryOne.mockReset();
  queryOne
    .mockResolvedValueOnce({ id: MENTOR, available: opts.available ?? true, timezone: "Africa/Accra" }) // mentor lookup
    .mockResolvedValueOnce({ starts_at: "2027-03-15T15:00:00.000Z", is_past: false });                  // instant
  if (opts.available === false) return;
  queryOne.mockResolvedValueOnce({ n: opts.declaredWindows ?? 0 });                                     // declared count
  if ((opts.declaredWindows ?? 0) > 0) queryOne.mockResolvedValueOnce({ n: opts.fits ?? 1 });           // fits window
  queryOne.mockResolvedValueOnce({ id: "b1", status: "pending" });                                      // insert
}

const book = (body: Record<string, unknown> = {}) =>
  callRoute(contentRouter, "post", "/bookings", asUser(STUDENT, {
    mentor_id: MENTOR, slot_date: FUTURE, slot_time: "15:00",
    duration_min: 30, student_timezone: "Africa/Accra", ...body,
  }));

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue([]);
});

// ── validation ──────────────────────────────────────────────────────────────
describe("GB-08 — booking payload validation", () => {
  it.each([
    ["25:99", "hour out of range"],
    ["99:99", "nonsense"],
    ["not-time", "not a time at all"],
    ["3pm", "human format"],
    ["", "empty"],
  ])("rejects slot_time %j (%s)", async (slot_time) => {
    mentorAvailable();
    const { errors } = await book({ slot_time });
    expect(errors.length, "must be rejected by the schema, not stored").toBeGreaterThan(0);
  });

  it.each([["15/03/2027"], ["2027-3-15"], ["tomorrow"], [""]])(
    "rejects slot_date %j", async (slot_date) => {
      mentorAvailable();
      const { errors } = await book({ slot_date });
      expect(errors.length).toBeGreaterThan(0);
    },
  );

  it("rejects a duration outside the sane range", async () => {
    mentorAvailable();
    expect((await book({ duration_min: 0 })).errors.length).toBeGreaterThan(0);
    vi.clearAllMocks(); mentorAvailable();
    expect((await book({ duration_min: 10_000 })).errors.length).toBeGreaterThan(0);
  });

  it("rejects a non-IANA timezone", async () => {
    mentorAvailable();
    const { errors } = await book({ student_timezone: "not a zone!!" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts a well-formed booking", async () => {
    mentorAvailable();
    const { res } = await book();
    expect(res._status).toBe(201);
  });
});

// ── availability ────────────────────────────────────────────────────────────
describe("GB-08 — availability", () => {
  it("refuses a mentor who has switched themselves off", async () => {
    mentorAvailable({ available: false });
    const { res } = await book();
    expect(res._status).toBe(409);
    expect(JSON.stringify(res._json)).toMatch(/isn't taking bookings/i);
  });

  it("refuses a slot outside the mentor's declared windows", async () => {
    mentorAvailable({ declaredWindows: 3, fits: 0 });
    const { res } = await book();
    expect(res._status).toBe(409);
    expect(res._json).toMatchObject({ mentor_timezone: "Africa/Accra" });
  });

  it("accepts a slot inside a declared window", async () => {
    mentorAvailable({ declaredWindows: 3, fits: 1 });
    const { res } = await book();
    expect(res._status).toBe(201);
  });

  it("treats a mentor with no published windows as open, not closed", async () => {
    // Enforcing an empty schedule would silently take every mentor offline
    // until they filled one in.
    mentorAvailable({ declaredWindows: 0 });
    const { res } = await book();
    expect(res._status).toBe(201);
  });

  it("compares the window in the mentor's timezone, not the student's", async () => {
    mentorAvailable({ declaredWindows: 1, fits: 1 });
    await book();
    const fitsCall = queryOne.mock.calls.find((c) => String(c[0]).includes("FROM mentor_availability a"))!;
    expect(String(fitsCall[0])).toContain("AT TIME ZONE $4");
    expect(fitsCall[1]).toContain("Africa/Accra"); // the mentor's zone
  });

  it("refuses a slot in the past", async () => {
    queryOne.mockReset();
    queryOne
      .mockResolvedValueOnce({ id: MENTOR, available: true, timezone: "UTC" })
      .mockResolvedValueOnce({ starts_at: "2020-01-01T09:00:00.000Z", is_past: true });
    const { res } = await book({ slot_date: "2020-01-01", slot_time: "09:00" });
    expect(res._status).toBe(400);
    expect(JSON.stringify(res._json)).toMatch(/already passed/i);
  });

  it("404s an unknown mentor", async () => {
    queryOne.mockReset().mockResolvedValueOnce(null);
    const { res } = await book();
    expect(res._status).toBe(404);
  });
});

// ── conflicts ───────────────────────────────────────────────────────────────
describe("GB-08 — slot conflicts", () => {
  it("turns the database's exclusion violation into a clean 409", async () => {
    queryOne.mockReset();
    queryOne
      .mockResolvedValueOnce({ id: MENTOR, available: true, timezone: "UTC" })
      .mockResolvedValueOnce({ starts_at: "2027-03-15T15:00:00.000Z", is_past: false })
      .mockResolvedValueOnce({ n: 0 })
      .mockRejectedValueOnce(Object.assign(new Error("conflicting key value violates exclusion constraint"), { code: "23P01" }));
    const { res } = await book();
    expect(res._status).toBe(409);
    expect(JSON.stringify(res._json)).toMatch(/just taken/i);
  });

  it("does not swallow unrelated database errors as conflicts", async () => {
    queryOne.mockReset();
    queryOne
      .mockResolvedValueOnce({ id: MENTOR, available: true, timezone: "UTC" })
      .mockResolvedValueOnce({ starts_at: "2027-03-15T15:00:00.000Z", is_past: false })
      .mockResolvedValueOnce({ n: 0 })
      .mockRejectedValueOnce(Object.assign(new Error("connection terminated"), { code: "08006" }));
    const { errors } = await book();
    expect(errors.length, "a connection failure must not read as 'slot taken'").toBeGreaterThan(0);
  });

  it("passes an explicit starts_at so the constraint can never be bypassed", async () => {
    mentorAvailable();
    await book();
    const insert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO mentor_bookings"))!;
    expect(String(insert[0])).toContain("starts_at");
    expect((insert[1] as unknown[])).toContain("2027-03-15T15:00:00.000Z");
  });
});

// ── lifecycle ───────────────────────────────────────────────────────────────
describe("GB-08 — booking lifecycle", () => {
  const patch = (actor: string, status: string, current: Record<string, unknown>) => {
    queryOne.mockReset();
    queryOne
      .mockResolvedValueOnce({ id: "b1", mentor_id: MENTOR, student_id: STUDENT, slot_date: FUTURE, slot_time: "15:00", ...current })
      .mockResolvedValueOnce({ id: "b1", status });
    return callRoute(contentRouter, "patch", "/bookings/:id", asUser(actor, { status }, { id: "b1" }));
  };

  it("lets the mentor confirm a pending booking", async () => {
    const { res } = await patch(MENTOR, "confirmed", { status: "pending" });
    expect(res._status).not.toBe(403);
    expect(res._json).toMatchObject({ booking: { status: "confirmed" } });
  });

  it("notifies the student when the mentor confirms", async () => {
    await patch(MENTOR, "confirmed", { status: "pending" });
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: STUDENT, kind: "mentor", title: expect.stringMatching(/confirmed/i) }),
    );
  });

  it("lets the mentor decline", async () => {
    const { res } = await patch(MENTOR, "declined", { status: "pending" });
    expect(res._status).not.toBe(403);
  });

  it("refuses to let the student confirm their own booking", async () => {
    const { res } = await patch(STUDENT, "confirmed", { status: "pending" });
    expect(res._status).toBe(403);
  });

  it("lets either party cancel", async () => {
    for (const actor of [MENTOR, STUDENT]) {
      const { res } = await patch(actor, "cancelled", { status: "confirmed" });
      expect(res._status, `${actor} should be able to cancel`).not.toBe(403);
    }
  });

  it("notifies the other party on cancellation, whoever cancelled", async () => {
    await patch(STUDENT, "cancelled", { status: "confirmed" });
    expect(dispatchNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: MENTOR }));
    vi.clearAllMocks();
    await patch(MENTOR, "cancelled", { status: "confirmed" });
    expect(dispatchNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: STUDENT }));
  });

  it("rejects an illegal transition rather than silently applying it", async () => {
    const { res } = await patch(MENTOR, "confirmed", { status: "cancelled" });
    expect(res._status).toBe(409);
    expect(res._json).toMatchObject({ current_status: "cancelled" });
  });

  it("only allows completion from confirmed", async () => {
    expect((await patch(MENTOR, "completed", { status: "pending" })).res._status).toBe(409);
    expect((await patch(MENTOR, "completed", { status: "confirmed" })).res._status).not.toBe(409);
  });

  it("404s a stranger rather than confirming the booking exists", async () => {
    const { res } = await patch(OTHER, "cancelled", { status: "pending" });
    expect(res._status).toBe(404);
  });

  it("rejects an unknown status value", async () => {
    queryOne.mockReset();
    const { errors } = await callRoute(contentRouter, "patch", "/bookings/:id",
      asUser(MENTOR, { status: "vanished" }, { id: "b1" }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ── availability endpoints ──────────────────────────────────────────────────
describe("GB-08 — mentor availability endpoints", () => {
  it("publishes windows and reports the mentor's timezone", async () => {
    queryOne.mockResolvedValueOnce({ timezone: "Africa/Accra" });
    query.mockResolvedValueOnce([{ weekday: 1, start_time: "09:00", end_time: "17:00" }]);
    const { res } = await callRoute(usersRouter, "get", "/mentors/:id/availability",
      asUser(STUDENT, undefined, { id: MENTOR }));
    expect(res._json).toMatchObject({ timezone: "Africa/Accra", unrestricted: false });
  });

  it("flags an empty schedule as unrestricted, matching how booking treats it", async () => {
    queryOne.mockResolvedValueOnce({ timezone: "UTC" });
    query.mockResolvedValueOnce([]);
    const { res } = await callRoute(usersRouter, "get", "/mentors/:id/availability",
      asUser(STUDENT, undefined, { id: MENTOR }));
    expect(res._json).toMatchObject({ unrestricted: true });
  });

  it("replaces the caller's windows wholesale", async () => {
    await callRoute(usersRouter, "put", "/me/availability", asUser(MENTOR, {
      timezone: "Africa/Accra",
      windows: [{ weekday: 1, start_time: "09:00", end_time: "12:00" }],
    }));
    const sqls = query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((q) => q.includes("DELETE FROM mentor_availability"))).toBe(true);
    expect(sqls.some((q) => q.includes("INSERT INTO mentor_availability"))).toBe(true);
  });

  it("rejects a window that ends before it starts", async () => {
    const { res } = await callRoute(usersRouter, "put", "/me/availability", asUser(MENTOR, {
      timezone: "UTC",
      windows: [{ weekday: 1, start_time: "17:00", end_time: "09:00" }],
    }));
    expect(res._status).toBe(400);
  });

  it("rejects an out-of-range weekday", async () => {
    const { errors } = await callRoute(usersRouter, "put", "/me/availability", asUser(MENTOR, {
      timezone: "UTC",
      windows: [{ weekday: 9, start_time: "09:00", end_time: "17:00" }],
    }));
    expect(errors.length).toBeGreaterThan(0);
  });
});
