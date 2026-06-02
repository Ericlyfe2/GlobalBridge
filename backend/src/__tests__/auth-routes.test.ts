import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Mock firebase-admin and the DB layer.
// ---------------------------------------------------------------------------
const setCustomUserClaims = vi.fn();
const queryOne = vi.fn();
const query = vi.fn();

vi.mock("../lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    setCustomUserClaims: (...a: unknown[]) => setCustomUserClaims(...a),
  },
}));
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));

// Import AFTER mocks are set up.
import { authRouter } from "../routes/auth";

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

// Walk the router stack, find the matching route, run handlers AFTER requireAuth (index 0).
async function callRoute(method: "get" | "post", path: string, req: Partial<Request>): Promise<FakeRes> {
  const res = mockRes();
  const next = vi.fn() as unknown as NextFunction;
  const fullReq = req as Request;
  for (const layer of (authRouter as unknown as { stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (req: Request, res: Response, next: NextFunction) => unknown }[] } }[] }).stack) {
    const route = layer.route;
    if (!route || route.path !== path || !route.methods[method]) continue;
    for (let i = 1; i < route.stack.length; i++) {
      await route.stack[i].handle(fullReq, res as unknown as Response, next);
      if ((res.status as ReturnType<typeof vi.fn>).mock.calls.length > 0 ||
          (res.json as ReturnType<typeof vi.fn>).mock.calls.length > 0) break;
    }
    break;
  }
  return res;
}

describe("POST /register-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCustomUserClaims.mockResolvedValue(undefined);
  });

  it("upserts the Postgres user → 201 with the profile and sets the role claim", async () => {
    const row = {
      id: "uuid-1", email: "user@example.com", full_name: "Alice Smith",
      role: "mentor", country_of_origin: "NG", trust_score: 0,
    };
    queryOne.mockResolvedValueOnce(row); // the INSERT ... RETURNING

    const req: Partial<Request> = {
      user: { sub: "uuid-1", firebaseUid: "fb-1", email: "user@example.com", role: "student" },
      body: { full_name: "Alice Smith", role: "mentor", country_of_origin: "NG" },
    };

    const res = await callRoute("post", "/register-profile", req);

    expect(res._status).toBe(201);
    expect(queryOne).toHaveBeenCalledOnce();
    expect(setCustomUserClaims).toHaveBeenCalledWith("fb-1", { role: "mentor" });
    expect(res._json).toMatchObject({ user: { id: "uuid-1", role: "mentor" } });
  });
});

describe("GET /me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with the Postgres profile when the row exists", async () => {
    const row = { id: "uuid-2", email: "bob@example.com", full_name: "Bob Jones", role: "student" };
    queryOne.mockResolvedValueOnce(row);

    const req: Partial<Request> = {
      user: { sub: "uuid-2", firebaseUid: "fb-2", email: "bob@example.com", role: "student" },
    };

    const res = await callRoute("get", "/me", req);

    expect(res._status).toBe(0); // json() called directly (implicit 200)
    expect((res._json as { user: { id: string } }).user.id).toBe("uuid-2");
  });

  it("returns 404 when no row exists", async () => {
    queryOne.mockResolvedValueOnce(null);

    const req: Partial<Request> = {
      user: { sub: "uuid-x", firebaseUid: "fb-x", email: "ghost@example.com", role: "student" },
    };

    const res = await callRoute("get", "/me", req);

    expect(res._status).toBe(404);
  });
});
