# GlobalBridge — Platform Audit

**Date:** 2026-07-09
**Scope:** Frontend (Next.js) public + gated surface, i18n, routing, links, responsiveness
**Method:** Route crawl (HTTP), runtime console inspection, static analysis, responsive probing via Chromium preview

---

## Executive summary

**The platform is in strong structural health.** The "God Mode" premise — broken navigation, unfinished pages, a broken language system — does **not** hold up against the evidence. Of 71 routes, **zero return 404/500**, there are **zero dead internal links**, **zero console errors** on the pages tested, and **zero horizontal overflow** at 320px. Translations are ~99% complete across all 14 locales.

The real, verifiable findings are **modest and well-scoped**. The biggest opportunities are *enhancements* (a richer admin console, dashboard depth), not bug fixes.

---

## What was verified ✅

| Check | Result |
|-------|--------|
| Static routes crawled (65) | **All 200** — no 404/500 |
| Legacy auth routes (`/login`, `/register`, `/signup`) | Correct `307` redirects → `/auth?mode=…` |
| Dead internal links (`href` → non-existent route) | **0 found** |
| i18n key coverage vs `en.json` (751 keys) | 9/14 locales **100%**; 5 have a narrow gap (below) |
| Console errors — `/dashboard/student`, `/messages` | **None** |
| Horizontal overflow @ 320px | **None** (only a clipped, `pointer-events-none` bg video) |
| Mock/placeholder data in pages | **0 pages** use mock data — all wired to real APIs |
| Placeholder/TODO markers in `src` | **1** (an intentionally disabled feature) |
| Frontend TypeScript typecheck | **Passes clean** (exit 0) despite `ignoreBuildErrors` safety net |

---

## Findings (prioritized punch-list)

### P1 — Worth doing, well-scoped

| ID | Finding | Detail | Effort |
|----|---------|--------|--------|
| A1 | **i18n relative-time plural keys missing** | `common.minutes/hours/days` plural categories absent in `ar`, `ru` (`.other`) and `ja`, `ko`, `zh` (`.one`). CLDR plural rules differ per language, so this needs per-locale handling, not a blind copy. | S |
| A2 | **Build masks TS/lint regressions** | `next.config.ts` sets `typescript.ignoreBuildErrors: true` + `eslint.ignoreDuringBuilds`. Typecheck is *currently* clean, so these can likely be turned off to catch future regressions in CI. | S |

### P2 — Enhancements (align with prompt's vision, not bugs)

| ID | Finding | Detail | Effort |
|----|---------|--------|--------|
| B1 | **Admin console is lean** | `/admin/*` has 5 sections (users, listings, reports, verifications, ai). The prompt envisions an enterprise console (analytics, monitoring, audit logs, moderation queues, broadcasting…). Large, additive. | XL |
| B2 | **Dashboard depth** | Student dashboard (327 LOC, real APIs) is solid; mentor (196) and employer (179) are thinner than the widget lists in the prompt. | L |
| B3 | **New features** | Command palette, global search, PWA/offline, notification center, etc. — all net-new. | XL |
| B4 | **Per-dashboard background videos** | Not yet present; net-new asset + wiring work. | M |
| B5 | **SMS verification** | Honestly disabled with "coming soon" on `/dashboard/verification`. Needs Twilio wiring. | M |

---

## Audit limitations (could NOT be verified here)

These require resources or environments not available in this session and must **not** be reported as "passing":

1. **Authenticated surface** — dashboards, tools, messages *content* sit behind Firebase login. The route crawl sees the pre-redirect shell (hence 200), not verified authed content. Needs a **test account** or a documented dev auth path.
2. **Backend + AI services** — only the frontend dev server was running. API handlers, WebSocket messaging, and AI endpoints were not exercised end-to-end. Needs Postgres + Redis + the Express/FastAPI services up with env configured.
3. **Cross-browser** — only Chromium was drivable. Safari/Firefox/Edge not testable here.
4. **Lighthouse > 95 / load tests** — no way to run WebPageTest/k6/real Lighthouse CI in this environment. Can be optimized-for and self-audited, but not *certified*.

---

## Recommended next slices (in order)

1. **A1 + A2 — i18n plural gap + un-mask the build** (quick, high-confidence wins; makes CI honest).
2. **Stand up local backend + a test account** so the authed surface and APIs become auditable — this unblocks real verification of everything else.
3. **B2 — Dashboard depth** (student → mentor → employer), then **B4** background videos.
4. **B1 — Enterprise admin console** (its own design cycle).
5. **B3 — New features**, one at a time.

Each slice: design → build → verify → commit.
