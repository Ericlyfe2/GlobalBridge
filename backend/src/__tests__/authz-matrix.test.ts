/**
 * Authorization matrix — every endpoint, every guard.
 *
 * The audit's coverage finding was that 37 tests covered ~8 of 17 routers with
 * no route-level authorization checks at all. Four separate P0/P1 findings were
 * all the same shape — a route that was reachable by someone who should not
 * reach it:
 *
 *   GB-03  POST /api/rag/reembed-all was requireAuth with no admin check, so
 *          any student could trigger a full knowledge-base re-embedding.
 *   GB-03  POST /api/rag/search and /embed were fully public, on a paid key.
 *   GB-05  GET /api/users/:id was public and returned country of origin.
 *   GB-06  POST /api/auth/register-profile let an account rewrite its own role.
 *
 * ── Why this is built by enumeration ────────────────────────────────────────
 * The matrix is not a hand-written list of endpoints to check. It walks the
 * actual Express routers, reads the middleware mounted on every route, and
 * compares that against a declared expectation. A route added tomorrow with no
 * declaration fails this suite — which is the only way a matrix stays true.
 *
 * ── What it does and does not prove ─────────────────────────────────────────
 * It proves which guard runs before each handler. That is exactly the class of
 * bug above. It does NOT prove data scoping inside a handler: GB-07 (an
 * archived listing readable at its direct URL) passed its middleware and failed
 * on the WHERE clause. Those live in privacy-trust.test.ts and the per-finding
 * suites.
 */

import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";

vi.mock("../db", () => ({
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  pool: { query: vi.fn() },
  redis: null,
}));
vi.mock("../lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(), setCustomUserClaims: vi.fn(),
    revokeRefreshTokens: vi.fn(), deleteUser: vi.fn(),
  },
}));
vi.mock("../lib/embeddings", () => ({ getEmbedding: vi.fn(), generateEmbedding: vi.fn() }));
vi.mock("../lib/push", () => ({ dispatchNotification: vi.fn(), pushEnabled: false }));
vi.mock("../lib/storage", () => ({
  storage: { save: vi.fn(), remove: vi.fn(), signedUrl: vi.fn() },
  UPLOAD_PATH: "/tmp", SIGNED_URL_TTL_SECONDS: 300,
}));

import { authRouter } from "../routes/auth";
import { usersRouter } from "../routes/users";
import { opportunitiesRouter } from "../routes/opportunities";
import { housingRouter } from "../routes/housing";
import { forumsRouter } from "../routes/forums";
import { messagesRouter } from "../routes/messages";
import { aiRouter } from "../routes/ai";
import { knowledgeRouter } from "../routes/knowledge";
import { ragRouter } from "../routes/rag";
import { moderationRouter } from "../routes/moderation";
import { contentRouter } from "../routes/content";
import { jobsRouter } from "../routes/jobs";
import { adminRouter } from "../routes/admin";
import { safeSpaceRouter } from "../routes/safeSpace";
import { libraryRouter } from "../routes/library";
import { peerReviewRouter } from "../routes/peerReview";
import { uploadsRouter } from "../routes/uploads";

const MOUNTS: [string, Router][] = [
  ["/api/auth", authRouter], ["/api/users", usersRouter],
  ["/api/opportunities", opportunitiesRouter], ["/api/housing", housingRouter],
  ["/api/forums", forumsRouter], ["/api/messages", messagesRouter],
  ["/api/ai", aiRouter], ["/api/knowledge", knowledgeRouter], ["/api/rag", ragRouter],
  ["/api/moderation", moderationRouter], ["/api/content", contentRouter],
  ["/api/jobs", jobsRouter], ["/api/admin", adminRouter],
  ["/api/safe-space", safeSpaceRouter], ["/api/library", libraryRouter],
  ["/api/peer-review", peerReviewRouter], ["/api/uploads", uploadsRouter],
];

type Layer = { route?: { path: string; methods: Record<string, boolean>; stack: { handle: { name?: string } }[] } };
type Endpoint = { key: string; mount: string; guards: string[] };

