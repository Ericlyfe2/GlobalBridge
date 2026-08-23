/**
 * Phase 7 regression guards — GB-13, GB-15, GB-12.
 *
 * GB-13  express-rate-limit keyed on req.ip with no `trust proxy`, so behind
 *        Railway/Vercel every user shared one 1200/15min bucket. Ten distinct
 *        clients drew down the same counter.
 * GB-15  /health returned a hardcoded 200. An instance with an unreachable
 *        database answered "ok" while every real request 500'd.
 * GB-12  A missing brace made params.push(status) unconditional, so
 *        ?status=suspended sent more parameters than the SQL had placeholders.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";
import type { Options } from "express-rate-limit";

const query = vi.fn();
const queryOne = vi.fn();
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));
vi.mock("../middleware/auth", () => ({
  requireAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  optionalAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  requireRole: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  requireAdmin: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  isAdmin: () => true,
  clearUserCache: vi.fn(),
}));
vi.mock("../lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("../lib/firebase-admin", () => ({
  adminAuth: { deleteUser: vi.fn(), revokeRefreshTokens: vi.fn(), setCustomUserClaims: vi.fn() },
}));

import { usersRouter } from "../routes/users";
import { RedisRateLimitStore, trustProxyHops } from "../lib/rate-limit-store";

// ── GB-13 ───────────────────────────────────────────────────────────────────
describe("GB-13 — trust proxy hop count", () => {
  it("trusts exactly one hop in production", () => {
    expect(trustProxyHops({ NODE_ENV: "production" })).toBe(1);
  });

  it("trusts none in development, where there is no proxy", () => {
    expect(trustProxyHops({ NODE_ENV: "development" })).toBe(0);
  });

  it("is overridable for deployments with a CDN in front", () => {
    expect(trustProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: "2" })).toBe(2);
    expect(trustProxyHops({ TRUST_PROXY_HOPS: "0" })).toBe(0);
  });

  it("never yields `true`, which would trust a client-written header", () => {
    // Trusting the whole X-Forwarded-For chain lets anyone mint a fresh bucket
    // per request by prepending a fake hop — the opposite failure to the one
    // being fixed, and a worse one.
    for (const env of [{}, { NODE_ENV: "production" }, { TRUST_PROXY_HOPS: "junk" }]) {
      const v = trustProxyHops(env);
      expect(typeof v).toBe("number");
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("GB-13 — Redis rate-limit store", () => {
  /** Minimal in-memory stand-in for the ioredis commands the store uses. */
  function fakeRedis() {
    const values = new Map<string, number>();
    const ttls = new Map<string, number>();
    const client = {
      multi() {
        const ops: (() => [null, unknown])[] = [];
        const chain = {
          incr(k: string) {
            ops.push(() => { const v = (values.get(k) ?? 0) + 1; values.set(k, v); return [null, v]; });
            return chain;
          },
          pttl(k: string) {
            ops.push(() => [null, ttls.get(k) ?? -1]);
            return chain;
          },
          async exec() { return ops.map((op) => op()); },
        };
        return chain;
      },
      async pexpire(k: string, ms: number) { ttls.set(k, ms); return 1; },
      async decr(k: string) { const v = (values.get(k) ?? 0) - 1; values.set(k, v); return v; },
      async del(k: string) { values.delete(k); ttls.delete(k); return 1; },
    };
    return { client, values, ttls };
  }

  const store = (c: ReturnType<typeof fakeRedis>["client"], prefix = "rl:") => {
    const s = new RedisRateLimitStore(c as never, prefix);
    s.init({ windowMs: 60_000 } as Options);
    return s;
  };

  it("counts hits per key", async () => {
    const { client } = fakeRedis();
    const s = store(client);
    expect((await s.increment("1.2.3.4")).totalHits).toBe(1);
    expect((await s.increment("1.2.3.4")).totalHits).toBe(2);
    expect((await s.increment("5.6.7.8")).totalHits).toBe(1); // separate client, separate budget
  });

  it("sets a TTL on the first hit so a key cannot pin a client forever", async () => {
    const { client, ttls } = fakeRedis();
    const s = store(client, "rl:test:");
    await s.increment("k");
    expect(ttls.get("rl:test:k")).toBe(60_000);
  });

  it("reports a resetTime inside the window", async () => {
    const { client } = fakeRedis();
    const info = await store(client).increment("k");
    expect(info.resetTime!.getTime()).toBeGreaterThan(Date.now());
    expect(info.resetTime!.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("namespaces by prefix so per-route limiters do not share a counter", async () => {
    const { client, values } = fakeRedis();
    await store(client, "rl:auth:").increment("ip");
    await store(client, "rl:upload:").increment("ip");
    expect([...values.keys()].sort()).toEqual(["rl:auth:ip", "rl:upload:ip"]);
  });

  it("supports decrement and reset", async () => {
    const { client, values } = fakeRedis();
    const s = store(client, "rl:x:");
    await s.increment("k");
    await s.increment("k");
    await s.decrement("k");
    expect(values.get("rl:x:k")).toBe(1);
    await s.resetKey("k");
    expect(values.has("rl:x:k")).toBe(false);
  });
});

// ── GB-15 ───────────────────────────────────────────────────────────────────
describe("GB-15 — readiness reflects real dependency state", () => {
  beforeEach(() => vi.resetModules());

  it("is degraded when Postgres is unreachable", async () => {
    vi.doMock("../db", () => ({
      pool: { query: async () => { throw new Error("ECONNREFUSED"); } },
      redis: null,
    }));
    const { collectHealth } = await import("../lib/health");
    const report = await collectHealth();
    expect(report.overall).toBe("degraded");
    const pg = report.services.find((s) => s.name === "postgres")!;
    expect(pg.status).toBe("down");
    expect(pg.detail).toContain("ECONNREFUSED"); // the breakdown names the cause
  });

  it("is healthy when Postgres answers, with Redis merely not configured", async () => {
    vi.doMock("../db", () => ({ pool: { query: async () => ({ rows: [] }) }, redis: null }));
    const { collectHealth } = await import("../lib/health");
    const report = await collectHealth();
    expect(report.overall).toBe("healthy");
    expect(report.services.find((s) => s.name === "redis")!.status).toBe("not_configured");
  });

  it("stays ready when only Redis is down, since every Redis feature degrades", async () => {
    vi.doMock("../db", () => ({
      pool: { query: async () => ({ rows: [] }) },
      redis: { ping: async () => { throw new Error("redis gone"); } },
    }));
    const { collectHealth } = await import("../lib/health");
    const report = await collectHealth();
    expect(report.overall).toBe("healthy");
    expect(report.services.find((s) => s.name === "redis")!.status).toBe("down");
  });

  it("excludes the dead AI probe, which would pin readiness at 503 forever", async () => {
    vi.doMock("../db", () => ({ pool: { query: async () => ({ rows: [] }) }, redis: null }));
    const { collectHealth } = await import("../lib/health");
    const report = await collectHealth();
    expect(report.services.map((s) => s.name)).toEqual(["postgres", "redis"]);
  });
});

// ── GB-12 ───────────────────────────────────────────────────────────────────
describe("GB-12 — admin user filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryOne.mockResolvedValue({ total: 0 });
    query.mockResolvedValue([]);
  });

  async function listUsers(q: Record<string, string>) {
    const res = { status: vi.fn(() => res), json: vi.fn(() => res), set: vi.fn(() => res) } as never;
    const next = vi.fn((e?: unknown) => { if (e) throw e; }) as unknown as NextFunction;
    type Layer = { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (q: Request, s: Response, n: NextFunction) => unknown }[] } };
    for (const layer of (usersRouter as unknown as { stack: Layer[] }).stack) {
      const r = layer.route;
      if (!r || r.path !== "/" || !r.methods.get) continue;
      for (let i = 0; i < r.stack.length; i++) {
        await r.stack[i].handle({ query: q, user: { sub: "a", role: "admin" } } as unknown as Request, res, next);
      }
      break;
    }
  }

  /** Distinct $n placeholders in a statement. */
  const placeholderCount = (sql: string) => new Set(sql.match(/\$\d+/g) ?? []).size;

  // Every combination an admin can produce from the UI's filter controls.
  const COMBINATIONS: Record<string, string>[] = [];
  for (const status of ["", "pending", "verified", "suspended"]) {
    for (const role of ["", "student", "mentor", "employer", "admin"]) {
      for (const search of ["", "ama"]) {
        const q: Record<string, string> = {};
        if (status) q.status = status;
        if (role) q.role = role;
        if (search) q.search = search;
        COMBINATIONS.push(q);
      }
    }
  }

  it(`binds parameters correctly for all ${COMBINATIONS.length} filter combinations`, async () => {
    const broken: string[] = [];
    for (const q of COMBINATIONS) {
      vi.clearAllMocks();
      queryOne.mockResolvedValue({ total: 0 });
      query.mockResolvedValue([]);
      await listUsers(q);

      // COUNT query: placeholders must match the params supplied.
      const [countSql, countParams] = queryOne.mock.calls[0] as [string, unknown[]];
      if (placeholderCount(countSql) !== countParams.length) {
        broken.push(`${JSON.stringify(q)} count: ${placeholderCount(countSql)} placeholders vs ${countParams.length} params`);
      }
      // Page query: same, plus the trailing limit/offset pair.
      const [pageSql, pageParams] = query.mock.calls[0] as [string, unknown[]];
      if (placeholderCount(pageSql) !== pageParams.length) {
        broken.push(`${JSON.stringify(q)} page: ${placeholderCount(pageSql)} placeholders vs ${pageParams.length} params`);
      }
    }
    expect(broken, `parameter/placeholder mismatches:\n  ${broken.join("\n  ")}`).toEqual([]);
  });

  it("maps 'suspended' to the rejected verification status without binding it", async () => {
    await listUsers({ status: "suspended" });
    const [sql, params] = queryOne.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("u.verification_status = 'rejected'");
    expect(params).not.toContain("suspended");
    expect(params).toEqual([]);
  });

  it("binds the search term to the search placeholder, not a leftover status", async () => {
    // The original bug did not merely throw: with the counts shifted, the
    // search placeholder could receive "suspended" instead of the search term.
    await listUsers({ status: "suspended", search: "ama" });
    const [sql, params] = queryOne.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("ILIKE $1");
    expect(params).toEqual(["%ama%"]);
  });
});
