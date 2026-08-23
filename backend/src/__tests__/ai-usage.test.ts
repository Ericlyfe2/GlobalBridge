/**
 * GB-03 follow-on: the AI usage ledger and daily spend ceiling.
 *
 * ai_usage_log had nine read sites in routes/admin.ts and zero write sites, so
 * it was permanently empty — the admin AI observability console reported zeros
 * forever and nothing bounded per-user cost.
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
  clearUserCache: vi.fn(),
  isAdmin: () => false,
}));

import { aiRouter } from "../routes/ai";
import { costUsd, priceFor, FALLBACK_PRICE, DAILY_CEILING_USD } from "../lib/ai-pricing";

const ME = "aaaaaaaa-0000-0000-0000-000000000001";
const SOMEONE_ELSE = "bbbbbbbb-0000-0000-0000-000000000002";

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

const asUser = (body?: unknown) => ({
  user: { sub: ME, firebaseUid: "fb", email: "a@b.com", role: "student" as const },
  body,
  query: {},
  params: {},
});

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
});

describe("token → cost pricing", () => {
  it("prices a known model from its own rate card", () => {
    // gpt-4o-mini: $0.15/Mtok in, $0.60/Mtok out
    expect(costUsd("gpt-4o-mini", 1_000_000, 0)).toBeCloseTo(0.15, 6);
    expect(costUsd("gpt-4o-mini", 0, 1_000_000)).toBeCloseTo(0.6, 6);
    expect(costUsd("gpt-4o-mini", 500_000, 500_000)).toBeCloseTo(0.375, 6);
  });

  it("charges an unknown model at the conservative fallback, never zero", () => {
    // An unpriced model must not become an unmetered spend hole.
    expect(priceFor("some-model-shipped-next-year")).toEqual(FALLBACK_PRICE);
    expect(priceFor(null)).toEqual(FALLBACK_PRICE);
    expect(costUsd("some-model-shipped-next-year", 1_000_000, 0)).toBeGreaterThan(0);
    expect(costUsd(null, 1_000_000, 1_000_000)).toBeGreaterThan(costUsd("gpt-4o", 1_000_000, 1_000_000));
  });

  it("has a positive daily ceiling", () => {
    expect(DAILY_CEILING_USD).toBeGreaterThan(0);
  });
});

describe("POST /api/ai/usage", () => {
  it("attributes the row to the token's user, not anything in the body", async () => {
    // Otherwise a caller could bill their spend to someone else's daily budget.
    const res = await callRoute(aiRouter, "post", "/usage", asUser({
      user_id: SOMEONE_ELSE,
      feature: "scam-check",
      model: "gpt-4o-mini",
      input_tokens: 1200,
      output_tokens: 800,
    }));

    expect(res._status).toBe(201);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("INSERT INTO ai_usage_log");
    expect(params[0]).toBe(ME);
    expect(params).not.toContain(SOMEONE_ELSE);
    expect(params.slice(1, 6)).toEqual(["scam-check", "gpt-4o-mini", 1200, 800, false]);
  });

  it("rejects a malformed payload rather than writing a junk row", async () => {
    await expect(
      callRoute(aiRouter, "post", "/usage", asUser({ feature: "", input_tokens: -5 })),
    ).rejects.toBeTruthy();
    expect(query).not.toHaveBeenCalled();
  });
});

describe("GET /api/ai/usage/today", () => {
  it("scopes the sum to the caller and to today", async () => {
    await callRoute(aiRouter, "get", "/usage/today", asUser());
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM ai_usage_log");
    expect(sql).toContain("user_id = $1");
    expect(sql).toContain("date_trunc('day', NOW() AT TIME ZONE 'utc')");
    expect(params).toEqual([ME]);
  });

  it("prices each model separately when summing the day", async () => {
    query.mockResolvedValueOnce([
      { model: "gpt-4o-mini", in_tok: "1000000", out_tok: "0", calls: "3" },
      { model: "gpt-4o", in_tok: "1000000", out_tok: "0", calls: "1" },
    ]);
    const res = await callRoute(aiRouter, "get", "/usage/today", asUser());
    const body = res._json as { spent_usd: number; calls: number; exceeded: boolean };

    // 0.15 (mini) + 2.50 (4o) — not one blended rate applied to both.
    expect(body.spent_usd).toBeCloseTo(2.65, 6);
    expect(body.calls).toBe(4);
    expect(body.exceeded).toBe(true);
  });

  it("reports not-exceeded for a quiet day", async () => {
    query.mockResolvedValueOnce([{ model: "gpt-4o-mini", in_tok: "10000", out_tok: "5000", calls: "2" }]);
    const res = await callRoute(aiRouter, "get", "/usage/today", asUser());
    const body = res._json as { spent_usd: number; exceeded: boolean; resets_at: string };

    expect(body.exceeded).toBe(false);
    expect(body.spent_usd).toBeGreaterThan(0);
    expect(new Date(body.resets_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("reports zero, not an error, when the user has made no calls", async () => {
    const res = await callRoute(aiRouter, "get", "/usage/today", asUser());
    expect(res._json).toMatchObject({ spent_usd: 0, calls: 0, exceeded: false });
  });
});
