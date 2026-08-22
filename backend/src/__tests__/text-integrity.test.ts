/**
 * Regression guard for GB-01 — write-time HTML escaping.
 *
 * User text used to be run through an HTML-escaping sanitize() on the way into
 * Postgres, which permanently corrupted every apostrophe, quote and slash —
 * breaking listing photo URLs, avatar URLs, apply links and any name containing
 * an apostrophe. React already escapes at render, so the escaping was never
 * protective, only destructive.
 *
 * This drives the real route handlers with a mocked DB and asserts that the
 * values handed to SQL are byte-identical to what the user submitted. Coverage
 * is the FULL blast radius named in the audit — every entity, not a sample —
 * because the original bug was a per-call-site pattern and a partial guard would
 * let it come back through whichever route was left out.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Router } from "express";

const queryOne = vi.fn();
const query = vi.fn();

vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));
vi.mock("../middleware/auth", () => ({
  requireAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  optionalAuth: (_r: Request, _s: Response, n: NextFunction) => n(),
  requireRole: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  requireAdmin: () => (_r: Request, _s: Response, n: NextFunction) => n(),
  clearUserCache: vi.fn(),
  isAdmin: () => false,
}));
vi.mock("../lib/push", () => ({ dispatchNotification: vi.fn(), pushEnabled: false }));
vi.mock("../lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("../lib/firebase-admin", () => ({ adminAuth: { deleteUser: vi.fn() } }));

import { housingRouter } from "../routes/housing";
import { messagesRouter } from "../routes/messages";
import { forumsRouter } from "../routes/forums";
import { usersRouter } from "../routes/users";
import { opportunitiesRouter } from "../routes/opportunities";
import { jobsRouter } from "../routes/jobs";
import { safeSpaceRouter } from "../routes/safeSpace";
import { moderationRouter } from "../routes/moderation";
import { peerReviewRouter } from "../routes/peerReview";
import { contentRouter } from "../routes/content";
import { libraryRouter } from "../routes/library";

// ── the characters sanitize() destroyed, plus "&" which it never touched but
//    which must still survive a round trip (and would be the giveaway if
//    anything ever starts double-encoding).
const APOSTROPHE = "N'Guessan Kouadio";
const URL_PATH = "https://res.cloudinary.com/globalbridge/listing-1.jpg";
const AMPERSAND = "Housing & Legal Aid <Dept.> — \"open\" 9/5";
const PROSE = `Landlord's flat, 10 min w/ tram — see https://maps.app/x & ask for "Ama" <urgent>`;
const LONG_PROSE = `${PROSE} ${"Every character here must survive the round trip unchanged. ".repeat(2)}`;

/** Anything still carrying one of the five entities sanitize() produced. */
const ENTITY = /&(lt|gt|quot|#x27|#x2F);/;

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const AUTH_USER = { sub: "user-1", firebaseUid: "fb-1", email: "a@b.com", role: "student" as const };

function mockRes() {
  const res = { _status: 0, _json: undefined as unknown } as {
    _status: number; _json: unknown;
    status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>;
  };
  res.status = vi.fn((c: number) => { res._status = c; return res; });
  res.json = vi.fn((b: unknown) => { res._json = b; return res; });
  res.set = vi.fn(() => res);
  return res;
}

/**
 * Run every handler on a route, starting at index 0.
 *
 * Not index 1: public routes like POST /content/contact have no auth middleware,
 * so the handler *is* index 0 and skipping it silently exercises nothing. The
 * auth middleware is mocked to call next() without touching res, so running the
 * whole stack is correct for guarded and public routes alike.
 */
async function callRoute(router: Router, method: string, path: string, req: Partial<Request>) {
  const res = mockRes();
  const next = vi.fn((e?: unknown) => { if (e) throw e; }) as unknown as NextFunction;
  type Layer = { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (rq: Request, rs: Response, n: NextFunction) => unknown }[] } };
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

/** Every string bound as a SQL parameter across all recorded DB calls. */
function boundStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
  };
  for (const call of [...queryOne.mock.calls, ...query.mock.calls]) walk(call[1]);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryOne.mockResolvedValue({ id: "row-1", user_id: "someone-else" });
  query.mockResolvedValue([]);
});

/**
 * The full blast radius. Each case posts hostile text through a real handler
 * and names the strings that must come back out of the SQL bind list unchanged.
 */
