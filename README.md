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

You'll need `backend/.env` and `frontend/.env.local` (see [ENV.md](ENV.md)) and a Postgres database.
For a local one:

```bash
docker compose up -d
cd backend && npx tsx run-migration.ts ../db/schema.sql
cd backend && npx tsx run-migration.ts ../db/migration_rag.sql
npm run seed:admin
```

Full setup, environment variables and deployment: **[docs/ARCHITECTURE.md §18–19](docs/ARCHITECTURE.md#18-running-locally)**.

---

## Documentation

| Document | Covers |
|---|---|
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | **Start here.** System architecture, backend, data model, auth, frontend, design system, animation, AI stack, i18n, security, accessibility, testing, deployment, known gaps |
| [docs/MASCOT.md](docs/MASCOT.md) | Atlas — character design, personality, dialogue, full interaction spec |
| [docs/admin.md](docs/admin.md) | Admin console — roles, endpoints, page inventory |
| [ENV.md](ENV.md) | Environment variables |
| [AGENTS.md](AGENTS.md) | Conventions for AI coding agents working in this repo |

---

## What's in the box

**Stack.** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · Express · PostgreSQL 16 +
pgvector · Firebase Auth · OpenAI · GSAP + Lenis.

**Scale.** 82 pages · 112 API endpoints across 14 routers · 31 tables · 14 languages · 81 tests.

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
