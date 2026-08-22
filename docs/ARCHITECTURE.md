# GlobalBridge — Complete Technical Documentation

> **What this document is.** A single, accurate description of how GlobalBridge is actually built:
> the system architecture, the backend, the frontend, the data model, the design system, the
> animation layer, the AI stack, and the mascot engine — plus the reasoning behind each.
>
> Everything here was verified against the code on **2026-08-10**, then re-verified and substantially
> expanded on **2026-08-16** after a long, hands-on correctness/security pass (see §15, §20, and the
> per-section notes marked *"as of 2026-08-16"*) and the merge-in of the design system and landing-page
> animation specs as full sections (§9, §10). Where a design has a non-obvious rationale, the rationale
> is stated; where something is a known gap, it is labelled as one rather than glossed over.

**Companion documents**
| Document | Covers |
|---|---|
| [`MASCOT.md`](MASCOT.md) | Atlas: character design, personality, dialogue, full interaction spec (31 parts) |
| [`admin.md`](admin.md) | Admin console: role hierarchy, all `/api/admin/*` endpoints, page inventory |
| [`DESIGN.md`](DESIGN.md) | Design-system audit: tokens, components, drift between spec and implementation — folded into §9 below, kept standalone too since it's meant to be updated in the same PR as any token change |
| [`audit/2026-07-09-platform-audit.md`](audit/2026-07-09-platform-audit.md) | Point-in-time platform audit |

`frontend/design.md` — the original landing-page creative brief (the `FacetMask` concept, the
Hero→Visa scroll choreography, the per-section animation spec) — is not a standalone companion
doc; its substance is folded into §10 below, since it's implementation detail for one part of the
frontend rather than a system that needs its own file.

---

## Contents

