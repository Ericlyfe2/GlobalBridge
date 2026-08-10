# GlobalBridge — Complete Technical Documentation

> **What this document is.** A single, accurate description of how GlobalBridge is actually built:
> the system architecture, the backend, the frontend, the data model, the design system, the
> animation layer, the AI stack, and the mascot engine — plus the reasoning behind each.
>
> Everything here was verified against the code on **2026-08-10**. Where a design has a non-obvious
> rationale, the rationale is stated; where something is a known gap, it is labelled as one rather
> than glossed over.

**Companion documents**
| Document | Covers |
|---|---|
| [`MASCOT.md`](MASCOT.md) | Atlas: character design, personality, dialogue, full interaction spec (31 parts) |
| [`admin.md`](admin.md) | Admin console: role hierarchy, all `/api/admin/*` endpoints, page inventory |
| [`audit/2026-07-09-platform-audit.md`](audit/2026-07-09-platform-audit.md) | Point-in-time platform audit |

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

**31 tables.** PostgreSQL 16 + pgvector. UUID primary keys throughout (`uuid_generate_v4()`).

### Identity & profiles
| Table | Purpose |
|---|---|
| `users` | Core identity. `role` enum, `verification_status`, country of origin/residence, `preferred_language` |
| `mentor_profiles` | Expertise, languages, universities, verification metadata |
| `employer_profiles` | Company info, visa sponsorship details |
| `user_documents` | Uploaded identity/credential documents |
| `permissions` | Fine-grained permission records |

### Journey
| Table | Purpose |
|---|---|
| `visa_checklists` | Per-user checklist state |
| `opportunities` | Scholarships, exchanges, internships, jobs |
| `crawled_opportunities` | Ingested listings pending verification |
| `housing_listings` | Marketplace listings with landlord status |
| `roommate_preferences` | Matching inputs |
| `saved_items` | Polymorphic saves (`item_type` + `item_id`) |
| `mentor_bookings` | Session bookings |

### Community
`forum_categories`, `forum_posts`, `forum_replies`, `success_stories`, `conversations`, `messages`,
`notifications`

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

### Schema management

There is **no migration framework**. Two SQL files are applied manually:

```bash
cd backend && npx tsx run-migration.ts ../db/schema.sql
cd backend && npx tsx run-migration.ts ../db/migration_rag.sql
```