const CASES: {
  entity: string;
  router: Router;
  method: string;
  path: string;
  role?: string;
  body: Record<string, unknown>;
  expect: string[];
}[] = [
  {
    entity: "housing_listings — title, description, photos[], virtual_tour_url",
    router: housingRouter, method: "post", path: "/",
    body: {
      title: AMPERSAND, description: PROSE, city: "Berlin", country: "Germany",
      rent_amount: 650, currency: "EUR",
      photos: [URL_PATH, "https://res.cloudinary.com/gb/2.jpg"],
      virtual_tour_url: "https://tour.example.com/123?a=1&b=2",
    },
    expect: [AMPERSAND, PROSE, URL_PATH, "https://tour.example.com/123?a=1&b=2"],
  },
  {
    entity: "messages — body",
    router: messagesRouter, method: "post", path: "/send",
    body: { recipient_id: UUID_B, body: PROSE },
    expect: [PROSE],
  },
  {
    entity: "forum_posts — title, body, tags[]",
    router: forumsRouter, method: "post", path: "/posts",
    body: { category_id: UUID_A, title: AMPERSAND, body: LONG_PROSE, tags: ["visa/permit", "it's-urgent"] },
    expect: [AMPERSAND, LONG_PROSE, "visa/permit", "it's-urgent"],
  },
  {
    entity: "forum_replies — body",
    router: forumsRouter, method: "post", path: "/posts/:id/replies",
    body: { body: PROSE },
    expect: [PROSE],
  },
  {
    entity: "users — full_name, bio, avatar_url",
    router: usersRouter, method: "patch", path: "/me",
    body: { full_name: APOSTROPHE, avatar_url: "/api/uploads/files/1712-ab.png", bio: "I'm a Master's student" },
    expect: [APOSTROPHE, "/api/uploads/files/1712-ab.png", "I'm a Master's student"],
  },
  {
    entity: "mentor_profiles — expertise_areas[], languages_spoken[], universities_attended[]",
    router: usersRouter, method: "patch", path: "/me/mentor-profile",
    role: "mentor",
    body: {
      expertise_areas: ["Visas & permits", "Housing/tenancy"],
      languages_spoken: ["Twi", "Français"],
      universities_attended: ["King's College London", "Université d'Ottawa"],
    },
    expect: ["Visas & permits", "Housing/tenancy", "King's College London", "Université d'Ottawa"],
  },
  {
    entity: "opportunities — title, description, application_url",
    router: opportunitiesRouter, method: "post", path: "/",
    role: "employer",
    body: {
      type: "scholarship", title: "Chevening Scholarship 2027",
      description: "Fully funded master's study in the UK for one year & beyond.",
      country: "United Kingdom",
      application_url: "https://www.chevening.org/scholarship/apply/",
    },
    expect: ["Fully funded master's study in the UK for one year & beyond.", "https://www.chevening.org/scholarship/apply/"],
  },
  {
    entity: "opportunities (jobs route) — description, application_url",
    router: jobsRouter, method: "post", path: "/",
    role: "employer",
    body: {
      type: "job", title: "Frontend Engineer (Visa Sponsored)",
      description: "Build the dashboard used by 40k students. R&D team, hybrid 3/2.",
      country: "Germany",
      application_url: "https://jobs.example.com/apply?ref=gb&id=7",
    },
    expect: ["Build the dashboard used by 40k students. R&D team, hybrid 3/2.", "https://jobs.example.com/apply?ref=gb&id=7"],
  },
  {
    entity: "safe_space_posts — title, body",
    router: safeSpaceRouter, method: "post", path: "/posts",
    body: { topic: "mental-health", title: AMPERSAND, body: LONG_PROSE },
    expect: [AMPERSAND, LONG_PROSE],
  },
  {
    entity: "safe_space_replies — body",
    router: safeSpaceRouter, method: "post", path: "/posts/:id/replies",
    body: { body: PROSE },
    expect: [PROSE],
  },
  {
    entity: "reports — reason, details",
    router: moderationRouter, method: "post", path: "/report",
    body: { target_type: "listing", target_id: UUID_B, reason: "Scam — asks for w/u transfer", details: PROSE },
    expect: ["Scam — asks for w/u transfer", PROSE],
  },
  {
    entity: "scam_alerts — title, description, affected_countries[]",
    router: moderationRouter, method: "post", path: "/scam-alerts",
    body: {
      title: AMPERSAND,
      description: LONG_PROSE,
      scam_type: "housing/deposit",
      affected_countries: ["Côte d'Ivoire", "Guinea-Bissau"],
    },
    expect: [AMPERSAND, LONG_PROSE, "housing/deposit", "Côte d'Ivoire"],
  },
  {
    entity: "peer_review_submissions — doc_type, target, focus_question, body",
    router: peerReviewRouter, method: "post", path: "/submissions",
    body: {
      doc_type: "SOP", target: "King's College London",
      focus_question: "Does my opening hook work?",
      body: LONG_PROSE + " ".repeat(1) + "x".repeat(60),
    },
    expect: ["King's College London", "Does my opening hook work?"],
  },
  {
    entity: "contact_messages — name, message",
    router: contentRouter, method: "post", path: "/contact",
    body: { topic: "safety", name: APOSTROPHE, email: "a@b.com", message: PROSE },
    expect: [APOSTROPHE, PROSE],
  },
  {
    entity: "mentor_bookings — goal, student_timezone",
    router: contentRouter, method: "post", path: "/bookings",
    body: {
      mentor_id: UUID_A, slot_date: "2027-01-15", slot_time: "15:00",
      goal: "Review my SOP & discuss w/ funding", student_timezone: "Africa/Accra",
    },
    expect: ["Review my SOP & discuss w/ funding", "Africa/Accra"],
  },
  {
    entity: "library_items — title, media_url",
    router: libraryRouter, method: "post", path: "/items",
    role: "mentor",
    body: {
      title: "Landing in Berlin: what I'd do differently",
      type: "podcast", topic: "arrival", duration_min: 24,
      origin: "Ghana", origin_flag: "gh", destination: "Germany", dest_flag: "de",
      media_url: "https://media.example.com/ep/12?t=30&x=1",
    },
    expect: ["Landing in Berlin: what I'd do differently", "https://media.example.com/ep/12?t=30&x=1"],
  },
];

