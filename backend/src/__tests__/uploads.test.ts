/**
 * GB-10 — uploads were unmetered, content-unverified, and on ephemeral disk.
 *
 * The deployment is a Dockerfile on Railway with no VOLUME declared, and
 * storage wrote to process.cwd()/uploads. Every redeploy gave the container a
 * fresh filesystem, so verification documents — passport scans, bank statements
 * — were destroyed on each deploy while their user_documents rows survived,
 * pointing at files that no longer existed.
 *
 * Alongside that: the stored MIME type came from the client with no magic-byte
 * check, and size_bytes was written once and never summed, so there was no
 * per-user quota of any kind.
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
  requireAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  requireRole: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  requireAdmin: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  isAdmin: (role: string) => role === "admin" || role === "super_admin",
  clearUserCache: vi.fn(),
}));

const save = vi.fn();
const remove = vi.fn();
vi.mock("../lib/storage", () => ({
  storage: { save: (...a: unknown[]) => save(...a), remove: (...a: unknown[]) => remove(...a) },
  UPLOAD_PATH: "/tmp/uploads",
}));

import { uploadsRouter } from "../routes/uploads";
import { sniffFileType, MAX_BYTES, PER_USER_QUOTA_BYTES } from "../lib/file-type";

// ── real magic bytes ────────────────────────────────────────────────────────
const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(64)]);
const JPEG = Buffer.concat([Buffer.from("ffd8ff", "hex"), Buffer.alloc(64)]);
const GIF = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(64)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(64)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(64)]);
const EXE = Buffer.concat([Buffer.from("4d5a90000300000004000000ffff0000", "hex"), Buffer.alloc(64)]);
const HTML = Buffer.concat([Buffer.from("<!DOCTYPE html><script>alert(1)</script>"), Buffer.alloc(16)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const b64 = (b: Buffer) => b.toString("base64");
const ME = "aaaaaaaa-0000-0000-0000-000000000001";

function mockRes() {
  const res = { _status: 200, _json: undefined as unknown } as {
    _status: number; _json: unknown;
    status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>; type: ReturnType<typeof vi.fn>; sendFile: ReturnType<typeof vi.fn>;
    redirect: ReturnType<typeof vi.fn>;
  };
  res.status = vi.fn((c: number) => { res._status = c; return res; });
  res.json = vi.fn((b: unknown) => { res._json = b; return res; });
  res.set = vi.fn(() => res);
  res.type = vi.fn(() => res);
  res.sendFile = vi.fn(() => res);
  res.redirect = vi.fn((u: string) => { res._json = { redirect: u }; return res; });
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
      if (res.status.mock.calls.length > 0 || res.json.mock.calls.length > 0 || res.redirect.mock.calls.length > 0) break;
    }
    break;
  }
  if (!matched) throw new Error(`route not found: ${method.toUpperCase()} ${path}`);
  return { res, errors };
}

const upload = (body: unknown) =>
  callRoute(uploadsRouter, "post", "/", {
    user: { sub: ME, firebaseUid: "fb", email: "a@b.com", role: "student" as const },
    body,
  });

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue([]);
  // Default: user has used no storage yet.
  queryOne.mockResolvedValue({ used: "0" });
  save.mockResolvedValue({ key: "k1.png", url: "/api/uploads/files/k1.png" });
});

// ── magic-byte sniffing ─────────────────────────────────────────────────────
describe("sniffFileType reads the bytes, not the client's claim", () => {
  it("identifies real formats", () => {
    expect(sniffFileType(PNG)).toBe("image/png");
    expect(sniffFileType(JPEG)).toBe("image/jpeg");
    expect(sniffFileType(GIF)).toBe("image/gif");
    expect(sniffFileType(WEBP)).toBe("image/webp");
    expect(sniffFileType(PDF)).toBe("application/pdf");
  });

  it("returns null for content it cannot vouch for", () => {
    expect(sniffFileType(EXE)).toBeNull();
    expect(sniffFileType(HTML)).toBeNull();
    expect(sniffFileType(SVG)).toBeNull(); // SVG is script-bearing XML — never an allowed image here
    expect(sniffFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe("POST /api/uploads — content verification", () => {
  it("rejects a Windows executable renamed to .png", async () => {
    const { res } = await upload({ purpose: "avatar", filename: "cat.png", mime: "image/png", data: b64(EXE) });
    expect(res._status).toBe(415);
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects a PDF that claims to be an image", async () => {
    const { res } = await upload({ purpose: "avatar", filename: "x.png", mime: "image/png", data: b64(PDF) });
    expect(res._status).toBe(415);
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects an SVG smuggled in as an image", async () => {
    const { res } = await upload({ purpose: "avatar", filename: "logo.png", mime: "image/png", data: b64(SVG) });
    expect(res._status).toBe(415);
    expect(save).not.toHaveBeenCalled();
  });

  it("accepts a genuine PNG and stores the sniffed type, not the claimed one", async () => {
    const { res } = await upload({ purpose: "avatar", filename: "me.png", mime: "image/png", data: b64(PNG) });
    expect(res._status).toBe(201);
    expect(save).toHaveBeenCalledOnce();
    // The mime persisted to user_documents must be the detected one.
    const insert = queryOne.mock.calls.find((c) => String(c[0]).includes("INSERT INTO user_documents"));
    expect(insert).toBeTruthy();
    expect((insert![1] as unknown[])).toContain("image/png");
  });

  it("accepts a genuine PDF for a document purpose", async () => {
    const { res } = await upload({ purpose: "verification", filename: "passport.pdf", mime: "application/pdf", data: b64(PDF) });
    expect(res._status).toBe(201);
  });

  it("still enforces the per-purpose allow-list against the sniffed type", async () => {
    // A real PDF is fine for verification but not for an avatar.
    const { res } = await upload({ purpose: "avatar", filename: "x.pdf", mime: "application/pdf", data: b64(PDF) });
    expect(res._status).toBe(415);
    expect(save).not.toHaveBeenCalled();
  });
});

// ── quotas ──────────────────────────────────────────────────────────────────
describe("POST /api/uploads — quotas", () => {
  it("rejects a single file over the per-file limit", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_BYTES + 1024)]);
    const { res } = await upload({ purpose: "avatar", filename: "big.png", mime: "image/png", data: b64(big) });
    expect(res._status).toBe(413);
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects an upload that would take the user over their total quota", async () => {
    queryOne.mockResolvedValueOnce({ used: String(PER_USER_QUOTA_BYTES - 10) });
    const { res } = await upload({ purpose: "avatar", filename: "me.png", mime: "image/png", data: b64(PNG) });
    expect(res._status).toBe(413);
    expect(res._json).toMatchObject({ error: expect.stringMatching(/storage/i) });
    expect(save, "nothing may be written once the quota is exceeded").not.toHaveBeenCalled();
  });

  it("allows an upload that fits inside the remaining quota", async () => {
    queryOne.mockResolvedValueOnce({ used: "1024" });
    const { res } = await upload({ purpose: "avatar", filename: "me.png", mime: "image/png", data: b64(PNG) });
    expect(res._status).toBe(201);
  });

  it("sums only the caller's own documents when computing usage", async () => {
    await upload({ purpose: "avatar", filename: "me.png", mime: "image/png", data: b64(PNG) });
    const sumCall = queryOne.mock.calls.find((c) => String(c[0]).includes("SUM(size_bytes)"));
    expect(sumCall, "quota must be computed from a SUM over user_documents").toBeTruthy();
    expect(String(sumCall![0])).toContain("user_id = $1");
    expect(sumCall![1]).toEqual([ME]);
  });
});

// ── private documents are only released after an ownership check ────────────
describe("GET /api/uploads/files/:key — access control", () => {
  const OTHER = "bbbbbbbb-0000-0000-0000-000000000002";

  const fetchFile = (as: { sub: string; role: string }, doc: Record<string, string>) => {
    queryOne.mockResolvedValueOnce(doc);
    return callRoute(uploadsRouter, "get", "/files/:key", {
      user: { sub: as.sub, firebaseUid: "fb", email: "a@b.com", role: as.role as "student" },
      params: { key: "k1.png" },
    });
  };

  it("refuses another user's verification document", async () => {
    const { res } = await fetchFile(
      { sub: ME, role: "student" },
      { user_id: OTHER, purpose: "verification", mime: "application/pdf" },
    );
    expect(res._status).toBe(403);
    // Critically: no signed URL may be minted for an unauthorized caller.
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("releases the owner's own verification document", async () => {
    const { res } = await fetchFile(
      { sub: ME, role: "student" },
      { user_id: ME, purpose: "verification", mime: "application/pdf" },
    );
    expect(res._status).not.toBe(403);
  });

  it("lets an admin review a verification document", async () => {
    const { res } = await fetchFile(
      { sub: OTHER, role: "admin" },
      { user_id: ME, purpose: "verification", mime: "application/pdf" },
    );
    expect(res._status).not.toBe(403);
  });

  it("keeps avatars and listing photos readable by any signed-in user", async () => {
    for (const purpose of ["avatar", "housing"]) {
      const { res } = await fetchFile(
        { sub: OTHER, role: "student" },
        { user_id: ME, purpose, mime: "image/png" },
      );
      expect(res._status, `${purpose} should stay product-public`).not.toBe(403);
    }
  });

  it("404s an unknown key without revealing whether it ever existed", async () => {
    queryOne.mockResolvedValueOnce(null);
    const { res } = await callRoute(uploadsRouter, "get", "/files/:key", {
      user: { sub: ME, firebaseUid: "fb", email: "a@b.com", role: "student" as const },
      params: { key: "nope.png" },
    });
    expect(res._status).toBe(404);
  });
});