Both are written idempotently (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) so they can
be re-run safely. **This is a real limitation** — see [§20](#20-known-gaps--technical-debt).

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
colour scale. Tokens become utilities automatically (`--color-clay-500` → `bg-clay-500`).

### Palette — "Ocean Blue + Teal"

| Token | Light | Role |
|---|---|---|
| `cream-50…400` | `#f8fafc` → `#94a3b8` | Backgrounds, borders, muted text |
| `clay-500…700` | `#0d9488` → `#115e59` | **Primary** — teal, CTAs |
| `ink-500…900` | `#64748b` → `#0f172a` | Text hierarchy |
| `leaf-500/600` | `#14b8a6` | Success, verified |
| `sky-500/600` | `#0284c7` | Info, links |
| `amber-500` | `#d97706` | Warning |
| `surface` | `#ffffff` | Cards |

Dark mode overrides the same variables under `.dark`, so **every component is theme-aware without
`dark:` variants** on colour utilities.

### Typography

| Token | Stack | Use |
|---|---|---|
| `--font-display` | Tiempos → Charter → Georgia, serif | Headings — editorial weight |
| `--font-sans` | Inter → Söhne → system-ui | Body |
| `--font-mono` | JetBrains Mono | Labels, data, `facet-label` |

The serif/sans pairing is the core of the visual identity: serif headings signal
institutional seriousness (this is about visas and money), sans body keeps density readable.

### Radii
`--radius-sm` 0.375rem · `md` 0.625rem · `lg` 1rem · `xl` 1.5rem

### Component conventions
- `.card`, `.btn-accent`, `.btn-ghost`, `.input`, `.badge-verified` as composed classes
- `Skeleton` for loading, `Toast` for transient feedback
- Icons: `lucide-react` at 13–20px inline with text
- `CommandPalette` (⌘K) for navigation; `MobileSidebar` for < 768px

---

# 10. Animation system

Three cooperating layers, all gated on `prefers-reduced-motion`.

### Layer 1 — Smooth scroll (Lenis)

`SmoothScroll` wraps the app and drives Lenis at `duration: 1.15` with an exponential ease. It:
- syncs Lenis's RAF loop with GSAP's ticker so ScrollTrigger stays in step
- intercepts `a[href^="#"]` clicks for eased in-page navigation
- **under reduced motion, does not initialise Lenis at all** — falls back to native scroll while
  leaving ScrollTrigger active, so reveal animations still work

### Layer 2 — Scroll orchestration (GSAP + ScrollTrigger)

`ScrollOrchestrator` uses `gsap.matchMedia()` with `reduced` / `noReduced` conditions, so the
reduced-motion branch is a **separate timeline**, not a disabled one. It drives the landing page's
hero→curtain transition (`#hero`, `#hero-text`, `#section-visa`).

`MotionPathPlugin` powers `AirplanePath` — an aeroplane flying a curved path as a scroll-linked
metaphor for the journey.

### Layer 3 — Component motion

| Component | Technique |
|---|---|
| `ScrubTextAnimation` | Per-word reveal scrubbed to scroll |
| `ServiceSection` | Mask-reveal (optional via `disableMaskAnimation`) |
| `FacetMask` / `FacetField` | Geometric facet transitions |
| `LiveCounter` | Count-up on enter |
| `animations.tsx` | Shared fade/slide primitives |
| `interactive-globe` | 2D canvas globe — dots, arcs, drag-to-rotate |
| `GlobeScene` | React Three Fiber 3D globe |

### CSS keyframes (`globals.css`)
`fade-up` · `pulse-glow` · `spin-slow` · `float-bob` (Atlas)

All are disabled inside a global `@media (prefers-reduced-motion: reduce)` block that also clamps
every animation and transition to `0.01ms`.

> **Principle: animation must be caused.** Nothing loops decoratively. Motion is either
> scroll-linked (the user is driving it) or event-driven (something happened). This is enforced
> architecturally for Atlas — components cannot trigger animations, only emit events.

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
| Identity | Firebase Auth; Admin SDK verifies every token server-side |
| Transport | HTTPS in production; `helmet` sets CSP and hardening headers |
| CORS | Explicit allow-list via `CORS_ORIGIN` |
| CSRF | Origin/Referer validation on all mutating requests |
| Rate limiting | `express-rate-limit` globally; per-key in-memory limiter on AI routes |
| Input validation | `zod` schemas on request bodies |
| SQL injection | Parameterised queries exclusively — no string interpolation |
| Authorization | Server-side on every endpoint; client guards are UX only |
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

### Schema management
There is **no migration framework** — two idempotent SQL files applied by hand. This has already
caused one production-shaped bug: `ai_conversations.updated_at` was referenced by two queries but
never added to the schema, so listing conversations 500'd. Adopting a real migration tool
(Drizzle/Prisma/node-pg-migrate) with versioned, ordered migrations is the highest-value
infrastructure fix available.

### Rate limiting is per-instance
`lib/rate-limit.ts` keeps counters in process memory. Behind multiple instances it under-counts by a
factor of the instance count. Back it with Redis (`INCR` + `EXPIRE`) before scaling horizontally.

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
thing to update.

### Mascot — specified but unbuilt
From [`MASCOT.md`](MASCOT.md) Part 31: compass bearing rotation, globe country highlighting,
onboarding flow events, mentorship/community emission, progress-linked compass gauge, notification
integration, `mascot.*` keys for the other 13 locales, per-session animation budget.

### Test coverage
81 tests concentrate on pure logic. There is no component-rendering test suite (would need jsdom +
Testing Library) and no end-to-end suite. Route handlers are untested.

### Other
- Legacy `JWT_SECRET` / `bcrypt` remain for the WebSocket path though Firebase is the real auth
- No ESLint config — `next lint` is deprecated and `eslint.config.js` was never added; `eslint.ignoreDuringBuilds: true`
- The `atlas.png` asset has export-chrome artefacts worked around in CSS rather than fixed at source

---

*Verified against the codebase on 2026-08-10. Companion docs: [`MASCOT.md`](MASCOT.md), [`admin.md`](admin.md).*