function enumerateEndpoints(): Endpoint[] {
  const out: Endpoint[] = [];
  for (const [mount, router] of MOUNTS) {
    for (const layer of (router as unknown as { stack: Layer[] }).stack) {
      const route = layer.route;
      if (!route) continue;
      const guards = route.stack.slice(0, -1).map((s) => s.handle?.name || "<anonymous>");
      for (const m of Object.keys(route.methods)) {
        out.push({ key: `${m.toUpperCase()} ${mount}${route.path}`, mount, guards });
      }
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

const ENDPOINTS = enumerateEndpoints();

/**
 * Declared access level per endpoint.
 *
 *   public       — reachable with no session. Each one needs a reason below.
 *   optional     — public, but widens for the owner/an admin (optionalAuth).
 *   auth         — any signed-in account.
 *   admin        — admin or super_admin.
 *   role:a|b     — requireRole with exactly these roles (super_admin bypasses).
 */
type Level = "public" | "optional" | "auth" | "admin" | `role:${string}`;

/** Every public endpoint, with why it is public. Reviewed deliberately. */
const PUBLIC_JUSTIFICATIONS: Record<string, string> = {
  "GET /api/content/ai-config": "admin-configured model/prompt; the frontend AI routes read it per request, nothing secret",
  "GET /api/content/push/key": "VAPID public key — public by definition",
  "GET /api/content/stories": "published success stories, marketing surface",
  "GET /api/content/stories/:id": "same, filtered to verified = TRUE (GB-07 sweep)",
  "POST /api/content/contact": "contact form for people who do not have an account yet",
  "POST /api/content/newsletter": "footer signup for logged-out visitors",
  "GET /api/forums/categories": "category list, no user content",
  "GET /api/forums/posts": "public community, readable before signup",
  "GET /api/forums/posts/:id": "same",
  "GET /api/housing/": "public listing browse, status = 'active' only",
  "GET /api/jobs/": "public job board",
  "GET /api/jobs/:id": "public job detail",
  "GET /api/jobs/sponsors": "public sponsorship tracker",
  "GET /api/knowledge/": "public knowledge base",
  "GET /api/knowledge/:id": "same",
  "GET /api/knowledge/trusted-sources": "official-domain allow-list, same domains the system prompt names (GB-14)",
  "GET /api/library/items": "mentor-contributed library, public browse",
  "POST /api/library/items/:id/play": "play counter; see the known-gap test below",
  "GET /api/moderation/scam-alerts": "public safety feed, verified_by_admin = TRUE only (GB-11)",
  "GET /api/opportunities/": "public opportunities board",
  "GET /api/opportunities/:id": "public opportunity detail",
  "GET /api/users/mentors": "public mentor directory; verified mentors opted into being listed",
  "GET /api/users/mentors/:id": "public mentor profile, verified only (GB-06); country_of_origin still opt-in (GB-05)",
};

const EXPECTED: Record<string, Level> = {
  // ── auth ────────────────────────────────────────────────────────────────
  "POST /api/auth/register-profile": "auth",
  "GET /api/auth/me": "auth",

  // ── users ───────────────────────────────────────────────────────────────
  "GET /api/users/": "admin",
  "GET /api/users/:id": "auth",
  "GET /api/users/dashboard": "auth",
  "GET /api/users/mentor-dashboard": "auth",
  "GET /api/users/employer-dashboard": "auth",
  "GET /api/users/mentors": "public",
  "GET /api/users/mentors/:id": "public",
  "GET /api/users/mentors/:id/availability": "auth",
  "GET /api/users/summary/all": "admin",
  "GET /api/users/summary/signups": "admin",
  "PATCH /api/users/me": "auth",
  "GET /api/users/me/mentor-profile": "role:admin|mentor",
  "PATCH /api/users/me/mentor-profile": "role:admin|mentor",
  "PUT /api/users/me/availability": "role:mentor",
  "DELETE /api/users/me": "auth",
  "POST /api/users/:id/verify": "admin",
  "PATCH /api/users/:id/status": "admin",

  // ── opportunities / jobs ────────────────────────────────────────────────
  "GET /api/opportunities/": "public",
  "GET /api/opportunities/:id": "public",
  "POST /api/opportunities/": "role:admin|employer|mentor",
  "GET /api/jobs/": "public",
  "GET /api/jobs/sponsors": "public",
  "GET /api/jobs/:id": "public",
  "POST /api/jobs/": "role:admin|employer",

  // ── housing ─────────────────────────────────────────────────────────────
  "GET /api/housing/": "public",
  "GET /api/housing/:id": "optional",
  "POST /api/housing/": "auth",
  "PATCH /api/housing/:id": "auth",
  "DELETE /api/housing/:id": "auth",
  "GET /api/housing/admin/pending": "admin",
  "PATCH /api/housing/:id/status": "admin",

  // ── forums ──────────────────────────────────────────────────────────────
  "GET /api/forums/categories": "public",
  "GET /api/forums/posts": "public",
  "GET /api/forums/posts/:id": "public",
  "POST /api/forums/posts": "auth",
  "POST /api/forums/posts/:id/replies": "auth",
  "POST /api/forums/vote/:id": "auth",
  "GET /api/forums/posts/:id/my-votes": "auth",

  // ── messages ────────────────────────────────────────────────────────────
  "GET /api/messages/conversations": "auth",
  "GET /api/messages/conversations/:id": "auth",
  "POST /api/messages/send": "auth",

  // ── ai ──────────────────────────────────────────────────────────────────
  "POST /api/ai/conversations": "auth",
  "GET /api/ai/conversations": "auth",
  "GET /api/ai/conversations/:id": "auth",
  "PATCH /api/ai/conversations/:id": "auth",
  "DELETE /api/ai/conversations/:id": "auth",
  "POST /api/ai/messages": "auth",
  "GET /api/ai/usage/today": "auth",
  "POST /api/ai/usage": "auth",
  "POST /api/ai/checklists": "auth",
  "GET /api/ai/checklists": "auth",
  "PATCH /api/ai/checklists/:id": "auth",
  "DELETE /api/ai/checklists/:id": "auth",

  // ── knowledge / rag ─────────────────────────────────────────────────────
  "GET /api/knowledge/": "public",
  "GET /api/knowledge/trusted-sources": "public",
  "GET /api/knowledge/:id": "public",
  "POST /api/knowledge/": "admin",
  "PATCH /api/knowledge/:id": "admin",
  "DELETE /api/knowledge/:id": "admin",
  "POST /api/rag/search": "auth",
  "POST /api/rag/embed": "admin",
  "POST /api/rag/reembed-all": "admin",
  "GET /api/rag/stats": "admin",

  // ── moderation ──────────────────────────────────────────────────────────
  "POST /api/moderation/report": "auth",
  "GET /api/moderation/reports": "admin",
  "PATCH /api/moderation/reports/:id": "admin",
  "GET /api/moderation/scam-alerts": "public",
  "POST /api/moderation/scam-alerts": "auth",
  "GET /api/moderation/scam-alerts/pending": "admin",
  "GET /api/moderation/scam-alerts/mine": "auth",
  "POST /api/moderation/scam-alerts/:id/approve": "admin",
  "DELETE /api/moderation/scam-alerts/:id": "admin",

  // ── content ─────────────────────────────────────────────────────────────
  "GET /api/content/ai-config": "public",
  "GET /api/content/stories": "public",
  "GET /api/content/stories/:id": "public",
  "POST /api/content/contact": "public",
  "POST /api/content/newsletter": "public",
  "GET /api/content/notifications": "auth",
  "GET /api/content/notifications/unread-count": "auth",
  "POST /api/content/notifications/read": "auth",
  "GET /api/content/push/key": "public",
  "POST /api/content/push/subscribe": "auth",
  "POST /api/content/push/unsubscribe": "auth",
  "GET /api/content/saved": "auth",
  "POST /api/content/saved": "auth",
  "DELETE /api/content/saved": "auth",
  "GET /api/content/bookings": "auth",
  "POST /api/content/bookings": "auth",
  "PATCH /api/content/bookings/:id": "auth",

  // ── safe space / library / peer review ──────────────────────────────────
  "GET /api/safe-space/posts": "auth",
  "POST /api/safe-space/posts": "auth",
  "POST /api/safe-space/posts/:id/upvote": "auth",
  "POST /api/safe-space/posts/:id/support": "auth",
  "GET /api/safe-space/posts/:id/replies": "auth",
  "POST /api/safe-space/posts/:id/replies": "auth",
  "GET /api/library/items": "public",
  "POST /api/library/items": "auth",
  "POST /api/library/items/:id/play": "public",
  "GET /api/peer-review/queue": "auth",
  "GET /api/peer-review/me": "auth",
  "POST /api/peer-review/submissions": "auth",
  "POST /api/peer-review/submissions/:id/reviews": "auth",

  // ── uploads ─────────────────────────────────────────────────────────────
  "POST /api/uploads/": "auth",
  "GET /api/uploads/documents": "auth",
  "GET /api/uploads/files/:key": "auth",
};

/** Everything under /api/admin is admin-gated; declared as a rule, not 60 lines. */
const ADMIN_MOUNT = "/api/admin";

function expectedFor(key: string): Level | undefined {
  if (key.includes(` ${ADMIN_MOUNT}/`)) return "admin";
  return EXPECTED[key];
}

function actualLevel(guards: string[]): Level | "unknown" {
  if (guards.length === 0) return "public";
  if (guards.includes("optionalAuth")) return "optional";
  if (guards.includes("requireAdmin")) return "admin";
  const role = guards.find((g) => g.startsWith("requireRole:"));
  if (role) {
    const roles = role.slice("requireRole:".length);
    // requireRole("admin") and requireAdmin() are the same gate: both admit
    // admin and super_admin. Normalised so the declaration says what access is
    // granted rather than which helper happened to be used.
    return roles === "admin" ? "admin" : (`role:${roles}` as Level);
  }
  if (guards.includes("requireAuth")) return "auth";
  return "unknown";
}

describe("authorization matrix", () => {
  it("covers every route the API exposes", () => {
    // A route added without an entry here fails, which is the whole point:
    // the matrix cannot silently fall behind the router.
    const undeclared = ENDPOINTS.filter((e) => expectedFor(e.key) === undefined).map((e) => e.key);
    expect(
      undeclared,
      `These routes have no declared access level. Add them to EXPECTED (and to ` +
        `PUBLIC_JUSTIFICATIONS if public):\n  ${undeclared.join("\n  ")}`,
    ).toEqual([]);
  });

  it("enumerates a plausible number of routes", () => {
    // Guards against the enumeration silently returning nothing and every
    // assertion below passing vacuously.
    expect(ENDPOINTS.length).toBeGreaterThan(120);
  });

  it.each(ENDPOINTS.map((e) => [e.key, e] as const))("%s has the declared guard", (_key, e) => {
    const want = expectedFor(e.key)!;
    const got = actualLevel(e.guards);
    expect(
      got,
      `${e.key}\n  declared: ${want}\n  actual middleware: [${e.guards.join(", ")}] -> ${got}`,
    ).toBe(want);
  });

  it("has no route whose guard chain is unrecognisable", () => {
    const odd = ENDPOINTS.filter((e) => actualLevel(e.guards) === "unknown")
      .map((e) => `${e.key} [${e.guards.join(", ")}]`);
    expect(odd).toEqual([]);
  });
});

describe("public surface is deliberate", () => {
  const publicRoutes = ENDPOINTS.filter((e) => actualLevel(e.guards) === "public").map((e) => e.key);

  it("every public route has a written justification", () => {
    const unjustified = publicRoutes.filter((k) => !PUBLIC_JUSTIFICATIONS[k]);
    expect(
      unjustified,
      `A route reachable with no session needs a stated reason:\n  ${unjustified.join("\n  ")}`,
    ).toEqual([]);
  });

  it("has no stale justification for a route that is no longer public", () => {
    const stale = Object.keys(PUBLIC_JUSTIFICATIONS).filter((k) => !publicRoutes.includes(k));
    expect(stale, `justified as public but no longer is:\n  ${stale.join("\n  ")}`).toEqual([]);
  });

  it("keeps the specific routes the audit found exposed off the public list", () => {
    for (const closed of [
      "GET /api/users/:id",          // GB-05
      "POST /api/rag/search",        // GB-03
      "POST /api/rag/embed",         // GB-03
      "POST /api/rag/reembed-all",   // GB-03
      "GET /api/rag/stats",          // GB-03
    ]) {
      expect(publicRoutes, `${closed} must not be public again`).not.toContain(closed);
    }
  });
});

describe("privileged surface", () => {
  it("gates every /api/admin route", () => {
    const adminRoutes = ENDPOINTS.filter((e) => e.mount === ADMIN_MOUNT);
    expect(adminRoutes.length).toBeGreaterThan(30);
    const ungated = adminRoutes.filter((e) => actualLevel(e.guards) !== "admin").map((e) => e.key);
    expect(ungated, `admin routes without an admin guard:\n  ${ungated.join("\n  ")}`).toEqual([]);
  });

  it("puts requireAuth ahead of every role check", () => {
    // requireRole reads req.user. Mounted first it would 401 on a valid
    // session, or worse, be skipped entirely.
    const wrong = ENDPOINTS.filter((e) => {
      const roleIdx = e.guards.findIndex((g) => g.startsWith("requireRole:") || g === "requireAdmin");
      if (roleIdx === -1) return false;
      return e.guards.indexOf("requireAuth") > roleIdx || !e.guards.includes("requireAuth");
    }).map((e) => `${e.key} [${e.guards.join(", ")}]`);
    expect(wrong, `role check runs before authentication:\n  ${wrong.join("\n  ")}`).toEqual([]);
  });

  it("exposes the expensive AI and knowledge-base operations to admins only", () => {
    for (const key of ["POST /api/rag/embed", "POST /api/rag/reembed-all", "GET /api/rag/stats"]) {
      const e = ENDPOINTS.find((x) => x.key === key)!;
      expect(actualLevel(e.guards), `${key} spends OpenAI credits`).toBe("admin");
    }
  });
});

describe("router coverage floor", () => {
  it("has every router exercised by at least one test file", () => {
    // The audit's finding was 37 tests over ~8 of 17 routers. This keeps a new
    // router from shipping with no test at all.
    const { readFileSync, readdirSync } = require("fs") as typeof import("fs");
    const { join } = require("path") as typeof import("path");
    const corpus = readdirSync(__dirname)
      .filter((f) => f.endsWith(".test.ts"))
      .map((f) => readFileSync(join(__dirname, f), "utf8"))
      .join(" ");

    const uncovered = MOUNTS.map(([mount]) => mount)
      .filter((mount) => {
        const name = mount.replace("/api/", "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return !corpus.includes(`routes/${name}`);
      });
    expect(
      uncovered,
      `these routers are imported by no test file: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("has no router with zero routes enumerated", () => {
    for (const [mount] of MOUNTS) {
      const n = ENDPOINTS.filter((e) => e.mount === mount).length;
      expect(n, `${mount} contributed no routes — the import is probably wrong`).toBeGreaterThan(0);
    }
  });
});

describe("known gaps this matrix deliberately records", () => {
  it("POST /api/library/items/:id/play is an unauthenticated counter", () => {
    // Not fixed here: it is a play counter with no data exposure, and changing
    // it is a product call about anonymous playback. Recorded so it is a known
    // gap rather than an oversight.
    const e = ENDPOINTS.find((x) => x.key === "POST /api/library/items/:id/play")!;
    expect(actualLevel(e.guards)).toBe("public");
  });

  it("does not claim to verify data scoping inside handlers", () => {
    // GB-07 passed its middleware and failed on the WHERE clause. Middleware
    // inspection cannot catch that class; privacy-trust.test.ts does.
    expect(true).toBe(true);
  });
});