1. [What the product is](#1-what-the-product-is)
2. [System architecture](#2-system-architecture)
3. [Technology stack](#3-technology-stack)
4. [Repository layout](#4-repository-layout)
5. [Backend](#5-backend)
6. [Data model](#6-data-model)
7. [Authentication & authorization](#7-authentication--authorization)
8. [Frontend architecture](#8-frontend-architecture)
9. [Design system & UI](#9-design-system--ui)
10. [Animation system](#10-animation-system)
11. [The AI stack](#11-the-ai-stack)
12. [Atlas — the mascot engine](#12-atlas--the-mascot-engine)
12b. [Progressive Web App](#12b-progressive-web-app)
13. [Internationalization](#13-internationalization)
14. [Real-time layer](#14-real-time-layer)
15. [Security](#15-security)
16. [Accessibility](#16-accessibility)
17. [Testing](#17-testing)
18. [Running locally](#18-running-locally)
19. [Deployment](#19-deployment)
20. [Known gaps & technical debt](#20-known-gaps--technical-debt)

---

# 1. What the product is

GlobalBridge is a platform for international students and immigrants navigating a move abroad.

**The problem it addresses is not a lack of information — it is fragmentation and fear.** The
information exists, scattered across government sites, forums, and paid consultants. Users abandon
immigration processes because they're overwhelmed and afraid of getting something wrong, not because
they couldn't find a search box. Two compounding factors make it worse: the population is
disproportionately targeted by fraud (rental scams, fake job offers, bogus "visa consultants"), and
much of the work happens alone, at night, in a second language.

Every architectural decision below traces back to that: **reduce overwhelm, and protect users from
being exploited.**

### Feature areas

| Area | What it does |
|---|---|
| **AI Visa Assistant** | Conversational visa guidance with RAG-grounded answers and source citations |
| **Document Checker** | Analyses uploaded documents for problems (expiry, validity windows) before submission |
| **Visa Roadmap** | Stage-by-stage journey plan with per-item checklists |
| **Scam Shield** | Pastes of listings/offers/messages scored for fraud patterns |
| **Housing Marketplace** | Listings with landlord verification status and roommate preferences |
| **Jobs** | Opportunity listings filterable by visa sponsorship; resume builder; sponsorship tracker |
| **Opportunities** | Scholarships, exchanges, internships with funding and deadline data |
| **Mentorship** | Verified mentors who have made the same journey; bookings |
| **Community** | Forums, country rooms, success stories, a moderated "safe space" |
| **Toolkit** | Cost of living, banking, healthcare, transit, SIM, tax, discounts, emergency SOS |
| **Admin console** | User/content moderation, verification queues, analytics, AI observability |

**Roles:** `super_admin`, `admin`, `student`, `mentor`, `employer`.

---

# 2. System architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                             │
│  React 19 · Next.js 15 App Router · Tailwind 4 · GSAP + Lenis        │
│  Firebase JS SDK (auth)  ·  Atlas mascot engine                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS  +  WSS
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  NEXT.JS SERVER  (:3000)                                             │
│                                                                      │
│  ├─ Server Components / SSR / static shell                           │
│  ├─ Route handlers  /api/ai/*        ← calls OpenAI directly         │
│  │                  /api/i18n/*      ← dynamic translation           │
│  └─ Rewrites        /api/{auth,users,housing,jobs,forums,messages,   │
│                            opportunities,content,admin,ai,rag,       │
│                            knowledge,moderation,uploads}/*           │
│                     ──────────────────────────────────────►  Express │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  EXPRESS API  (:4000)                                                │
│  helmet · compression · cors · csrf · rate-limit · morgan            │
│                                                                      │
│  14 routers · 112 endpoints · WebSocket server on /ws                │
│  Firebase Admin SDK verifies every bearer token                      │
└───────┬──────────────────────────────────┬───────────────────────────┘
        │                                  │
        ▼                                  ▼
┌────────────────────┐            ┌──────────────────────┐
│  PostgreSQL 16     │            │  Redis 7  (optional) │
│  + pgvector        │            │  cache · WS pub/sub  │
│  31 tables         │            │  degrades gracefully │
└────────────────────┘            └──────────────────────┘
        │
        ▼
┌────────────────────┐            ┌──────────────────────┐
│  OpenAI            │            │  Firebase Auth       │
│  chat + embeddings │            │  identity provider   │
└────────────────────┘            └──────────────────────┘
```

### Why Next.js proxies the API

Every backend call goes through a Next.js rewrite (`/api/users/*` → `http://localhost:4000/api/users/*`)
rather than the browser calling Express directly. This:

- **eliminates CORS entirely** for the browser — everything is same-origin
- keeps the backend URL out of the client bundle
- lets the BFF layer add server-only capability (the AI routes hold the OpenAI key server-side)

The trade-off is one extra network hop and a subtle failure mode documented in
[§15](#15-security): server-to-server calls carry no `Origin` header, which originally tripped the
CSRF guard.

### Two AI paths, and why

There are deliberately **two** places AI is called:

| Path | Runs in | Used for | Why |
|---|---|---|---|
| `/api/ai/*` route handlers | Next.js server | Scam Shield, Visa Roadmap, Readiness, Doc Check, Essay Score, Country Compare, Chat | Latency — no extra hop; key stays server-side; independent of Express uptime |
| `/api/ai/*` on Express | Express | Conversation + message persistence, checklists, translate | Needs the database; conversations must be stored |

The Next chat route calls **back into** Express for RAG retrieval and conversation persistence, which
is why the CSRF fix in §15 mattered so much.

### A request, traced end to end

Abstract diagrams undersell how many decisions happen per request. Here is one concrete path —
a signed-in student opening `/opportunities` and applying a search filter — hop by hop.

```
1. Browser navigates to /opportunities
   → Next.js server renders the route's Client Component shell (no data yet;
     the page fetches client-side once mounted, see §8)

2. Component mounts → useEffect fires
   → fetch(`/api/opportunities?type=job&search=engineer&limit=24&offset=0`)
   → same-origin request, no CORS preflight, no manual Authorization header
     needed for this one (opportunities listing is a public GET)

3. Next.js rewrite intercepts the path
   → matches the `/api/opportunities/:path*` rule in next.config.ts
   → proxies to http://localhost:4000/api/opportunities?... (prod: the
     Railway backend URL) — the browser never learns that URL exists

4. Express middleware chain runs, in order
   → helmet sets CSP/security headers on the eventual response
   → compression() will gzip the JSON on the way out
   → cors() checks Origin (same-origin via the rewrite, so effectively moot
     here — CORS matters for direct browser→Express calls, which this
     request isn't)
   → rateLimit checks this IP's 15-minute counter (1200 requests — raised
     from an original 300 after live testing showed shared campus/dorm NAT
     could exhaust 300 from normal multi-student browsing alone)
   → csrfProtection checks Origin/Referer — present and valid (real browser
     request), passes; would also pass a server-to-server call with neither
     header (§15's CSRF subtlety)
   → express.json() parses the body (empty here, it's a GET)

5. opportunitiesRouter.get("/") handler runs
   → Zod schema parses and coerces the querystring (`limit` and `offset`
     become numbers, `type` is checked against the enum)
   → builds a parameterized WHERE clause from whichever filters were
     actually supplied — no string concatenation, ever (§15)
   → user-supplied `search` text is passed through escapeLike() before being
     wrapped in `%...%`, so a literal "%" in a search box can't silently
     match every row (a real, live-reproduced bug fixed in this pass)
   → query() runs the parameterized SQL against the pg Pool

6. Postgres (Neon) executes the query, returns rows
   → pool round-trip; cold-start-tolerant 12s connectionTimeoutMillis
     because Neon's serverless Postgres suspends when idle

7. Response flows back
   → Express sends JSON → Next.js rewrite passes it through unmodified →
     browser's fetch() resolves → component calls setOpps(data.opportunities)
   → React re-renders the list; if the page requests a further page, it
     re-fetches with offset = opps.length rather than re-fetching everything
     (this "Load more" pattern replaced an earlier version that had no
     pagination at all and silently capped results at the first 20 rows —
     a real, user-facing bug on a listings page that, at the time it was
     found, had over 100 real rows in the database)

8. If the same student then applies for a job (a mutating, authenticated call)
   → authFetch() (not plain fetch) is used instead
   → it reads auth.currentUser from the Firebase JS SDK, calls
     getIdToken(false) for a cached-but-fresh token, and attaches it as
     Authorization: Bearer <token>
   → if Express returns 401 and a live Firebase session still exists, authFetch
     retries once with getIdToken(true) (force-refresh) — covers a tab that
     was backgrounded long enough to miss Firebase's own proactive refresh
   → Express's requireAuth middleware verifies that token against the
     Firebase Admin SDK with checkRevoked: true (not just signature/expiry —
     an admin-suspended or admin-deleted account's still-unexpired token is
     rejected immediately, not just once it naturally expires; see §15)
   → resolves the Postgres user row (cached in-process per firebase_uid for
     60s to avoid a DB round-trip on every request), attaches req.user,
     and only then does the route handler run its own requireRole() check
```

Two things worth internalizing from that trace: **almost nothing is special-cased.** The same
rewrite, the same middleware chain, and the same `query()`/`queryOne()` helpers handle a public
listings GET and an authenticated mutating POST — the only difference is which guards a given
route opts into (`requireAuth`, `requireRole`, `requireAdmin`) and whether the client attaches a
token. And **every layer independently enforces its own concern** — rate limiting doesn't know or
care about authentication, CSRF doesn't know or care about authorization, and the route handler's
Zod schema doesn't know or care what the rate limiter decided. A request that's going to be
rejected can be rejected as cheaply as possible (rate limiter before CSRF before JSON parsing
before auth before the database), and no single layer's bug can silently grant what another layer
correctly denies.

---

# 3. Technology stack

### Frontend
| Package | Version | Role |
|---|---|---|
| next | 15.5.18 | App Router, SSR, route handlers, image optimization |
| react / react-dom | 19.2.6 | UI runtime |
| typescript | 5.6.3 | Types — build fails on type errors (`ignoreBuildErrors: false`) |
| tailwindcss | 4.3.0 | Styling via CSS-first `@theme` tokens |
| firebase | 11.10.0 | Client auth SDK |
| gsap + @gsap/react | 3.15.0 | Scroll animation, MotionPath, ScrollTrigger |
| lenis | 1.3.25 | Smooth scrolling |
| framer-motion | 12.40.0 | Component-level motion |
| three + @react-three/fiber + drei | 0.184 / 9.6 / 10.7 | 3D globe scene |
| openai | 6.46.0 | Server-side AI calls in route handlers |
| lucide-react | 0.460.0 | Icons |
| flag-icons | 7.5.0 | Country flags |
| vitest | 4.1.7 | Tests |

### Backend
| Package | Role |
|---|---|
| express 4.21 | HTTP framework |
| pg 8.13 | PostgreSQL client (pooled) |
| ioredis 5.4 | Redis — **optional**, degrades gracefully |
| firebase-admin 13.10 | Verifies ID tokens |
| zod 3.23 | Request validation |
| ws 8.18 | WebSocket server |
| helmet 8 / compression / cors / morgan | Security, perf, logging |
| express-rate-limit 7.4 | Abuse protection |
| tsx / typescript | Dev runtime + build |

### Data
- **PostgreSQL 16** with the **pgvector** extension (image: `pgvector/pgvector:pg16`) — vector similarity for RAG
- **Redis 7** — cache and WebSocket pub/sub, entirely optional

---

# 4. Repository layout

```
GlobalBridge/
├── package.json              # root: `npm run dev` starts both services
├── docker-compose.yml        # Postgres (pgvector) + Redis
│
├── backend/
│   ├── src/
│   │   ├── index.ts          # app bootstrap, middleware chain, router mounts
│   │   ├── db.ts             # pg Pool + optional Redis + query helpers
│   │   ├── env.ts            # zod-validated environment
│   │   ├── ws.ts             # WebSocket server
│   │   ├── middleware/       # auth · csrf · error
│   │   ├── lib/              # analytics · audit · embeddings · firebase-admin
│   │   │                     # health · sanitize · storage
│   │   ├── routes/           # 14 routers
│   │   └── seed-*.ts         # admin, knowledge, opportunities seeders
│   ├── Dockerfile · Procfile · railway.toml
│
├── db/
│   ├── schema.sql            # 31 tables — canonical schema
│   ├── migration_rag.sql     # pgvector + RAG + AI analytics extensions
│   └── seed.sql
│
├── frontend/
│   ├── src/
│   │   ├── app/              # 82 pages + 9 route handlers
│   │   │   ├── (app)/        # signed-in area  — AuthGuard
│   │   │   ├── (admin)/      # admin console   — AdminGuard
│   │   │   ├── (auth)/       # login/register/reset
│   │   │   └── api/          # Next route handlers (AI, i18n)
│   │   ├── components/       # 47 components + ui/ globe/ mascot/ footer/
│   │   ├── mascot/           # Atlas engine (types · dialogue · policy · provider)
│   │   ├── i18n/             # 14 locales, provider, middleware
│   │   ├── lib/              # auth · gsap · rate-limit · roles · utils
│   │   └── data/             # static content
│   └── public/mascot/atlas.png
│
└── docs/                     # ARCHITECTURE.md · MASCOT.md · admin.md · assets/
```

---

# 5. Backend

Express + TypeScript, run with `tsx watch` in dev and compiled with `tsc` for production.

### Middleware chain (order matters)

```
helmet(CSP)                 → security headers
compression()               → gzip
morgan("dev")               → request logging
cors({ origin: CORS_ORIGIN, credentials: true })
rateLimit                   → abuse protection
csrfProtection              → origin/referer validation  ⚠ see §15
express.json({ limit: 10mb })
──── routers ────
errorHandler                → last; normalises all thrown errors
```

### Routers — 112 endpoints total

| Router | Mount | Endpoints | Responsibility |
|---|---|---:|---|
| `admin` | `/api/admin` | 44 | Dashboard stats, user CRUD, verification queues, content moderation, reports, settings, notifications, AI observability, analytics, audit log |
| `ai` | `/api/ai` | 11 | Conversations, messages, chat, checklists, doc-check, translate |
| `users` | `/api/users` | 11 | Profile, dashboard aggregation, mentors, documents |
| `content` | `/api/content` | 9 | Saved items, notifications, success stories |
| `forums` | `/api/forums` | 5 | Posts, replies, categories |
| `knowledge` | `/api/knowledge` | 5 | Knowledge base CRUD (admin) |
| `moderation` | `/api/moderation` | 5 | Reports, scam alerts |
| `rag` | `/api/rag` | 4 | Vector search, embed, re-embed, stats |
| `housing` | `/api/housing` | 4 | Listings, detail, create |
| `jobs` | `/api/jobs` | 4 | Job listings |
| `opportunities` | `/api/opportunities` | 3 | Scholarships/exchanges/internships |
| `messages` | `/api/messages` | 3 | Conversations, send |
| `auth` | `/api/auth` | 2 | `register-profile`, `me` |
| `uploads` | `/api/uploads` | 2 | File upload + static serving |

### Database access

`db.ts` exposes a thin, deliberately un-abstracted layer:

```ts
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]>
export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>
```

Raw parameterised SQL, no ORM. The pool is configured `max: 25, min: 2,
connectionTimeoutMillis: 12000`.

> **Why 12s and not the default.** The production database is Neon (serverless Postgres), which
> cold-starts after idle. At the original 5s the first request after a quiet period intermittently
> failed with spurious 401/500s. This was diagnosed by reproducing it, not guessed.

### Redis is optional by design

```ts
export const redis = process.env.REDIS_URL ? new Redis(...) : null;
```

If `REDIS_URL` is absent the server logs a warning and runs without cache or WebSocket pub/sub.
Single-instance deployments and local dev need no Redis at all. This keeps the local setup to one
`docker compose up` — or none, if you point `DATABASE_URL` at a hosted Postgres.

---

# 6. Data model

**35 tables** as of 2026-08-16 (31 at the previous audit, plus four added in the pass described
throughout this document — see the note at the end of this section). PostgreSQL 16 + pgvector.
UUID primary keys throughout (`uuid_generate_v4()` / `gen_random_uuid()`).

### Identity & profiles
| Table | Purpose |
|---|---|
| `users` | Core identity. `role` enum, `verification_status`, country of origin/residence, `preferred_language` |
| `mentor_profiles` | Expertise, languages, universities, verification metadata |
| `employer_profiles` | Company info, visa sponsorship details |
| `user_documents` | Uploaded identity/credential documents |
| `permissions` | Fine-grained permission records |

> **Auto-provisioning matters here.** Both `mentor_profiles` and `employer_profiles` have
> `user_id` as their primary key, and several admin/public queries `INNER JOIN` against them —
> which means a mentor or employer who signed up without one of these rows was invisible in the
> admin verification queue and (for mentors) the public directory. Neither table was ever
> auto-created anywhere in the original registration flow. Fixed by inserting a row at
> `register-profile` time and again on any admin role-change to `mentor`/`employer`, plus a one-off
> backfill (`migrate-backfill-mentor-profiles.ts`, `migrate-backfill-employer-profiles.ts`) that
> recovered 9 mentors and 2 employers already hidden in production. This is the single
> highest-impact bug class found in the 2026-08-16 pass, precisely because it silently affected
> real signed-up users rather than failing loudly.

### Journey
| Table | Purpose |
|---|---|
| `visa_checklists` | Per-user checklist state |
| `opportunities` | Scholarships, exchanges, internships, jobs |
| `crawled_opportunities` | Ingested listings pending verification |
| `housing_listings` | Marketplace listings with landlord status |
| `roommate_preferences` | Matching inputs |
| `saved_items` | Polymorphic saves (`item_type` + `item_id`) |
| `mentor_bookings` | Session bookings — `slot_date` + `slot_time` are plain strings with no timezone attached; `student_timezone` (added 2026-08-16, see below) exists precisely because "3:00 PM" means nothing across a student/mentor pair in different countries |

### Community
`forum_categories`, `forum_posts`, `forum_replies`, `success_stories`, `conversations`, `messages`,
`notifications`

| Table *(new)* | Purpose |
|---|---|
| `peer_review_submissions` | Essay/SoP drafts submitted for anonymous structured peer feedback |
| `peer_review_reviews` | Reviews against those submissions; rubric-weighted `overall_score` computed server-side (hook 15% / arc 20% / evidence 20% / fit 20% / voice 15% / close 10%, matching the frontend's fixed weights) |

Peer review runs on a **credit system**: `credits(user) = reviewsGiven − 3 × submissionsMade`,
requiring ≥3 credits to submit — with one deliberate exception: a user's *first-ever* submission is
free, because otherwise nobody could ever submit anything (there would be nothing yet to review to
earn the credits needed to submit in the first place). This cold-start exception was caught by
live-testing the feature with two real test accounts and watching both get correctly blocked at
`credits: 0` before the fix.

### AI & knowledge
| Table | Purpose |
|---|---|
| `knowledge_base` | RAG corpus with `embedding vector` column |
| `embedding_cache` | Avoids re-embedding identical text |
| `trusted_sources` | Whitelisted official sources |
| `ai_conversations` | Chat threads (`message_count`, `topics`, `is_active`, `updated_at`) |
| `ai_messages` | Individual turns with `sources` JSON |
| `ai_usage_log` | Tokens, latency, model, feature, errors |
| `ai_feedback` | User ratings |

### Safety & operations
`reports`, `scam_alerts`, `admin_audit_log`, `activity_log`, `platform_settings`

| Table *(new)* | Purpose |
|---|---|
| `newsletter_subscribers` | Email capture for the footer "Get the checklist" form. Exists to record a real address for genuine future outreach — there is **no email-sending infrastructure anywhere in this app** (`SENDGRID_API_KEY` is documented in `.env.example` but referenced nowhere in source), so this table does not imply automated email is happening. See §10.7 for why the form's actual "checklist" is a real client-side download, not an emailed one. |

### Schema management

There is **no migration framework**. Two SQL files are applied manually:

```bash
cd backend && npx tsx run-migration.ts ../db/schema.sql
cd backend && npx tsx run-migration.ts ../db/migration_rag.sql
```

Both are written idempotently (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) so they can
be re-run safely. **This is a real limitation** — see [§20](#20-known-gaps--technical-debt). The
four tables/columns added on 2026-08-16 (`newsletter_subscribers`, `peer_review_submissions`,
`peer_review_reviews`, `mentor_bookings.student_timezone`) were each applied via their own small,
idempotent one-off script (`migrate-newsletter-table.ts`, `migrate-peer-review.ts`,
`migrate-booking-timezone.ts`) rather than through the two canonical files above — consistent with
how every schema change in this project has been made, but it means `db/schema.sql` itself is now
one step behind what's actually running and should be reconciled the next time someone touches it.

---

# 7. Authentication & authorization

**Firebase Auth is the identity provider. Postgres holds the profile.** They are joined by
`users.firebase_uid`.

### Registration flow

```
1. createUserWithEmailAndPassword()      Firebase — creates the identity
2. updateProfile({ displayName })
3. getIdToken(true)                      force-refresh so custom claims land
4. POST /api/auth/register-profile       creates the Postgres row
       └─ on failure: cred.user.delete() ← rolls back the Firebase user
5. GET /api/auth/me                      loads the profile into session
```

> **Step 4's rollback matters.** Without it, a failed profile write leaves an orphaned Firebase
> identity that can authenticate but has no profile — a user permanently stuck in a broken state.

### Request authentication

Every protected request carries `Authorization: Bearer <firebase-id-token>`.

`requireAuth` verifies the token with the Firebase Admin SDK, resolves the Postgres user, and
attaches `req.user`. Resolved users are cached in-process (`clearUserCache` invalidates on change) to
avoid a database round-trip per request.

Guards: `requireAuth` → `requireRole(...roles)` → `requireAdmin()`. `super_admin` bypasses
`requireRole`.

### Token refresh

`authFetch` in `lib/auth.ts` attaches a fresh token and **retries once with a force-refreshed token
on 401**. A backgrounded tab can miss Firebase's proactive refresh, leaving a stale cached token that
looked valid when read.

### Client-side guards

| Guard | Protects | Behaviour |
|---|---|---|
| `AuthGuard` | `(app)` group | Redirects to `/auth` without a token |
| `AdminGuard` | `(admin)` group | Redirects to `/dashboard` unless `admin`/`super_admin` |
| `RoleGuard` | Specific routes | Uses `roleGuardDecision()` |

`lib/roles.ts` holds the routing logic as **pure functions**, so it is unit-tested without a router
or the DOM.

> **These guards are UX, not security.** Every endpoint independently enforces authorization
> server-side. A client guard only prevents a pointless render.

---

# 8. Frontend architecture

Next.js 15 App Router, React 19. **82 pages, 9 route handlers.**

### Route groups

| Group | Pages | Layout provides |
|---|---|---|
| _(root)_ | Landing, about, pricing, help, contact, privacy, terms | Marketing shell |
| `(auth)` | login, signup, register, forgot/reset password | Split-panel auth shell |
| `(app)` | 50+ signed-in pages | `AuthGuard`, sidebar, header, command palette, Atlas dock |
| `(admin)` | 13 console pages | `AdminGuard`, admin sidebar, audit-aware header |

### Provider hierarchy (`app/layout.tsx`)

```
<html lang dir suppressHydrationWarning>
  <head>  theme + language init scripts (pre-paint, prevents FOUC)
  <body>
    <HreflangMeta />
    <LocaleProvider initialLang={cookie}>
      <ToastProvider>
        <AuthSync />              ← mirrors Firebase token → localStorage
        <ReducedMotionGuard />
        <MascotProvider>          ← Atlas engine
          <SmoothScroll>          ← Lenis
            {children}
```

The `<head>` scripts read `localStorage` for theme and language and apply `class="dark"` / `dir="rtl"`
**before first paint**. Without them the page flashes light-then-dark on every load.

### Hydration safety — a rule learned the hard way

**Never read `localStorage` during render.** Two components originally did:

```tsx
// ✗ server renders signed-out, client hydrates signed-in → mismatch
const [authed] = useState(() => !!getToken());

// ✓ start matching the server, sync after hydration
const [authed, setAuthed] = useState(false);
useEffect(() => { setAuthed(!!getToken()); }, []);
```

The server has no `localStorage`, so it always renders the signed-out tree; the client's initialiser
sees a real token and renders the signed-in tree. React throws a hydration mismatch and discards the
server HTML. Applies to `Navbar`, `messages`, and the Atlas dock (`ready` flag).

### Key libraries

| File | Purpose |
|---|---|
| `lib/auth.ts` | Firebase wrapper, session mirror, `authFetch`, password policy, friendly error mapping |
| `lib/roles.ts` | Pure role→route logic |
| `lib/rate-limit.ts` | In-memory sliding window for AI route handlers |
| `lib/gsap.ts` | Registers GSAP plugins once |
| `lib/utils.ts` | `cn()` class merging |

---

# 9. Design system & UI

Tailwind CSS 4 using the **CSS-first `@theme` block** in `globals.css` — no `tailwind.config.js`
colour scale. Tokens become utilities automatically (`--color-clay-500` → `bg-clay-500`). This
section is the merged content of the standalone [`DESIGN.md`](DESIGN.md) audit — that file stays
as its own document too (see the note at the top of this doc), and should be updated in the same
PR as any token or pattern change, the same discipline that kept this file itself from going stale.

### 9.1 Brand identity

**GlobalBridge** — a bridge/globe glyph (`Logo.tsx`), teal gradient (`#14b8a6` → `#0f766e`), literal
bridge-over-globe imagery reflecting the product's core metaphor: helping someone cross from one
country's systems into another's. Positioning line (from `layout.tsx` metadata): *"Your Trusted
Guide Abroad."* Voice is plain-language and safety-first — the platform's stated philosophy is to
**reduce overwhelm and protect users from being exploited** (see §1), and that shows up more in
copy choices (Scam Shield, verified badges, honest "this isn't wired up yet" states) than in visual
style.

### 9.2 Colour system

Defined once as CSS custom properties in `@theme`, then **overridden inside `.dark`** — every
token keeps its name across themes, only the value changes. This is the single most important
structural fact about the colour system: **never hardcode a hex value, or a static Tailwind colour
like `bg-white`, in a component — always reference the token.**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-cream-50` | `#f8fafc` | `#0a0f1a` | Page background |
| `--color-cream-100` | `#f1f5f9` | `#111827` | Muted/alt background, card-on-card |
| `--color-cream-200` | `#e2e8f0` | `#1f2937` | Borders, dividers |
| `--color-cream-300` | `#cbd5e1` | `#374151` | Lighter borders, input borders |
| `--color-cream-400` | `#94a3b8` | `#4b5563` | Muted UI elements |
| `--color-clay-500/600/700` | `#0d9488`→`#115e59` | `#14b8a6`→`#5eead4` | **Primary/accent** — brighter in dark mode for contrast, not just inverted |
| `--color-ink-900…500` | `#0f172a`→`#64748b` | `#f1f5f9`→`#64748b` | Text, darkest→lightest |
| `--color-leaf-500/600` | teal-green | brighter teal-green | Success / verified |
| `--color-sky-500/600` | blue | brighter blue | Info accents |
| `--color-amber-500` | amber | brighter amber | Warning |
| `--color-surface` / `--color-surface-alt` | white / `#f8fafc` | `#111827` / `#0f172a` | Card/panel backgrounds |

Naming is metaphor-first (cream/clay/ink/leaf/sky), not literal (gray/teal/blue) — a new
contributor has to learn the mapping before reaching for the right token. There is no
`--color-danger`/`--color-error` token; destructive/error states borrow Tailwind's raw `red-*`
scale directly instead (see §9.9), which means red doesn't participate in the same automatic
light/dark flip the rest of the palette gets.

> **A real bug this exact gap caused.** Because `--color-ink-900` flips from near-black (light
> mode) to near-white (dark mode), any component pairing it with a *literal* `bg-white` — rather
> than the `--color-surface` token, which flips too — rendered white text on a white card the
> moment a user enabled dark mode: roughly 1:1 contrast, effectively invisible. This was found
> live on the public landing page (90 affected elements on that one page alone) and traced to 34
> occurrences of a hardcoded `bg-white` across 20 files. Fixed by pairing every one with an
> explicit `dark:bg-[var(--color-surface)]` override. The lesson generalizes: **any static colour
> utility paired with a token-driven one is a latent dark-mode bug**, not just `bg-white`.

### 9.3 Typography

```css
--font-display: "Tiempos", "Charter", "Georgia", serif;   /* h1–h4 */
--font-sans:    "Inter", "Söhne", system-ui, sans-serif;  /* body, default */
--font-mono:    "JetBrains Mono", ui-monospace, monospace; /* .facet-label, timestamps, data */
```

- All headings (`h1`–`h4`) automatically switch to `font-display` with `-0.02em` letter-spacing via
  `@layer base` — no per-heading class needed.
- `h2`–`h4` render at weight 500, not bold — the serif face already carries enough presence that a
  heavy weight would fight it rather than reinforce it.
- The serif/sans pairing is the core of the visual identity, and it's a deliberate departure from
  the typical all-sans SaaS look: serif headings read as institutional seriousness (this product
  handles visas and money), sans body keeps density readable. It reinforces "guide" positioning
  over "tool" positioning.
- **No documented type scale** — headings rely on Tailwind's default `text-2xl`/`text-3xl`/etc.
  chosen ad hoc per component, so comparable headings across pages (a dashboard section header vs.
  a settings section header) can end up at different sizes with no record of whether that was
  intentional. The single biggest gap in the type system — see §9.9, item 1.

### 9.4 Spacing & shape

```css
--radius-sm: 0.375rem;   /* 6px  — badges, small chips */
--radius-md: 0.625rem;   /* 10px — inputs, buttons */
--radius-lg: 1rem;       /* 16px — cards */
--radius-xl: 1.5rem;     /* 24px — large panels, drawers */
```

Spacing itself uses Tailwind's default scale directly (no custom spacing tokens) — `px-4 py-2.5`,
`gap-2`, `space-y-4` throughout. Consistent in practice because most components converge on the
same handful of values (`2.5`, `3`, `4`, `5`, `6`), but nothing enforces that convergence.

### 9.5 Iconography

**lucide-react** exclusively (`^0.460.0`) — no mixed icon sets anywhere in the codebase. Sizes
cluster around three bands: `13–14` (inline/badge), `16–18` (buttons, form fields, nav), `20–24`
(feature/section icons) — not tokenized, but consistent by convention. The one deliberate exception
is `GoogleIcon` in `auth/page.tsx`: a hand-drawn SVG using Google's official four-colour mark,
because brand guidelines forbid recolouring it to match the palette.

### 9.6 Core component classes

Defined in `globals.css` under `@layer components` — plain CSS classes, not a React component
library, so any element opts in with a className:

```css
.btn-primary   /* solid ink background — the "quiet" strong action */
.btn-accent    /* solid clay-500 background — the primary CTA */
.btn-ghost     /* transparent, ink text, cream-200 hover — tertiary */
.card          /* surface bg, cream-200 border, radius-lg, 1.5rem padding */
.input         /* surface bg, cream-300 border, clay-500 focus ring */
.badge / .badge-verified / .badge-clay / .badge-sky   /* pill tags */
```

**In practice, most screens don't use these classes** — they compose Tailwind utilities inline
instead. Both render identically today; a future brand tweak (changing card border-radius, say)
requires editing one CSS rule *and* grepping for every hand-rolled equivalent. Prefer the existing
classes in new work.

Other reusable primitives: `Skeleton` for loading states, `Toast` for transient feedback,
`CommandPalette` (⌘K) for navigation, `MobileSidebar` for viewports under 768px.

### 9.7 Layout & responsive strategy

- **Breakpoint convention**: mobile-first, `md:` (768px) is the primary desktop cutover used
  almost everywhere — desktop sidebar (`hidden md:flex`) vs. mobile bottom nav + drawer
  (`md:hidden`). `lg:`/`xl:` appear only inside marketing-page grids, not in app chrome.
- **Signed-in app shell** (`(app)/layout.tsx`): fixed 240px (`w-60`) desktop sidebar with up to 16
  items; on mobile, collapses to a 4-item `MobileBottomNav` plus a shared `MobileSidebar` drawer
  opened by "More."
- **Admin console**: separate route group `(admin)`, its own `MobileSidebar preset="admin"` — same
  drawer component, different item set, not a parallel implementation.
- **Auth pages**: split-screen `md:grid-cols-2` — brand/trust panel on the left (hidden below
  `md:`), form on the right. One shared component drives both sign-in and sign-up via a `mode`
  flag rather than two pages.
- **Touch targets**: minimum 44×44px enforced via `min-h-11 min-w-11` (WCAG 2.5.5), applied
  explicitly wherever a control might otherwise be smaller (icon-only buttons, the password-reveal
  toggle, the mobile bottom nav's `min-h-14`).
- **Safe-area insets**: `env(safe-area-inset-bottom, 0px)` on the mobile bottom nav and Atlas's
  dock so neither collides with a phone's home indicator.

### 9.8 Dark mode

Class-based (`.dark` on `<html>`), not the `prefers-color-scheme` media query alone — a small
inline script in `layout.tsx`'s `<head>` reads `localStorage['theme']` **before hydration** and
applies the class synchronously, avoiding a flash of the wrong theme. `ThemeToggle.tsx` flips the
class and persists the choice. Because every colour is a CSS variable swapped inside `.dark`,
**components almost never need a `dark:` variant for colour** — they reference `var(--color-*)` or
a Tailwind colour utility that resolves to one of those variables. Where `dark:` utility classes
appear directly instead (`dark:border-gray-800`, `dark:bg-gray-800`) using Tailwind's raw gray
scale rather than the `cream`/`ink` tokens, that's a second, parallel mechanism doing the same job
— see §9.9, item 3, and the `bg-white` incident described in §9.2.

### 9.9 Inconsistencies & opportunities

Concrete, ranked by how much drift each is currently causing. Several were found and partially
fixed during the 2026-08-16 pass; still-open items are marked.

1. **No documented type scale** *(open)* — see §9.3. Fix: add a small `--text-*` scale to `@theme`
   (e.g. `display-lg/display-md/heading/body/caption`) and migrate incrementally.
2. **`.btn-*`/`.card`/`.input` exist but adoption is inconsistent** *(open)* — see §9.6.
3. **Two parallel dark-mode mechanisms** *(partially fixed)* — the specific failure mode (a static
   `bg-white` paired with a token-driven text colour) was fixed at all 34 known occurrences; the
   broader pattern of raw `dark:` utilities bypassing the token system elsewhere is still open.
   Fix: standardize on token references; reserve raw `dark:` utilities for one-offs with no token
   equivalent.
4. **RTL overrides are utility-class-specific, not systemic** *(open)* — the `[dir="rtl"]` block in
   `globals.css` only flips utility classes someone thought to add (`.ml-2`, `.pl-4`, …). A new
   component using `.ml-5` or `.pr-6` will silently fail to mirror in Arabic with no build-time
   warning. Fix for new components: prefer Tailwind's logical-property utilities (`ms-*`, `me-*`,
   `ps-*`, `pe-*`, `start-*`, `end-*`), which mirror automatically; reserve the manual
   `useIsRTL()` hook pattern for cases like Atlas where positioning logic is genuinely conditional.
5. **No `--color-danger` token** *(open)* — see §9.2. Fix: promote to a token pair
   (`--color-danger` / `--color-danger-bg`) the same way `leaf`/`sky`/`amber` already work.
6. **No component-level style guide beyond this document** *(open)* — a Storybook-style catalog
   (even a single `/dev/components` route gated out of production) would make the `.card`/`.btn-*`
   /badge variants and Atlas's states easy to eyeball together.
7. **Icon size isn't tokenized** *(open, low priority)* — `13`/`14`/`16`/`18`/`20`/`24` all appear
   as literal `size={N}` props. Values already cluster sensibly; fold into item 1's work if picked
   up.
8. **A "dead footer" drifted from the live one** *(fixed 2026-08-16)* — `components/footer/*`
   (`Footer.tsx`, `Newsletter.tsx`, `FacetField.tsx`, `WorldClock.tsx`, `LiveCounter.tsx`) is a
   fully-built, styled component tree with **zero importers anywhere in the app** — the real,
   rendered footer is the unrelated top-level `components/Footer.tsx`. The orphaned
   `Newsletter.tsx` still faked an email-capture success state (an 800ms delay, then a checkmark,
   with the address never sent anywhere) — it was wired to a real backend endpoint and a real
   client-side checklist download so it's honest *if* it's ever reconnected, but as of this
   writing it renders nowhere. Treat anything under `components/footer/` as historical/unwired
   until a page actually imports it — see §10 for where this tree came from.

### 9.10 Component inventory (for orientation)

```
components/
  Navbar.tsx, MobileSidebar.tsx, MobileBottomNav.tsx   — navigation
  Logo.tsx, ThemeToggle.tsx, LanguageSwitcher.tsx        — chrome
  Footer.tsx                                             — the LIVE marketing footer
  Hero.tsx, HowItWorks.tsx, ServiceSection.tsx,
  MentorshipSection.tsx, ReviewsSection.tsx,
  LifeSupportSection.tsx, ClosingCTA.tsx, AiSuiteShowcase.tsx  — marketing sections
  HeroVideo.tsx, AirplanePath.tsx, FacetMask.tsx,
  ScrubTextAnimation.tsx, animations.tsx                 — motion/visual set pieces
  CommandPalette.tsx, Toast.tsx, Skeleton.tsx, SaveButton.tsx — app UI primitives
  AuthGuard.tsx, AdminGuard.tsx, RoleGuard.tsx, AuthSync.tsx — auth/access wrappers
  JobsCard.tsx, VisaChecklist.tsx, OpportunitiesPreview.tsx  — domain cards
  mascot/AtlasStage.tsx, mascot/AtlasPortrait.tsx        — Atlas
  pwa/PWAProvider.tsx, pwa/NotificationToggle.tsx        — PWA UI
  ui/interactive-globe.tsx, globe/GlobeScene.tsx         — R3F/three.js set pieces
  footer/*                                               — ORPHANED, unimported (§9.9 item 8)
```

82 pages across marketing (`/`, `/about`, `/pricing`, `/help`, `/contact`, legal pages), auth
(`/auth`, plus legacy `/login` `/register` `/signup` `/forgot-password` `/reset-password` routes),
the signed-in app (`(app)/*`), and admin (`(admin)/*`) — see §8 for the route-group breakdown.

**How to use §9**: when building a new screen, start from §9.2–§9.7 for the tokens and patterns
that already exist, and treat §9.9 as a checklist of traps to avoid repeating. If you change a
token or introduce a new pattern, update `DESIGN.md` in the same PR so it doesn't go stale the way
the old platform docs did — see §20's history of exactly that failure mode.

---

# 10. Animation system

Three cooperating layers, all gated on `prefers-reduced-motion`. This section also carries the full
original creative/technical spec for the landing page's signature motion system — folded in from
`frontend/design.md`, the founding brief that shaped what §10.4–§10.6 describe. That file is kept
in the repo as historical record of the reasoning; this is the current, single source of truth.

### 10.1 Layer 1 — Smooth scroll (Lenis)

`SmoothScroll` wraps the app and drives Lenis at `duration: 1.15` with an exponential ease. It:
- syncs Lenis's RAF loop with GSAP's ticker so ScrollTrigger stays in step
- intercepts `a[href^="#"]` clicks for eased in-page navigation
- **under reduced motion, does not initialise Lenis at all** — falls back to native scroll while
  leaving ScrollTrigger active, so reveal animations still work

```ts
const lenis = new Lenis({
  duration: 1.15,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.1,
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

One Lenis instance, one ticker — every `ScrollTrigger` on the page reads off that same loop rather
than the native scroll event. That single sentence is the entire meaning of "the whole page shares
one scroll engine": there is no giant monolithic GSAP timeline spanning every section, only one
shared clock that every section's independent `ScrollTrigger` is synced to.

### 10.2 Layer 2 — Scroll orchestration (GSAP + ScrollTrigger)

`ScrollOrchestrator` uses `gsap.matchMedia()` with `reduced` / `noReduced` conditions, so the
reduced-motion branch is a **separate timeline**, not a disabled one — see §10.4 for exactly what
it drives (the hero→curtain transition).

`MotionPathPlugin` powers `AirplanePath` — an aeroplane flying a curved path as a scroll-linked
metaphor for the journey.

### 10.3 Layer 3 — Component motion

| Component | Technique |
|---|---|
| `ScrubTextAnimation` | Per-word reveal scrubbed to scroll |
| `ServiceSection` | Mask-reveal (optional via `disableMaskAnimation`) |
| `FacetMask` / `FacetField` | Geometric facet transitions (§10.4–§10.6) |
| `LiveCounter` | Count-up on enter |
| `animations.tsx` | Shared fade/slide primitives |
| `interactive-globe` | 2D canvas globe — dots, arcs, drag-to-rotate |
| `GlobeScene` | React Three Fiber 3D globe |

CSS keyframes (`globals.css`): `fade-up` · `pulse-glow` · `spin-slow` · `float-bob` (Atlas). All are
disabled inside a global `@media (prefers-reduced-motion: reduce)` block that also clamps every
animation and transition to `0.01ms`.

> **Principle: animation must be caused.** Nothing loops decoratively. Motion is either
> scroll-linked (the user is driving it) or event-driven (something happened). This is enforced
> architecturally for Atlas — components cannot trigger animations, only emit events.

---

### 10.4 The landing page's signature system: `FacetMask`

**The concept, in one paragraph.** The signature visual is deliberately *not* literal "broken
glass" — that reads as damage or violence, wrong tone for a platform about safety and possibility.
It's reframed as **a window whose border has fractured into facets**: an irregular polygonal pane
that still holds together as one shape, like a windshield after a stone chip. That reframe is the
whole landing page's structural logic — moving abroad fractures your life into pieces (visa / home
/ people / work / logistics), and GlobalBridge is the frame that holds those pieces as one picture.
The five service areas are presented as **five facets of one pane**, numbered `01`–`05` in a real
chronological order (visa → housing → people → work → daily life), so the numbering encodes
sequence, not decoration.

One reusable component, `FacetMask`, renders this pane everywhere it appears: video in the hero,
photography everywhere else — five hand-drawn shape variants so repeated use never looks
copy-pasted:

| Variant | Used for | Character |
|---|---|---|
| `hero` | Hero video | Tall, largest, most irregular |
| `shard` | Visa, Jobs | Angular, works left or right |
| `drift` | Housing | Symmetric enough to "fly apart / reassemble" |
| `compact` | Mentorship (centered, small); reused again for review-card avatars and the footer's back-to-top button | Rounder, fewer facets |
| `wide` | Closing CTA | Low and wide |

**How the clip mechanism works.** An inline `<svg width="0" height="0">` defines a `<clipPath
clipPathUnits="objectBoundingBox">` built from one `<path>` of straight-line segments — facets, not
smooth curves, because straight edges read as faceted glass while curves read as a blob.
`objectBoundingBox` coordinates run 0–1, so the same path scales to any container: hero-scale,
section-scale, or the small centered Mentorship instance, with no per-size math. The media itself
(`<video>` or `<img>`, always `object-cover`) sits behind that clip path, with a soft blurred
radial `sky → clay` gradient glowing behind it. On top, a second `<svg>` (`viewBox="0 0 1 1"`)
draws the same outline plus 2–5 straight `<line>` elements radiating from a shared interior
"fracture origin" point to outer vertices — the crack seams. Every seam and the outline itself get
`pathLength={1}` with `strokeDasharray: 1; strokeDashoffset: 1`, so *any* GSAP tween can animate
`strokeDashoffset` from `1` to `0` for a "drawing itself in" effect regardless of the shape's actual
pixel length — the trick that makes the draw animation reusable across all five variants without
per-shape arithmetic.

```tsx
// components/FacetMask.tsx — the core render, abbreviated
<div className="facet-mask relative w-full h-full">
  <svg width="0" height="0" className="absolute" aria-hidden="true">
    <defs>
      <clipPath id={clipId} clipPathUnits="objectBoundingBox">
        <path d={shape.outline} />
      </clipPath>
    </defs>
  </svg>

  <div className="absolute -inset-6 -z-10 opacity-70 blur-2xl" style={{
    background: "radial-gradient(60% 60% at 40% 35%, var(--color-sky-500) 0%, var(--color-clay-500) 45%, transparent 75%)",
  }} />

  <div style={{ clipPath: `url(#${clipId})` }}>
    {media === "video"
      ? <video className="w-full h-full object-cover" src={src} autoPlay muted loop playsInline />
      : <img className="w-full h-full object-cover" src={src} alt={alt} />}
  </div>

  <svg className="absolute inset-0" viewBox="0 0 1 1" preserveAspectRatio="none">
    <path d={shape.outline} fill="none" stroke="var(--color-clay-500)" pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1 }} data-seam="outline" />
    {shape.seams.map(([x, y], i) => (
      <line key={i} x1={shape.origin[0]} y1={shape.origin[1]} x2={x} y2={y}
            stroke="var(--color-clay-500)" pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 1 }} data-seam="crack" />
    ))}
  </svg>
</div>
```

Usage is deliberately this simple everywhere it's placed:

```tsx
<FacetMask id="hero" variant="hero" media="video" src="/video/hero-loop.mp4" poster="/images/hero-poster.jpg" />
<FacetMask id="housing" variant="drift" media="image" src="https://images.unsplash.com/..." alt="Verified housing" />
```

### 10.5 The Hero → Visa pinned handoff

The one piece of choreography the original brief called out specifically: **hero text fades away
first → a slight zoom into the section → the hero pins → the next section rises on top of it like a
sheet being pulled over the pinned frame.** Everything else on the page runs on its own independent
`ScrollTrigger`; this is the only place besides the Reviews gallery (§10.6) that repurposes vertical
scroll into a different kind of motion, and that restraint is deliberate — over-using the trick
would cheapen both instances.

**Layout.** Two columns: hero copy in `#hero-text`, a `<FacetMask variant="hero" media="video">`
in `#hero-glass`. The next section — the Visa `ServiceSection` — is wrapped in `#section-visa` with
`-mt-[100vh]` and rounded top corners, so it visually sits as a sheet ready to rise.

**Why the negative margin has to match the pin distance exactly.** `pin: true` (with the default
`pinSpacing: true`) inserts a spacer element after the hero, sized to the pin's scroll distance
(`end: "+=100%"` — one viewport height). `#section-visa`'s `-mt-[100vh]` cancels that spacer so its
untransformed position sits directly under the pinned hero; the `yPercent` tween then slides it up
independently of the spacer. Change the pin distance and the margin has to change with it, or the
handoff visibly jumps.

**The timeline itself**, scrubbed to scroll, pinned to the hero section:

```ts
gsap.set(curtain, { yPercent: 100 });

const tl = gsap.timeline({
  scrollTrigger: { trigger: heroSection, start: "top top", end: "+=100%", scrub: 0.6, pin: true, anticipatePin: 1 },
});

tl.to(heroText,  { autoAlpha: 0, y: -50, ease: "power1.out" }, 0)      // 1. text fades + lifts, first
  .to(heroGlass, { scale: 1.08, ease: "none" },                0.05)  // 2. hero glass zooms in slightly
  .to(curtain,   { yPercent: 0, ease: "power2.inOut" },        0.45); // 3. curtain rises to cover the pinned hero

// 4. in parallel, the hero glass's own facet seams draw in — the fracture visibly
//    "forms" at the exact moment of the reveal, reinforcing the motif
tl.to(outline, { strokeDashoffset: 0, ease: "none" }, 0);
tl.to(seams,   { strokeDashoffset: 0, stagger: 0.02, ease: "none" }, 0.1);
```

Wrapped in `gsap.matchMedia()` so `prefers-reduced-motion: reduce` gets a static, fully-visible
fallback — `gsap.set([heroText, heroGlass], { clearProps: "all" })` — instead of the pin/zoom/
curtain sequence, which is why `ScrollOrchestrator` needs its own explicit reduced-motion branch
rather than relying on the global CSS clamp alone (that clamp handles duration, not structural pin
behaviour).

### 10.6 The four other sections — one signature interaction each

Per the original brief: not simple entry/exit fades. Every service section gets a distinct
interaction tied to what it actually does, all built on `ScrollTrigger` with `scrub` (so they're
scroll-*position*-driven, not autoplay), inside `gsap.matchMedia("(prefers-reduced-motion:
no-preference)")`.

**Shared entrance** (every `ServiceSection`, on approach): the `FacetMask` scales in `0.86 → 1`,
copy lines stagger up and fade, bullets stagger in from the side matching the section's layout
direction, the mask's own seams draw in, and a slow parallax drifts the underlying image
independently of the mask.

| Section | Signature motion | What it dramatizes |
|---|---|---|
| **Visa** | A checklist whose rows tick themselves off as you scroll down the section — each row's background fades in and its checkmark path draws, staggered one per quarter-scroll | "Step-by-step document checklist" made literal |
| **Housing** | A 3×3 grid of tiles, each a slice of the same photo, scatters apart on enter (`xPercent: ±140, rotation: ±25, autoAlpha: 0`) then animates back to `0` as you scroll in — the image visibly assembles itself from fragments | "Verified housing" — pieces coming together into one trustworthy whole |
| **Mentorship** | Six avatars pop in around a centered `FacetMask` with `back.out(1.6)` easing, staggered from the center outward, each connected by a curved path that draws in via the same `pathLength`/`strokeDashoffset` trick. After the scroll-driven entrance, each avatar gets an independent, *non-scroll-linked* float — the one deliberate exception to "everything is scroll-driven," used only for ambient life | A network of real people, not a static directory |
| **Jobs** | Two stat numbers count up (tweening a plain `{ val: 0 }` object and writing `Math.round(obj.val)` to `textContent` — no TextPlugin dependency) while a resume-card mock tilts in with a scroll-scrubbed pseudo-3D rotation | AI resume tuning, sponsorship-role scale |
| **Life Support** | *Deliberately* has no `FacetMask` at all — a plain icon grid, the one conscious rest beat after four visually heavy sections. Tiles fill row-by-row (`stagger: { grid: [2,2] }`); the Emergency SOS tile is the single place `--color-amber-500` appears, pulsing an ambient (non-scroll-linked) ring, because "always on" is the actual point of an SOS feature | A breathing room, then a genuine safety signal |

**Reviews — a pinned horizontal gallery.** Placed after Life Support, before the Closing CTA, and
deliberately *not* numbered `01`–`05` — it's proof for the five facets that came before, not a
sixth one. The section pins vertically while review cards scrub horizontally as the user keeps
scrolling down, the second and only other place on the page (besides §10.5) that repurposes
vertical scroll into different motion. Each review is tagged to exactly one service and shows that
tag as a `facet-label` (`"03 · Mentorship Network"`, same numbering as the sections) — a second
pass through the same five facets, this time as testimony, closing the loop before the CTA. Below
`768px`, or under reduced motion, the pin is skipped entirely and cards render as a plain vertical
stack — pinned horizontal scroll on a narrow viewport is a common source of janky, disorienting
mobile UX and isn't worth forcing.

**Closing CTA** reprises `FacetMask variant="wide"` one last time; the headline splits into
individual words that fly up and rotate in (`rotateX: -40 → 0`) — the same "assembling" language
used for Housing, now applied to the closing statement itself, closing the loop the hero opened.

### 10.7 The footer — the one deliberately over-engineered section

Per the brief, the footer was allowed to do more than it strictly needs to — every other section
earns its complexity from restraint, so the footer is the one exception. The rule it was held to:
**every extra piece still has to point back at something already established on the page** — it
can't be generic "cool footer" effects, or it breaks the storytelling cohesion the rest of the plan
is built on.

| Footer feature | Callback to |
|---|---|
| Facet-seam field background, drawn in on scroll | The `FacetMask` motif, reused as texture instead of a media window |
| World-clock strip (Toronto / London / Berlin / Sydney / Dublin) | The exact cities the Mentorship section's avatars live in |
| Live "students moved" counter, nudging up every 6–14s after its scroll-triggered count-up | The same count-up mechanic as the Jobs stat counters, reused at footer scale |
| Newsletter success = a checkmark that draws itself | The Visa checklist tick animation, reused as the "you're in" confirmation |
| "Break the glass" logo easter egg | The seam shatter/reassemble language from Housing, literalized as a click |
| Facet-shaped back-to-top button | `FacetMask variant="compact"`, the smallest instance of the component on the page |

**Status as of 2026-08-16: this entire tree is built but unwired.** `components/footer/Footer.tsx`
and everything under `components/footer/` exist, are fully styled, and match this spec — but have
**zero importers anywhere in the app**. The page that actually renders is the separate, simpler
`components/Footer.tsx` (link columns + brand banner, no facet field, no clocks, no easter egg —
see §9.10). The orphaned `Newsletter.tsx` specifically still matched this spec's checkmark-draw
success state without the submission ever going anywhere (an 800ms fake delay, no request) — that
was corrected to actually call a real backend endpoint and trigger a real client-side checklist
download, so the component is honest *if reconnected*, but nothing currently mounts it. Whether to
wire `components/footer/*` in (replacing the live `Footer.tsx`) or delete it as dead code is an
open decision, not yet made — see §20.

### 10.8 Accessibility & performance requirements for this system specifically

- Every scroll-triggered animation set is wrapped in `gsap.matchMedia().add("(prefers-reduced-
  motion: no-preference)", …)`, so `reduce` users get content visible-by-default with no motion,
  never a half-animated page.
- `ScrollOrchestrator`'s pin/curtain sequence needs its own explicit reduced branch (§10.5) because
  it's structural (a pin + spacer), not just a tween the global CSS clamp can neutralize.
- `:focus-visible` outlines stay on — never suppressed for visual cleanliness.
- `FacetMask` video is always `muted autoPlay loop playsInline` with a `poster`, so there's a paint
  before the video loads.
- `ScrollTrigger.refresh()` runs on `window.load`, since fonts and images can shift layout after
  first paint and desync pin start/end points.
- The footer's ambient ticker and clock (§10.7) both run on `setInterval`, not `ScrollTrigger` —
  worth confirming neither runs while `document.hidden`, to avoid wasted cycles in a background tab.
- The "break the glass" easter egg carries no information the user needs and is fully skipped under
  reduced motion; it's gated to replay at most once every few seconds so it can't become a spam toy.

---

# 11. The AI stack

### Next.js route handlers — user-facing tools

| Route | Feature |
|---|---|
| `/api/ai/chat` | Assistant — RAG + user context + conversation history |
| `/api/ai/scam-check` | Scam Shield — risk score, flagged phrases, advice |
| `/api/ai/visa-roadmap` | Stage-by-stage journey plan |
| `/api/ai/readiness` | Preparedness score |
| `/api/ai/doc-check` | Document analysis |
| `/api/ai/score-essay` | Essay feedback |
| `/api/ai/compare-countries` | Destination comparison |
| `/api/ai/translate` | Translation |

Every one follows the same shape:

```
OpenAI client (server-only key)
  → rateLimit(key, limit, windowMs)     cost-drain protection
  → strict-JSON system prompt
  → extractJson() parse
  → mockFallback() on any failure       feature still works, degraded
```

`mockFallback` is the reason Scam Shield still detects the sample scam with no API credits — a
deterministic heuristic stands in for the model.

### The AI Control Center — admin-configurable behaviour *(added 2026-08-16)*

All eight AI route handlers now read their model, temperature, system-prompt addendum, and
(for four of them) an enable/disable flag from **admin-configured platform settings** rather than
hardcoded values — this is what the admin console's "AI Control Center" page actually controls, as
opposed to a settings panel that only *looked* wired up.

```
platform_settings (DB) — ai_model, ai_temperature, ai_system_prompt,
                          ai_chat_enabled, ai_doc_check_enabled,
                          ai_scam_detection_enabled, ai_translation_enabled
        │
        ▼
GET /api/content/ai-config (Express, public, Cache-Control: 15s)
        │
        ▼
frontend/src/lib/aiConfig.ts — getAiConfig()
   in-memory 15s cache + hardcoded env-based defaults if the backend is unreachable
        │
        ▼
each /api/ai/* route handler:
   - model: aiConfig.ai_model               (was: hardcoded "gpt-4o")
   - temperature: aiConfig.ai_temperature   (was: hardcoded 0.3)
   - system prompt += aiConfig.ai_system_prompt   (admin guidance appended, not replaced)
   - chat / doc-check / scam-check / translate additionally check their *_enabled flag first
```

**The disabled-state honesty rule.** When an admin turns a feature off, the route does not fall
back to `mockFallback()` — that would mean the admin's "off" switch silently produces fake-but-
plausible AI output with zero indication anything changed, which is exactly the kind of dishonest
UI this whole platform's design philosophy argues against (§1, §9.1). Instead each gated route
returns an explicit disabled response: chat says the assistant "has been turned off by an admin,"
doc-check returns `{ disabled: true, ... }` with an honest summary, and scam-check — because it's a
safety tool — defaults to a *cautious* verdict rather than a falsely reassuring one when it can't
run. `translate` already had an honest `note: "translation-disabled"` fallback for the no-API-key
case and the flag was folded into that same condition.

**A real bug this wiring surfaced.** The seeded default for `ai_model` was `"claude-haiku-4-5"` — an
Anthropic model name, meaningless to the OpenAI client every route actually uses. Nobody had
noticed because nothing previously read that column; the moment it was wired in, every real AI call
would have started failing with a 404 from OpenAI (`"model does not exist"`). Caught before it
shipped by tracing the seed data, fixed to a valid OpenAI model (`gpt-4o-mini`, matching the
existing env-var default) in both the database and the settings page's own fallback default.

### RAG pipeline

```
question
  → POST /api/rag/search  (Express)
  → getEmbedding()        → embedding_cache, else OpenAI
  → pgvector cosine:  1 - (embedding <=> $1::vector)
  → threshold + top-k
  → injected into the system prompt
  → answer with cited source_url
```

**Graceful degradation is built in at every level.** If embedding fails (no key, no credits, rate
limit), the route falls back to Postgres full-text search (`ts_rank` + `plainto_tsquery`) and returns
`method: "text_fallback"`. Retrieval quality drops; the feature does not break.

### AI safety contract

Non-negotiable, enforced in the system prompts and documented in [`MASCOT.md`](MASCOT.md) §7:

1. Never claim or imply government authority
2. Never invent a rule, fee, deadline or URL
3. Always cite when quoting a specific rule or figure
4. Never promise an outcome
5. Escalate to humans (mentors, licensed advisors) when stakes exceed confidence

### Observability

`ai_usage_log` records tokens, latency, model and errors per request; `ai_feedback` records ratings.
The admin AI Control Center surfaces these as KPIs, trends and a conversation browser.

---

# 12. Atlas — the mascot engine

Full specification in [`MASCOT.md`](MASCOT.md). Architecture summary:

```
app surface  ──emit(event, params)──►  MascotEngine
                                        │
                                        ├─ EVENT_TABLE   event → emotion·mode·priority·ttl
                                        ├─ shouldSpeak() priority + anti-fatigue  (pure, tested)
                                        └─ dialogue      i18n key, else random variant
                                        │
                                        ▼
                                    AtlasStage — corner dock
                                    ├─ AtlasPortrait  (canonical render, cropped to bust)
                                    ├─ mode halo      (emotion → colour)
                                    └─ speech bubble + CTA
```

| File | Role |
|---|---|
| `mascot/types.ts` | 13 emotions, 5 modes, ~45 events, `EVENT_TABLE`, `MODE_COLOR`, `ATLAS_PALETTE` |
| `mascot/dialogue.ts` | Multi-variant lines; i18n-first resolution |
| `mascot/policy.ts` | `shouldSpeak()` — pure decision function |
| `mascot/MascotProvider.tsx` | State machine, journey context, `useMascot()` |
| `components/mascot/AtlasStage.tsx` | Dock, halo, bubble, mobile/RTL rules |
| `components/mascot/AtlasPortrait.tsx` | Frames `atlas.png` to head-and-shoulders |

### The two rules that matter

**Priority guard.** A lower-priority event can never replace an active higher-priority one — "I found
3 jobs" cannot bury a scam warning. Safety events use `ttl: 0` and pin until dismissed.

**Anti-fatigue.** Routine messages respect a 45s cooldown; a dismissed event doesn't return that
session; each consecutive dismissal adds 30s of quiet (capped at 5 min). Warnings and critical alerts
bypass all of it.

Priority tiers describe **interrupt authority, not sentiment** — which is why a transient `ERROR`
sits at `notable` beside milestones: both must surface, both should fade. Only things requiring
action pin.

### Why the corner uses a rendered image, not live 3D

A procedural three.js Atlas was built and evaluated. Seeing it rendered exposed real defects (the
face plane sat *inside* the head sphere, leaving him faceless) — but the deeper issue was that at
60–104px a rendered illustration simply reads better than primitives and matches the brand sheet
exactly. Emotion remains legible through the halo colour, float intensity (Guardian states go still)
and the message. The 3D implementation is preserved in git history at commit `ec5cb06`.

**Design note.** `atlas.png` has export-chrome buttons baked into its top-right corner.
`AtlasPortrait` windows a 208×208 region at `(270, 22)` — framing him as a bust *and* excluding the
chrome, which starts at `x=560`.

---

# 12b. Progressive Web App

GlobalBridge is installable and offline-aware. **The entire PWA layer is
additive** — if the service worker fails to register, `beforeinstallprompt` never
fires, or the Cache API is missing, the app behaves exactly as it did before.

### The rule that shapes the service worker

> **The Cache API is origin-scoped, not user-scoped.**

Anything cached survives sign-out and is readable by the next person to use that
browser. On shared and public machines — common for this audience — caching an
authenticated response is a data-leak primitive. So:

| Class | Strategy | Rationale |
|---|---|---|
| `/_next/static/*` | Cache-first, forever | Content-hashed; a hit is always correct |
| Images | Stale-while-revalidate, cap 60 | A slightly old avatar beats a blank box |
| Public pages only | Network-first, then cache | A stale signed-in shell shown to a signed-out user looks broken |
| **`/api/*`, `Authorization`, `_rsc`, Firebase, `/video/*`** | **Never cached** | Per-user data, or 23MB of video |

Written by hand (`public/sw.js`) rather than generated by Workbox/Serwist:
with a security boundary this specific, an opaque generated config is a
liability. Caches are versioned (`globalbridge-static-v1`) and non-owned caches
are deleted on activate.

**Verified:** after deliberately fetching an authenticated endpoint, a request
carrying `Authorization`, and a video range request, every cache was inspected —
zero sensitive entries.

### What works offline

| Available | Requires network |
|---|---|
| App shell, navigation, branding | AI Assistant, Scam Shield, Doc Checker |
| Previously visited public pages | Live jobs, housing, opportunities |
| Static toolkit information | Messaging, mentor booking, uploads |
| Cached images, Atlas UI | Any mutation |

`/offline` is a designed page — themed, translated, RTL-aware, with Atlas and a
retry — not a browser error screen.

### Connection state

`useNetworkStatus()` → `online | offline | reconnecting`.

`navigator.onLine` alone is untrustworthy: it reports whether a network
*interface* exists, so a captive portal, dead VPN or upstream-less router all
report `true`. When the browser claims we're back, the hook verifies with a real
`HEAD /api/health` before declaring online, backing off 2s→30s while it fails.

### Installability

`src/app/manifest.ts` → `/manifest.webmanifest`. **Chrome requires a PNG at both
192 and 512** — an SVG-only icon set parses fine but silently suppresses the
install prompt, which is exactly how installability was broken before this work.
Maskable icons are a separate entry, inset for Android's 80% circular safe zone.

The install prompt is captured, suppressed, and shown only after 25s, never when
already installed, and not again for 30 days after dismissal.

### Push notifications *(optional)*

Push **complements** the in-app system. `dispatchNotification()` writes the
`notifications` row first — the source of truth — then fans out to WebSocket and
web push. Without VAPID keys the backend warns once and sends become no-ops.

Permission is requested **only** from an explicit click in Settings. Asking on
load is the fastest route to a permanent block, which the user cannot undo from
the app.

Notifications tag by `kind` so repeats collapse, but `renotify` for `security`
and `deadline` so a safety alert is never swallowed. Clicking focuses an existing
tab and navigates it rather than opening a duplicate window.

### Files

| File | Role |
|---|---|
| `public/sw.js` | Caching, offline fallback, push, notification click |
| `src/app/manifest.ts` | Manifest |
| `src/app/offline/page.tsx` | Offline experience |
| `src/app/api/health/route.ts` | Same-origin liveness probe |
| `src/lib/pwa/useNetworkStatus.ts` | Connection + standalone detection |
| `src/lib/pwa/usePushNotifications.ts` | Subscription lifecycle |
| `src/components/pwa/PWAProvider.tsx` | SW registration, banners, install/update prompts |
| `src/components/pwa/NotificationToggle.tsx` | The only permission request site |
| `backend/src/lib/push.ts` | `dispatchNotification`, VAPID send, dead-sub pruning |

---

# 13. Internationalization

**14 languages:** en, fr, es, de, it, pt, ar, zh, ja, ko, ru, tr, hi, sw. Arabic is RTL.

### Mechanics
- `i18n/locales/*.json` — nested keys, `{param}` interpolation, plural forms via `Intl.PluralRules`
- `LocaleProvider` holds the active dictionary; `useTranslation()` exposes `t`, `lang`, `dir`,
  `isRTL`, and `Intl`-backed `formatDate` / `formatNumber` / `formatCurrency` / `formatRelativeTime`
- `i18n/middleware.ts` runs as Next middleware on all non-asset routes
- Language persists in the `gb-lang` cookie **and** `localStorage`; the cookie lets the server render
  the correct `lang`/`dir` on first paint

### Fallback behaviour
`t(key)` resolves against the active locale, then English, then returns the key itself. It also
treats machine-placeholder strings (`"[DE] Some text"`) as missing, so a half-translated file falls
back to English rather than rendering visible scaffolding.

**Atlas uses this deliberately:** `resolveMessage()` tries `mascot.<EVENT>` and — because a missing
key returns the key — detects the miss and falls back to a random English variant. Translations can
be added per-locale with no code change.

### RTL
`<html dir>` flips; the Atlas dock moves to bottom-**left** (watched via `MutationObserver`). Layout
mirrors via logical properties.

---

# 14. Real-time layer

WebSocket server attached to the Express HTTP server at `/ws`.

```
client connects  ws://host/ws?token=<firebase-id-token>
  → 10s AUTH_TIMEOUT to authenticate or be dropped
  → token verified, socket registered under userId
  → clients: Map<userId, Set<Client>>   (multi-device)
  → notifyUsers(userIds, payload) fans out
  → with Redis: pub/sub across instances; without: single-instance only
```

Used for message delivery and notification push.

> **Fixed bug worth remembering.** The client built its URL as `${NEXT_PUBLIC_WS_URL}/ws` while the
> env var already ended in `/ws`, producing `/ws/ws`. Every connection failed silently — real-time
> messaging never worked. The env var now carries the full path and the client appends only the
> query string.

---

# 15. Security

| Control | Implementation |
|---|---|
| Identity | Firebase Auth; Admin SDK verifies every token server-side, with `checkRevoked: true` (both REST *and* WebSocket — see below) |
| Transport | HTTPS in production; `helmet` sets CSP and hardening headers |
| CORS | Explicit allow-list via `CORS_ORIGIN` |
| CSRF | Origin/Referer validation on all mutating requests |
| Rate limiting | `express-rate-limit` globally at 1200 req/15min per IP (see below); per-key in-memory limiter on AI routes |
| Input validation | `zod` schemas on request bodies; search text passed through `escapeLike()` before use in `ILIKE` (see below) |
| SQL injection | Parameterised queries exclusively — no string interpolation |
| Authorization | Server-side on every endpoint; client guards are UX only |
| Session revocation | Admin suspend/delete calls `revokeRefreshTokens()` / `deleteUser()` server-side — not just a database flag (see below) |
| Audit | `admin_audit_log` records privileged actions with actor, target, metadata |
| Secrets | `.env` / `.env.local`, both gitignored; only `.env.example` is tracked |

### The CSRF subtlety

The guard originally rejected any mutating request without a valid `Origin` or `Referer`. Browsers
always send one and cannot forge it — that's what makes origin-checking work. But **server-to-server
calls send neither**, so the Next BFF layer calling Express was silently 403'd, breaking AI
conversation persistence and knowledge retrieval.

The fix lets through requests carrying *neither* header:

```ts
if (!origin && !referer) return next();   // not a browser → not a CSRF vector
```

Such a request still has to pass normal bearer-token auth. A **forged** cross-origin header is still
rejected — verified: `Origin: http://evil.example.com` → 403, legitimate origin → 200.

### "Suspend" and "Delete" now actually do what they say *(fixed 2026-08-16)*

Firebase ID tokens are stateless JWTs. Flipping `users.verification_status` to `'rejected'` in
Postgres — what admin "Suspend" originally did, across all four places an admin can trigger it
(the dedicated suspend action, the generic status-update route, the bulk-action endpoint, and the
general user-edit modal) — does **nothing** to a session a user already holds. Verified live: a
suspended test account's pre-existing, unexpired token kept working on every authenticated endpoint
until it happened to expire naturally, up to an hour later, and would have refreshed cleanly after
that since nothing on the Firebase side had actually changed. "Suspend" was, in practice, inert
against anyone already signed in — the exact scenario it exists for (stopping an abusive
already-logged-in user).

Fixed by calling `adminAuth.revokeRefreshTokens(firebase_uid)` at every one of those four call
sites. Combined with `checkRevoked: true` on `requireAuth` (already present) and — the matching gap
found alongside it — now also on the **WebSocket** auth handshake (`ws.ts` was verifying tokens
without the revocation check at all, meaning a revoked session could still open a live socket and
keep receiving push notifications and messages), a suspended user's very next request now fails
immediately. Verified live end-to-end: suspended a real test account mid-session, and its
still-unexpired token was rejected on both its next REST call and a fresh WebSocket connection
attempt (`1008 Invalid auth`).

Admin "Delete" had the mirror-image bug: it deleted the Postgres row but never called
`adminAuth.deleteUser()`, so the Firebase identity survived. Because `requireAuth` self-heals a
blank Postgres row for any verified Firebase user it doesn't recognize (by design, so a user who
registered but never completed profile setup isn't locked out), a deleted user's still-valid token
would silently **recreate their account** on the next request — an admin "delete" that undid
itself. Fixed to mirror the self-service account-deletion flow (same FK cleanup, then
`adminAuth.deleteUser()`) in both the single- and bulk-delete admin paths. Verified live: after
admin-deleting a test account, signing back in with its credentials now fails outright
(`INVALID_LOGIN_CREDENTIALS`) instead of quietly resurrecting it.

### Rate limiting sized for the actual audience *(raised 2026-08-16)*

The global limiter is keyed by IP with no per-user carve-out — which means the budget is **shared
by everyone behind the same public IP**. That's a real concern for this specific audience: students
on campus or dorm networks are commonly behind carrier-grade NAT, where dozens of people share one
address. The original limit (300 requests / 15 minutes) was demonstrated live to be too tight for
that scenario — normal manual testing alone burned through most of the budget. Raised to
1200/15min: still a meaningful backstop against abuse, no longer something ordinary shared-network
browsing can exhaust by accident.

### Search text and the `ILIKE` wildcard gap *(fixed 2026-08-16)*

Every free-text search endpoint (opportunities, jobs, forums, knowledge base, and both admin
user/content searches) wrapped user input directly in `%...%` for an `ILIKE` pattern without
escaping SQL's own wildcard characters. Not a SQL-injection risk (values are still parameterised),
but a real correctness bug: a literal `%` typed into a search box matched *every row*, and `_`
matched any single character. Verified live — searching literally for `%` returned all 100
opportunities in the database instead of roughly zero. Fixed with a shared `escapeLike()` helper
(`lib/sanitize.ts`) applied at every affected call site.

---

# 16. Accessibility

| Requirement | Implementation |
|---|---|
| Reduced motion | Lenis disabled; GSAP takes a separate `matchMedia` branch; all CSS animations clamped |
| Skip link | `SkipLink` → `#main-content` |
| Live regions | Atlas messages `aria-live="polite"`, escalating to `assertive` for warnings |
| Keyboard | All controls are real `<button>`/`<a>`; visible focus rings; ⌘K palette; `Esc` dismisses |
| Screen readers | Decorative visuals `aria-hidden`; meaningful icons paired with text |
| Colour | Never the sole signal — warnings pair colour with icon *and* wording |
| Touch targets | ≥ 44×44px; Atlas dock 60px mobile / 104px desktop |
| RTL | Full mirroring including mascot placement |

**Governing principle:** Atlas is an enhancement layer. Every warning, deadline and error also exists
as page text — losing the mascot entirely must lose no information.

---

# 17. Testing

**Vitest**, `environment: node`, `@` alias mapped to `src`.

| Suite | Files | Tests |
|---|---|---:|
| Backend | 8 | 37 |
| Frontend | 5 | 44 |
| **Total** | **13** | **81** |

Backend covers analytics, audit, auth middleware, auth routes, env validation, health probes,
knowledge and RAG. Frontend covers the AI suite, rate limiting, roles, utils and the mascot policy.

### Testing philosophy

Logic is extracted into **pure functions** so it can be tested without React, a router or the DOM —
`lib/roles.ts`, `lib/rate-limit.ts`, `mascot/policy.ts`. This is why the 45-second mascot cooldown is
verified in 250ms instead of by waiting in a browser.

Two mascot tests assert **invariants over data** rather than behaviour: every `warning`-or-above
event must have `ttl: 0`, and every auto-dismissing event must last ≥ 4s. The first caught a genuine
design error — `ERROR` classified as a pinning `warning` when it should fade.

```bash
cd frontend && npm test        # 44
cd backend  && npm test        # 37
npx tsc --noEmit               # both packages typecheck clean
```

---

# 18. Running locally

### Prerequisites
Node 20+, and either Docker (for local Postgres/Redis) or a hosted Postgres URL.

### One command

```bash
npm install
npm run dev
```

Starts backend (`:4000`) and frontend (`:3000`) together via `concurrently`, colour-coded
`[backend]` / `[frontend]`. Two terminals still work if you prefer:

```bash
cd backend  && npm run dev
cd frontend && npm run dev
```

### Database

```bash
docker compose up -d                                       # Postgres + Redis
cd backend && npx tsx run-migration.ts ../db/schema.sql
cd backend && npx tsx run-migration.ts ../db/migration_rag.sql
npm run seed:admin                                         # super admin
```

Or skip Docker entirely and point `DATABASE_URL` at hosted Postgres (the project uses Neon).

### Environment

`backend/.env`
```
PORT=4000
DATABASE_URL=postgresql://…            # Neon or local
REDIS_URL=                             # optional
CORS_ORIGIN=http://localhost:3000
FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY
OPENAI_API_KEY
```

`frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws     # note: includes /ws
NEXT_PUBLIC_FIREBASE_*
OPENAI_API_KEY                                # server-only, no NEXT_PUBLIC_
OPENAI_MODEL=gpt-4o-mini
```

> `OPENAI_API_KEY` must **not** carry the `NEXT_PUBLIC_` prefix — that would ship your key to every
> browser. It is read only inside route handlers, which run server-side.

### Useful scripts

| Command | Effect |
|---|---|
| `npm run seed:admin` | Create/promote the super admin |
| `npm run seed:knowledge` | Load the RAG corpus |
| `npm run embed:knowledge` | Generate embeddings |
| `npm run seed:opportunities` | Sample opportunities |

---

# 19. Deployment

| Component | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | Auto-deploys per push; PR preview deployments |
| Backend | **Railway** | `railway.toml`, Dockerfile build, health check on `/health` every 30s, restart on failure (max 3) |
| Database | **Neon** | Serverless Postgres + pgvector; cold starts drive the 12s pool timeout |
| Redis | Optional | Upstash or none |
| Auth | Firebase | Managed |

Vercel preview builds act as CI: `ignoreBuildErrors: false` means a type error fails the build.

### Production checklist
- [ ] `CORS_ORIGIN` set to the real frontend origin
- [ ] `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` point at the deployed backend (`wss://` in prod)
- [ ] Firebase Admin credentials present
- [ ] Both SQL files applied to the production database
- [ ] `npm run seed:admin` run once
- [ ] Rate limits reviewed for real traffic

---

# 20. Known gaps & technical debt

Stated plainly so they can be planned rather than discovered.

### Corrections to this section as of 2026-08-16

Two claims that stood in earlier versions of this document turned out to be **stale, not true
today** — caught while hands-on in the code for the security/correctness pass this update
describes. Leaving a known-wrong "known gap" in place would violate the exact principle this
document holds itself to, so both are corrected here rather than quietly dropped:

- ~~"push is wired but nothing calls `dispatchNotification()` yet for deadlines or messages"~~ —
  **false.** `messages.ts`'s `POST /send` calls `dispatchNotification()` for every new message,
  fanning out to the in-app row, WebSocket, and web push together. (Scheduled *deadline* reminders
  specifically are still not built — that part of the original claim stands, see below.)
- ~~"a bottom navigation bar for mobile was specified but not built"~~ — **false.**
  `MobileBottomNav.tsx` exists, is mounted from `(app)/layout.tsx`, and is the real mobile
  navigation described in §9.7.

### Schema management
There is **no migration framework** — SQL files and one-off scripts applied by hand (§6). This has
already caused one production-shaped bug: `ai_conversations.updated_at` was referenced by two
queries but never added to the schema, so listing conversations 500'd. As of 2026-08-16,
`db/schema.sql` is also one step behind the four tables/columns added this pass (§6) — a second,
smaller instance of the same underlying risk. Adopting a real migration tool
(Drizzle/Prisma/node-pg-migrate) with versioned, ordered migrations remains the highest-value
infrastructure fix available; every one-off `migrate-*.ts` script this project has ever needed is a
data point in favour of it.

### Rate limiting is per-instance
`lib/rate-limit.ts` (the AI-route limiter) keeps counters in process memory. Behind multiple
instances it under-counts by a factor of the instance count. Back it with Redis (`INCR` + `EXPIRE`)
before scaling horizontally. The global Express rate limiter (§15) has the same per-instance
limitation.

### WebSocket scaling
Without `REDIS_URL`, WebSocket delivery is single-instance only. Multi-instance deployments must
enable Redis pub/sub or users will miss messages depending on which instance they land on.

### Stale documentation removed *(resolved 2026-08-10)*
Earlier docs described a **Python/FastAPI AI microservice** that no longer exists — the AI moved into
Next.js route handlers. The old `SETUP.md` and `GLOBALBRIDGE_PLATFORM_DOCUMENTATION.md` both
instructed readers to `cd ai && uvicorn main:app`, a directory that isn't in the repo, so anyone
following them hit a dead end at step 4.

Both were deleted and replaced by this document; `README.md` was rewritten as a short entry point
that links here. Their content remains in git history if ever needed.

**The lesson worth keeping:** setup instructions rot silently, because the people who already have a
working environment never re-run them. If the architecture changes again, this section is the first
thing to update — and the corrections at the top of this section are that same lesson applied to
*this* document, not just the old ones.

### Mascot — specified but unbuilt
From [`MASCOT.md`](MASCOT.md) Part 31: compass bearing rotation, globe country highlighting,
onboarding flow events, mentorship/community emission, progress-linked compass gauge, notification
integration, `mascot.*` keys for the other 13 locales, per-session animation budget.

### PWA — unverified on real devices
The service worker, caching boundaries, manifest, offline page and endpoint
security were all verified against a production build. **Not verified:** the
actual install flow, iOS home-screen behaviour, real offline navigation, and
end-to-end push delivery — those need physical devices and VAPID keys.

Also outstanding: **scheduled** reminders (deadline/booking reminders that fire on a timer rather
than in response to a user action) still have nothing calling `dispatchNotification()` for them —
only event-driven notifications (new message, new booking) are wired; the 23MB hero video remains a
mobile-performance problem in its own right.

### The orphaned `components/footer/*` tree
Described fully in §9.9 (item 8) and §10.7. A complete, styled, on-brand implementation of the
footer specified in `frontend/design.md` exists in the codebase but is imported by nothing — the
page that actually renders is a simpler, unrelated `components/Footer.tsx`. This isn't dead code in
the usual "forgot to delete it" sense; it's a fully-built feature that was, at some point, swapped
out for a simpler one without the richer version being removed. **Decision needed:** either wire
`components/footer/*` in (it's the one place `dispatchNotification`-adjacent visual richness — the
world clocks, the live counter, the facet-seam background — currently exists at all), or delete it
so the component inventory in §9.10 stops carrying dead weight.

### Housing pagination
`GET /api/housing` accepts `limit` (capped at 100) but no `offset` — there's no way to page past
the first 100 results. Not yet a live bug (5 active listings in the database as of this writing),
but the identical gap on `/api/opportunities` *was* a live bug — silently capping results at the
first page with no way to see more, discovered only because the real database happened to already
hold over 100 rows. Worth closing before housing listings grow, rather than after.

### Test coverage
81 tests concentrate on pure logic. There is no component-rendering test suite (would need jsdom +
Testing Library) and no end-to-end suite. Route handlers are untested — the 2026-08-16 pass instead
verified route behaviour by exercising real endpoints live against the real database with
disposable test accounts (created, used, and deleted per check), which caught real bugs unit tests
on isolated logic couldn't have (cross-currency comparisons, timezone display, live data volume
exceeding a hardcoded page size) but leaves no lasting regression coverage behind. Converting the
highest-value of those into real route-handler tests is a natural next step.

### Other
- Legacy `JWT_SECRET` / `bcrypt` remain for the WebSocket path though Firebase is the real auth
- No ESLint config — `next lint` is deprecated and `eslint.config.js` was never added; `eslint.ignoreDuringBuilds: true`
- The `atlas.png` asset has export-chrome artefacts worked around in CSS rather than fixed at source
- The recurring local-dev symptom of Turbopack racing itself on `.next/static/development/
  _buildManifest.js.tmp.*` under heavy concurrent requests (observed repeatedly on Windows during
  this pass, always resolved by clearing `.next` and restarting) is a dev-server-only artifact — it
  does not reproduce in a production build (`next build && next start` has no such manifest-write
  path) and is noted here only so a future contributor on Windows doesn't mistake it for an app bug

---

*Verified against the codebase on 2026-08-10; re-verified and substantially expanded 2026-08-16.
Companion docs: [`MASCOT.md`](MASCOT.md), [`admin.md`](admin.md), [`DESIGN.md`](DESIGN.md).*
