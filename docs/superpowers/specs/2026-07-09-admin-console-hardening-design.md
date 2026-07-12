# Admin Console — Real-Data Hardening & Depth

**Date:** 2026-07-09
**Status:** Approved (design)
**Workstream:** B1 (from the platform audit) — "Real-only, full-stack"

## Context

The admin console (`/admin/*`) already has a real enterprise shell: sidebar nav, 6 sections
(overview, users, verifications, listings, reports, AI config), command palette, mobile sidebar,
theme toggle, i18n, real stats endpoint (`/api/users/summary/all`), and working moderation actions
(verify/suspend users, resolve reports, review listings). It is **not** a stub.

This slice hardens it to be **fully real** (no placeholder data) and adds genuine depth. Every new
capability ships with its backend so nothing is faked.

## Deliverables

### D1 — Real system health (fixes a lying panel)
The overview's "PostgreSQL / Redis / AI — Connected" statuses are **hardcoded green** — they lie
when a service is down.

- **Backend:** `GET /api/admin/health` (`requireAuth`, `requireRole("admin")`) that actually probes:
  - Postgres: `SELECT 1` via `pool`
  - Redis: `redis.ping()` (reports `not_configured` when `redis` is null)
  - AI service: `GET {AI_SERVICE_URL}/health` with a short timeout
  - Returns `{ services: [{ name, status: "up"|"down"|"not_configured", latencyMs }] }`
- **Frontend:** overview panel calls it, renders real status + latency, auto-refreshes every 30s,
  shows a red state when a probe fails.

### D2 — Real signups trend
- **Backend:** `GET /api/users/summary/signups?days=30` (admin) →
  `SELECT date_trunc('day', created_at)::date AS day, count(*) FROM users GROUP BY 1 ORDER BY 1`,
  zero-filled to a continuous date range.
- **Frontend:** inline SVG bar chart on the overview (no new dependency), accessible, theme-aware.

### D3 — Real admin audit log
- **DB migration:** `admin_audit_log (id uuid pk, admin_id uuid fk users, action text, target_type text,
  target_id uuid null, metadata jsonb, created_at timestamptz default now())` + index on `created_at`.
- **Backend:** a `recordAudit()` helper invoked inside existing admin mutations
  (`users/:id/verify`, `users/:id/status`, `moderation/reports/:id`, housing approve/reject) +
  `GET /api/admin/audit?limit=50&before=<iso>` (admin, cursor-paginated).
- **Frontend:** new `/admin/audit` page + sidebar nav item — filterable table
  (actor, action, target, time).

### Cross-cutting
- i18n keys for **every** new string, added to all 14 locales.
- Dark mode + responsive (320–1440) verified.
- Consistent page headers across new pages.

## Non-goals (honest scope)
Revenue, server/CPU/APM monitoring, feature flags, email/push broadcasting, backups — **excluded**:
no data source exists and faking them violates the no-placeholder rule.

## Architecture / conventions
- Backend routes follow the existing pattern: `Router()`, Zod validation, `try/catch → next(err)`,
  `req.user!.sub` (Postgres UUID), `requireRole("admin")`.
- New `adminRouter` mounted at `/api/admin` in `index.ts`; add the two `/api/admin/*` paths to the
  Next.js rewrite list in `frontend/next.config.ts`.
- DB helpers: `pool`, `redis`, `query`, `queryOne` from `backend/src/db.ts`.

## Verification plan (and its honest limits)
- **Frontend** (rendering, nav, responsive, loading/empty/error states): verified live in the Chromium
  preview by seeding an admin session in `localStorage` (`gb-user` role=admin) — the client `RoleGuard`
  reads role from there.
- **Backend** (handlers, audit writes, query shapes): verified via `tsc --noEmit` + **Vitest** unit
  tests with `pg`/`redis`/`fetch` mocked.
- **End-to-end** (real Postgres + Firebase admin token): **cannot** run in this environment. Ship exact
  run steps + a manual smoke-test checklist; do not claim it is certified.

## Sequencing
D1 → D2 → D3, each landing and verified independently before the next.
