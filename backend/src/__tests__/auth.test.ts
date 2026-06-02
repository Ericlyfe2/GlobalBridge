import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// Mock the Admin SDK and the DB layer so no real Firebase/Postgres is touched.
const verifyIdToken = vi.fn();
const queryOne = vi.fn();
const query = vi.fn();

vi.mock("../lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: (...a: unknown[]) => verifyIdToken(...a) },
}));
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));

import { requireAuth } from "../middleware/auth";

function mockRes() {
  const res = {} as Response & { _status?: number; _json?: unknown };
  res.status = vi.fn().mockImplementation((c: number) => { res._status = c; return res; });
  res.json = vi.fn().mockImplementation((b: unknown) => { res._json = b; return res; });
  return res;
}

describe("requireAuth (Firebase -> Postgres bridge)", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    queryOne.mockReset();
    query.mockReset();
  });

  it("rejects a request with no Authorization header", async () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("resolves an existing Postgres user and sets req.user to the pg uuid + role", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "fb-existing", email: "a@b.com" });
    queryOne.mockResolvedValueOnce({ id: "uuid-1", role: "mentor" }); // existing row
    const req = { headers: { authorization: "Bearer good" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ sub: "uuid-1", firebaseUid: "fb-existing", email: "a@b.com", role: "mentor" });
    expect(query).not.toHaveBeenCalled(); // no provisioning INSERT for an existing user
  });

  it("provisions a Postgres row on first sight, then resolves it", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "fb-new", email: "new@b.com", name: "New User" });
    queryOne
      .mockResolvedValueOnce(null) // first SELECT: no row yet
      .mockResolvedValueOnce({ id: "uuid-2", role: "student" }); // after INSERT
    query.mockResolvedValueOnce([]); // the INSERT
    const req = { headers: { authorization: "Bearer good" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(query).toHaveBeenCalledOnce(); // provisioned
    expect(req.user?.sub).toBe("uuid-2");
    expect(req.user?.firebaseUid).toBe("fb-new");
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 401 when token verification throws", async () => {
    verifyIdToken.mockRejectedValueOnce(new Error("expired"));
    const req = { headers: { authorization: "Bearer bad" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
