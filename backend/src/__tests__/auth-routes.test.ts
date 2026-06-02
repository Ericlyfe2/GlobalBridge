import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Mock firebase-admin so no real Firebase init happens.
// ---------------------------------------------------------------------------
const verifyIdToken = vi.fn();
const firestoreSet = vi.fn();
const firestoreGet = vi.fn();
const setCustomUserClaims = vi.fn();

// docRef factory controlled per test
const docRef = {
  get: () => firestoreGet(),
  set: (data: unknown) => firestoreSet(data),
};

vi.mock("../lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: (...a: unknown[]) => verifyIdToken(...a),
    setCustomUserClaims: (...a: unknown[]) => setCustomUserClaims(...a),
  },
  firestore: {
    collection: () => ({
      doc: () => docRef,
    }),
  },
}));

// Import AFTER mocks are set up.
import { authRouter } from "../routes/auth";

// ---------------------------------------------------------------------------
// Helpers to build fake req / res / next
// ---------------------------------------------------------------------------
interface FakeRes {
  _status: number;
  _json: unknown;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function mockRes(): FakeRes {
  const res = { _status: 0, _json: undefined } as FakeRes;
  res.status = vi.fn().mockImplementation((code: number) => {
    res._status = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((body: unknown) => {
    res._json = body;
    return res;
  });
  return res;
}

function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

/**
 * Find and call the route handler that matches method + path on `authRouter`.
 * `authRouter.stack` contains Express Layer objects; we iterate to find the one
 * whose regexp matches the path and whose route has the matching method.
 */
async function callRoute(
  method: "get" | "post",
  path: string,
  req: Partial<Request>,
): Promise<FakeRes> {
  const res = mockRes();
  const next = mockNext();

  // Attach user stub expected by requireAuth output (we bypass middleware here).
  const fullReq = req as Request;

  // Walk the router stack to find all layers for this method+path and call them.
  for (const layer of (authRouter as unknown as { stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (req: Request, res: Response, next: NextFunction) => unknown }[] } }[] }).stack) {
    const route = layer.route;
    if (!route) continue;
    if (route.path !== path) continue;
    if (!route.methods[method]) continue;

    // Run each handler in the route's stack, skipping requireAuth (index 0).
    for (let i = 1; i < route.stack.length; i++) {
      await route.stack[i].handle(fullReq, res as unknown as Response, next);
      // Stop if the response was sent (status was set).
      if ((res.status as ReturnType<typeof vi.fn>).mock.calls.length > 0 ||
          (res.json as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
        break;
      }
    }
    break;
  }

  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /register-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCustomUserClaims.mockResolvedValue(undefined);
    firestoreSet.mockResolvedValue(undefined);
  });

  it("creates a new profile (doc does not exist) → 201, calls set + setCustomUserClaims", async () => {
    firestoreGet.mockResolvedValue({ exists: false });

    const req: Partial<Request> = {
      user: { sub: "uid1", email: "user@example.com", role: "student" },
      body: {
        full_name: "Alice Smith",
        role: "mentor",
        country_of_origin: "NG",
      },
    };

    const res = await callRoute("post", "/register-profile", req);

    expect(res._status).toBe(201);
    expect(firestoreSet).toHaveBeenCalledOnce();
    // set should have been called with an object containing the right role
    expect(firestoreSet.mock.calls[0][0]).toMatchObject({ role: "mentor" });
    expect(setCustomUserClaims).toHaveBeenCalledOnce();
    expect(setCustomUserClaims).toHaveBeenCalledWith("uid1", { role: "mentor" });
  });

  it("is idempotent when the doc already exists → 200, still calls setCustomUserClaims (Fix 3 reconciliation)", async () => {
    const existingData = {
      email: "user@example.com",
      full_name: "Alice Smith",
      role: "mentor",
      country_of_origin: "NG",
      country_of_residence: null,
      avatar_url: null,
      bio: null,
      trust_score: 0,
      verification_status: "unverified",
      preferred_language: "en",
      created_at: "2024-01-01T00:00:00.000Z",
    };
    firestoreGet.mockResolvedValue({ exists: true, data: () => existingData });

    const req: Partial<Request> = {
      user: { sub: "uid1", email: "user@example.com", role: "mentor" },
      body: {
        full_name: "Alice Smith",
        role: "mentor",
        country_of_origin: "NG",
      },
    };

    const res = await callRoute("post", "/register-profile", req);

    expect(res._status).toBe(200);
    // set should NOT have been called again
    expect(firestoreSet).not.toHaveBeenCalled();
    // setCustomUserClaims MUST be called (the reconciliation added in Fix 3)
    expect(setCustomUserClaims).toHaveBeenCalledOnce();
    expect(setCustomUserClaims).toHaveBeenCalledWith("uid1", { role: "mentor" });
  });
});

describe("GET /me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the profile when the doc exists", async () => {
    const profileData = {
      email: "bob@example.com",
      full_name: "Bob Jones",
      role: "student",
    };
    firestoreGet.mockResolvedValue({ exists: true, data: () => profileData });

    const req: Partial<Request> = {
      user: { sub: "uid2", email: "bob@example.com", role: "student" },
    };

    const res = await callRoute("get", "/me", req);

    expect(res._status).toBe(0); // json() called directly (200 implicit)
    const body = res._json as { user: { id: string } };
    expect(body.user.id).toBe("uid2");
    expect(body.user).toMatchObject(profileData);
  });

  it("returns 404 when the doc does not exist", async () => {
    firestoreGet.mockResolvedValue({ exists: false });

    const req: Partial<Request> = {
      user: { sub: "uid3", email: "ghost@example.com", role: "student" },
    };

    const res = await callRoute("get", "/me", req);

    expect(res._status).toBe(404);
  });
});
