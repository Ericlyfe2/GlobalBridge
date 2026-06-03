# Foundation — Role-Based Routing & Access Control

**Date:** 2026-06-03
**Status:** Approved
**Phase:** 1 of N (foundation). Later phases: auth UI redesign, dashboard rebuilds, design system.

## Goal

Give GlobalBridge correct, consistent role-based routing and access control on top of
the existing Firebase client-side auth. After this phase: users land on their own role
dashboard after login, cannot navigate into another role's dashboard, and unauthenticated
users are sent to a single canonical login route.

## Context / Current State

- Auth is **client-side only**: Firebase ID token + role stored in `localStorage`
  (`gb-token`, `user-role`). See `frontend/src/lib/auth.ts`.
- Guards are React components: `AuthGuard` (authenticated?) and `AdminGuard` (role === admin?).
- **No cross-role protection** today: all roles share the `(app)` layout which only checks
  "logged in?". A student can currently open `/dashboard/mentor`.
- **Duplicate auth UIs**, both wired to Firebase via `lib/auth`:
  - `/auth?mode=signin|signup` (combined page — the one recently fixed)
  - `(auth)/login` + `(auth)/register` (separate pages)
- Admin section lives at `/admin/*`, gated by `AdminGuard`.
- No `/unauthorized` page. No Next.js middleware.

## Decisions

- **Client-side guards** (not server middleware/cookies). Rationale: the backend already
  enforces real security — every `/api/*` route runs `requireAuth` + role claims, so data
  cannot leak regardless of client routing. Client guards are UX/navigation only. This keeps
  the just-fixed Firebase flow untouched. (Task 9's server-side wording is intentionally not
  taken literally; its actual goal — "users can't use features outside their role" — is met.)
- **Scope = routing + guards only** (Tasks 2 & 7). Design system (Task 8) and auth UI
  redesign (Task 1) are deferred to later phases.
- **No auth UI redesign this phase.** Reuse existing pages; only routing/redirects change.

## Design

### 1. Auth route consolidation
Canonical routes: **`/login`** and **`/signup`**.
- `/login` — already exists (`(auth)/login`), works. Keep.
- `/signup` — create under `(auth)/signup`, reusing the current `(auth)/register` page content.
- Legacy redirects:
  - `/auth` → `/login`; `/auth?mode=signup` → `/signup`
  - `/register` → `/signup`
- `AuthGuard` updated to redirect unauthenticated users to **`/login`** (currently `/auth?mode=signin`).

### 2. Role-based redirect helper
New reusable helper `roleHome(role)` in `frontend/src/lib/roles.ts`:

| Role     | Home route            |
|----------|-----------------------|
| student  | `/dashboard/student`  |
| mentor   | `/dashboard/mentor`   |
| employer | `/dashboard/employer` |
| admin    | `/dashboard/admin`    |
| (unknown / null) | `/login`      |

Used by: login + signup success handlers, the `/dashboard` index redirect, and the
`/unauthorized` "back home" link.

### 3. Route structure
- `/dashboard/student` — student dashboard; current `/dashboard` student content moves here.
- `/dashboard/mentor`, `/dashboard/employer` — already exist; add role gating.
- `/dashboard` (bare) — smart redirect to the current user's `roleHome(role)`.
- Admin — keep existing `/admin/*` section unchanged (already gated, has sub-pages).
  Add `/dashboard/admin` that redirects to `/admin` so the spec URL resolves without
  rewriting admin pages.

### 4. Access control — `RoleGuard`
New component `frontend/src/components/RoleGuard.tsx`:
- Props: `allow: Role[]`, `children`.
- Reads `user-role` from localStorage (same source as existing guards).
- If not authenticated → redirect to `/login` (delegates to / mirrors `AuthGuard`).
- If authenticated but role ∉ `allow` → redirect to `/unauthorized`.
- Otherwise render children.

Application:
- `/dashboard/student` wrapped in `<RoleGuard allow={["student"]}>`, etc.
- Shared feature pages (jobs, housing, community, messages, settings, profile, AI assistant)
  remain available to any authenticated user — they are cross-role by design and stay under
  `(app)` with only `AuthGuard`.
- `AdminGuard` stays for `/admin/*` (unchanged), or is re-expressed as
  `<RoleGuard allow={["admin"]}>` for consistency (implementer's choice; behavior identical).

### 5. `/unauthorized` page
New route `frontend/src/app/unauthorized/page.tsx`:
- Message: "You don't have access to this area."
- Primary button → `roleHome(currentRole)` (their own dashboard).
- Secondary link → sign out.

### 6. Testing
Vitest unit tests (project already uses vitest):
- `roles.test.ts` — `roleHome()` returns the correct route for each role + fallback.
- `RoleGuard` allow/deny logic — given a role and an allow-list, asserts render vs redirect
  decision (extract the decision into a pure function, e.g. `roleGuardDecision(role, allow)`,
  so it is testable without rendering/router).

## Out of Scope (this phase)
- Auth UI redesign / multi-step signup (Task 1)
- Student/Mentor/Employer/Admin dashboard content rebuilds (Tasks 3–6)
- Design system / component library (Task 8)
- Server-side auth, middleware, cookies (Task 9 — superseded by the client-guard decision)

## Files Touched (anticipated)
- New: `src/lib/roles.ts`, `src/components/RoleGuard.tsx`, `src/app/unauthorized/page.tsx`,
  `src/app/(auth)/signup/page.tsx`, `src/lib/__tests__/roles.test.ts`,
  `src/components/__tests__/role-guard.test.ts` (or similar).
- New redirect stubs: `src/app/auth/...`, `src/app/(auth)/register/...`,
  `src/app/(app)/dashboard/admin/...`, `src/app/(app)/dashboard/page.tsx` (smart redirect).
- Moved: current `(app)/dashboard/page.tsx` student content → `(app)/dashboard/student/page.tsx`.
- Edited: `src/components/AuthGuard.tsx` (redirect target → `/login`), login + signup success
  handlers to use `roleHome()`.

## Success Criteria
- Logging in as each role lands on that role's dashboard.
- A student visiting `/dashboard/mentor` (or employer/admin) is redirected to `/unauthorized`.
- An unauthenticated visit to any `(app)` route redirects to `/login`.
- `/auth`, `/register` redirect to the canonical routes.
- `/dashboard` (bare) lands the user on their role dashboard.
- New unit tests pass; existing build + tests still pass.
