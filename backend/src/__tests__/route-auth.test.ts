/**
 * Regression guard for the unauthenticated-AI-surface bug.
 *
 * /api/rag/search and /api/rag/embed used to be fully public, and /reembed-all
 * was requireAuth with no admin check — so any signed-in student could trigger a
 * synchronous re-embedding of the entire knowledge base, repeatedly, on the
 * platform's OpenAI key.
 *
 * This asserts the middleware is actually mounted on each route, by inspecting
 * the router stack rather than the source text, so it cannot be satisfied by a
 * comment or an unreachable guard.
 */

import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";

vi.mock("../db", () => ({ query: vi.fn(), queryOne: vi.fn(), pool: {}, redis: null }));
vi.mock("../lib/embeddings", () => ({ getEmbedding: vi.fn(), generateEmbedding: vi.fn() }));
// Named function expressions: the assertions below identify middleware by
// Function.name, and vi.mock factories are hoisted so no helper can be used here.
vi.mock("../middleware/auth", () => ({
  requireAuth: function requireAuth(_q: Request, _s: Response, n: NextFunction) { n(); },
  requireAdmin: () => function requireAdminInner(_q: Request, _s: Response, n: NextFunction) { n(); },
  requireRole: () => function requireRoleInner(_q: Request, _s: Response, n: NextFunction) { n(); },
  clearUserCache: vi.fn(),
  isAdmin: () => false,
}));

import { ragRouter } from "../routes/rag";

type Layer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: { handle: { name?: string } }[];
  };
};

/** Names of the middleware mounted ahead of the handler for a route. */
function guardsOn(router: Router, method: string, path: string): string[] {
  for (const layer of (router as unknown as { stack: Layer[] }).stack) {
    const route = layer.route;
    if (!route || route.path !== path || !route.methods[method]) continue;
    return route.stack.slice(0, -1).map((s) => s.handle?.name ?? "");
  }
  throw new Error(`route not found: ${method.toUpperCase()} ${path}`);
}

describe("RAG routes are gated", () => {
  it("POST /search requires authentication", () => {
    // Every cache-missing query buys an OpenAI embedding and writes an unbounded
    // embedding_cache row. Anonymous access made both free to an attacker.
    expect(guardsOn(ragRouter, "post", "/search")).toContain("requireAuth");
  });

  it("POST /embed requires an admin", () => {
    const guards = guardsOn(ragRouter, "post", "/embed");
    expect(guards).toContain("requireAuth");
    expect(guards).toContain("requireAdminInner");
  });

  it("POST /reembed-all requires an admin, not merely a signed-in user", () => {
    const guards = guardsOn(ragRouter, "post", "/reembed-all");
    expect(guards).toContain("requireAuth");
    expect(guards).toContain("requireAdminInner");
  });

  it("GET /stats requires an admin", () => {
    expect(guardsOn(ragRouter, "get", "/stats")).toContain("requireAdminInner");
  });

  it("no RAG route is left publicly reachable", () => {
    for (const layer of (ragRouter as unknown as { stack: Layer[] }).stack) {
      const route = layer.route;
      if (!route) continue;
      const guards = route.stack.slice(0, -1).map((s) => s.handle?.name ?? "");
      expect(
        guards,
        `${Object.keys(route.methods)[0]?.toUpperCase()} /api/rag${route.path} has no auth middleware`,
      ).toContain("requireAuth");
    }
  });
});