describe("user text reaches the database verbatim (GB-01 blast radius)", () => {
  for (const c of CASES) {
    it(c.entity, async () => {
      // library/POST checks the contributor is a verified mentor before writing.
      queryOne.mockResolvedValue({ id: "row-1", user_id: "someone-else", verification_status: "verified" });

      await callRoute(c.router, c.method, c.path, {
        user: { ...AUTH_USER, role: (c.role ?? AUTH_USER.role) as typeof AUTH_USER.role },
        params: { id: UUID_A },
        body: c.body,
      });

      const bound = boundStrings();
      expect(bound.length, "handler wrote nothing to the DB — the case body is probably invalid").toBeGreaterThan(0);

      for (const want of c.expect) {
        expect(
          bound.some((s) => s.includes(want)),
          `${c.entity}\n  expected a bound parameter containing:\n    ${JSON.stringify(want)}\n  got:\n    ${bound.map((s) => JSON.stringify(s.slice(0, 90))).join("\n    ")}`,
        ).toBe(true);
      }

      const corrupted = bound.filter((s) => ENTITY.test(s));
      expect(corrupted, `HTML entities found in bound SQL parameters: ${JSON.stringify(corrupted)}`).toEqual([]);
    });
  }

  it("covers every entity the audit named in the blast radius", () => {
    // Pins coverage so a future route is not quietly added without a guard.
    const covered = CASES.map((c) => c.entity.split(" — ")[0]);
    for (const table of [
      "housing_listings", "messages", "forum_posts", "forum_replies", "users",
      "mentor_profiles", "opportunities", "safe_space_posts", "safe_space_replies",
      "reports", "scam_alerts", "peer_review_submissions", "contact_messages",
      "mentor_bookings", "library_items",
    ]) {
      expect(covered.some((c) => c.startsWith(table)), `no round-trip case covers ${table}`).toBe(true);
    }
  });
});

describe("the sanitize module no longer transforms values", () => {
  it("pickAllowed filters keys without touching the values", async () => {
    const { pickAllowed } = await import("../lib/sanitize");
    const out = pickAllowed(
      { full_name: APOSTROPHE, avatar_url: URL_PATH, role: "admin" },
      ["full_name", "avatar_url"],
    );
    expect(out).toEqual({ full_name: APOSTROPHE, avatar_url: URL_PATH });
    expect(out).not.toHaveProperty("role"); // allow-list still blocks column injection
  });

  it("exports no escaping helper that a write path could pick back up", async () => {
    const mod = await import("../lib/sanitize");
    expect(Object.keys(mod).sort()).toEqual(["escapeLike", "pickAllowed"]);
  });

  it("escapeLike still neutralises LIKE wildcards", async () => {
    const { escapeLike } = await import("../lib/sanitize");
    expect(escapeLike("100% funded")).toBe("100\\% funded");
    expect(escapeLike("under_grad")).toBe("under\\_grad");
    expect(escapeLike("a/b's")).toBe("a/b's"); // untouched — not a wildcard
  });
});
