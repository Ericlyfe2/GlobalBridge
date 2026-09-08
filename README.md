# 🌍 GlobalBridge

> Your trusted bridge to studying, working, and settling abroad.

An all-in-one platform for **international students and immigrants** — AI-guided visa support, a
verified housing marketplace, mentorship, jobs and scholarships filtered by visa sponsorship, and a
practical life-support toolkit. Built for every stage of the move: **before, during, and after**.

**🔗 Live:** https://global-bridge-nu.vercel.app

<sub>Group 8 Final Year Project · Academic Year 2024/2025</sub>

---

## Quick start

Node 20+ required.

```bash
npm install
npm run dev
```

Starts both services together — frontend on **:3000**, backend on **:4000**.

You'll need `backend/.env` and `frontend/.env.local` (see [ENV.md](ENV.md) and [docs/DATABASE.md](docs/DATABASE.md)) and a **development** Postgres database (not production).

For a local database:

```bash
docker compose up -d
cd backend && npx tsx run-migration.ts ../db/schema.sql
cd backend && npx tsx run-migration.ts ../db/migration_rag.sql
npm run seed:admin
```

If you use Neon, point `DATABASE_URL` at a **dev branch** (e.g. `globalbridge_dev`), then run `npm run unverify:seeds` after loading seed data so representative listings are not marked verified.

Full setup: **[docs/ARCHITECTURE.md §18–19](docs/ARCHITECTURE.md#18-running-locally)**.

---

## What is real vs representative

| Area | Status |
|------|--------|
| Auth, forums, messages, housing CRUD, opportunities API | **Functional** (needs DB + Firebase) |
| AI assistant, doc check, scam shield | **Functional** when Gemini key set; doc check reads metadata only, not file bytes |
| Opportunities / jobs listings | Mix of **seed data** and user posts; `is_verified` only true after admin review |
| Toolkit (cost, banking, uni success, sponsorship tracker) | **Representative static content** for demo |
| Community country hubs | **Illustrative** events/stats; mentor cards link to seed profiles when present |
| Payments (Stripe/Paystack) | **Not implemented** — pricing page describes planned tiers |
| UI i18n | **Static locale JSON** (14 languages) — no live machine translation API |
| Success stories | DB-backed; require admin `verified` before public display |

The UI should match this table. Seed scripts default `is_verified = false`.

---

## Documentation

| Document | Covers |
|---|---|
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | **Start here.** System architecture (with a full traced request example), backend, data model, auth, frontend, design system & landing-page animation spec, AI stack (incl. the admin-configurable AI Control Center), i18n, security, accessibility, testing, deployment, known gaps |
| [docs/DESIGN.md](docs/DESIGN.md) | Design-system audit — tokens, components, and where the implementation drifts from its own spec. Folded into ARCHITECTURE.md §9 too; kept standalone so a token change can update just this file |
| [docs/MASCOT.md](docs/MASCOT.md) | Atlas — character design, personality, dialogue, full interaction spec |
| [docs/admin.md](docs/admin.md) | Admin console — roles, endpoints, page inventory |
| [ENV.md](ENV.md) | Environment variables |
| [AGENTS.md](AGENTS.md) | Conventions for AI coding agents working in this repo |

---

## What's in the box

**Stack.** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · Express · PostgreSQL 16 +
pgvector · Firebase Auth · OpenAI · GSAP + Lenis.

**Scale.** 82 pages · 112 API endpoints across 14 routers · 35 tables · 14 languages · 81 tests.

**Features.** AI Visa Assistant (RAG-grounded, cites sources) · Scam Shield · Visa Roadmap ·
Document Checker · Readiness Score · verified housing · jobs with sponsorship filtering ·
scholarships · mentorship · forums and community · life toolkit · admin console · **Atlas**, the AI
companion that reacts to real events in your journey.

---

## Development

```bash
npm run dev                       # both services

cd frontend && npm test           # 44 tests
cd backend  && npm test           # 37 tests
npx tsc --noEmit                  # typecheck (run in either package)
```

**Branches:** `main` (production) · `feat/<scope>` (features).

---

## Team

**Group 8 — Final Year Project** · Academic Year 2024/2025

| Member | ID | Responsibility |
|---|---|---|
| Eric Asante | 3376122 | Backend, database, AI, deployment |
| Baddoo Jeremiah Nii Adotei | 3381622 | Frontend, UI/UX, design system |

---

<sub>Built with Next.js, Express, PostgreSQL and OpenAI. © 2025 GlobalBridge · Group 8 FYP.</sub>
