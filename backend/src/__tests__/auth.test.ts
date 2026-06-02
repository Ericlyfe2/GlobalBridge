import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// Mock the Admin SDK so no real Firebase init happens.
const verifyIdToken = vi.fn();
vi.mock("../lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: (...a: unknown[]) => verifyIdToken(...a) },
  firestore: {},
}));

import { requireAuth } from "../middleware/auth";

function mockRes() {
  const res = {} as Response & { _status?: number; _json?: unknown };
  res.status = vi.fn().mockImplementation((c: number) => { res._status = c; return res; });
  res.json = vi.fn().mockImplementation((b: unknown) => { res._json = b; return res; });
  return res;
}

describe("requireAuth (Firebase)", () => {
  beforeEach(() => verifyIdToken.mockReset());

  it("rejects a request with no Authorization header", async () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("populates req.user from a verified token", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "abc123", email: "a@b.com", role: "mentor" });
    const req = { headers: { authorization: "Bearer good-token" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ sub: "abc123", email: "a@b.com", role: "mentor" });
  });

  it("defaults role to student when no custom claim is present", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "u2", email: "c@d.com" });
    const req = { headers: { authorization: "Bearer t" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(req.user?.role).toBe("student");
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
