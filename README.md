# 🌍 GlobalBridge

> Your trusted bridge to studying, working, and settling abroad.

GlobalBridge is an all-in-one platform for **international students and immigrants** — combining AI-guided visa support, a verified housing marketplace, mentorship, job & scholarship opportunities, and a practical life-support toolkit into one secure product built for every stage of the journey: **before, during, and after** the move.

**🔗 Live demo:** https://global-bridge-nu.vercel.app

<sub>Group 8 Final Year Project · Academic Year 2024/2025</sub>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Internationalization](#internationalization)
- [Testing](#testing)
- [Deployment](#deployment)
- [Team](#team)

---

## Overview

Moving abroad means juggling visas, housing scams, unfamiliar banking, healthcare, taxes, job hunting, and culture shock — usually across a dozen disconnected websites. GlobalBridge unifies these into a single, role-aware platform:

| Role | What they get |
|------|---------------|
| **Student / Immigrant** | AI visa guidance, verified housing, scholarship & job matching, a settling-in toolkit, and a supportive community. |
| **Mentor** | A profile to guide newcomers, answer questions, and share success stories. |
| **Employer** | Post sponsorship-friendly jobs and reach a global talent pool. |
| **Admin** | Moderate listings, verify users, and review reports. |

The platform is multilingual (14 languages), dark-mode aware, and designed around trust signals — verified listings, scam alerts, and bank-grade security messaging.

---

## Features

### Core platform
- **AI-guided visa support** — conversational assistant, personalized document checklists, and country comparison.
- **Verified housing marketplace** — browse and post listings, roommate preferences, and scam-flagged safety checks.
- **Opportunities** — scholarships, programs, and sponsorship-friendly jobs with matching tools.
- **Community & forums** — mentor directory, country-specific spaces, safe space, and discussion forums.
- **Direct messaging** — real-time chat over WebSockets.
- **Success stories** — real journeys from students who've made the move.

### AI toolkit (`/tools`)
- **AI Assistant** — chat-based visa & immigration guidance
- **Document Checker** — validate visa/application documents
- **Scholarship Matcher** — find scholarships that fit your profile
- **Country Compare** — side-by-side destination comparison
- **Application Coach**, **Peer Review**, **Timeline planner**, **University Success** guides
- **Essay scoring** for applications

### Life & settling-in toolkit (`/toolkit`)
Banking · Cost of living calculator · Student discounts · International fund transfer · Healthcare · SIM & connectivity · Emergency SOS · Tax · Public transit

### Admin console (`/admin`)
User management · Listing moderation · Verification queue · Report review · AI oversight

---

## Architecture

```
[ Browser ]
     │
     ▼
[ Next.js 15  :3000 ]  ── /api/* rewrites ──▶  [ Express API  :4000 ]
   App Router, SSR                                    │ uses
   Server routes for AI                               ▼
        │                                    [ PostgreSQL  :5432 ]
        │ (some AI called                    [ Redis        :6379 ]
        │  directly from                            │ proxies
        │  Next server routes)                       ▼
        └───────────────────────────────▶  [ FastAPI AI  :8000 ]
                                                     │ uses
                                                     ▼
                                          [ OpenAI ]
                                          [ Google Translate ]
```

GlobalBridge is a **polyglot monorepo** of four cooperating services: a Next.js frontend, an Express REST + WebSocket API, a Python/FastAPI AI microservice, and a PostgreSQL database (with Redis for caching).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router, Turbopack), React 19, Tailwind CSS v4, TypeScript |
| **UI / motion** | Framer Motion, GSAP + Lenis (smooth scroll), Three.js / React Three Fiber, lucide-react, flag-icons |
| **Backend API** | Node.js, Express 4, TypeScript, WebSocket (`ws`), Zod validation |
| **Security** | Helmet, CORS, CSRF protection, rate limiting, bcrypt |
| **Database** | PostgreSQL (`pg`), Redis (`ioredis` / Upstash) |
| **AI service** | Python, FastAPI, OpenAI SDK |
| **Auth** | Firebase Authentication (Admin SDK on the backend) + JWT (WS) |
| **i18n** | Custom i18n layer, 14 locales, Google Translate for dynamic content |
| **Testing** | Vitest (frontend & backend) |
| **Hosting** | Vercel (frontend); backend/AI on Railway/Heroku/Fargate; Postgres on Neon; Redis on Upstash |

---

## Repository Structure

```
GlobalBridge/
├── frontend/                 Next.js 15 app (React UI, SSR, server AI routes)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/        Authenticated product (dashboard, tools, toolkit, community…)
│   │   │   ├── (auth)/       Login, register, password reset, verify email
│   │   │   ├── (admin)/      Admin console
│   │   │   ├── api/          Next server routes (AI chat, translate, essay scoring…)
│   │   │   └── auth/         Combined sign-in / sign-up screen
│   │   ├── components/       Navbar, Footer, Logo, globe, theme toggle…
│   │   ├── i18n/locales/     14 language JSON files
│   │   ├── lib/              auth, roles, rate-limit, upload, utils
│   │   └── data/             Static data
│   └── public/video/         Background videos (compressed)
│
├── backend/                  Express REST API + WebSocket server
│   └── src/
│       ├── routes/           auth, users, opportunities, housing, forums,
│       │                     messages, jobs, ai, moderation, content, uploads
│       ├── middleware/       auth, csrf, error
│       ├── lib/              firebase-admin, sanitize, storage
│       ├── db.ts / env.ts    DB pool + validated env schema
│       ├── ws.ts             WebSocket server
│       └── index.ts          App entry
│
├── ai/                       Python / FastAPI AI microservice
│   ├── main.py               FastAPI app (/chat, /checklist, /doc-check, /translate)
│   ├── visa_assistant.py     Conversational visa guidance
│   ├── checklist_generator.py
│   ├── doc_checker.py
│   └── translator.py
│
├── db/                       PostgreSQL
│   ├── schema.sql            18 tables (users, housing, forums, AI, reports…)
│   └── seed.sql              Sample data
│
├── docs/                     Project documentation & report
├── docker-compose.yml        Local Postgres + Redis
├── ENV.md                    Full environment variable reference
└── SETUP.md                  Detailed setup guide
```

---

## Getting Started

### Prerequisites
- **Node.js** 20+
- **Python** 3.11+
- **Docker** (for Postgres + Redis)
- **npm** (or pnpm)

### 1. Start Postgres + Redis

```bash
docker compose up -d
```

Schema auto-loads from `db/schema.sql` on first start.

### 2. Backend (Express API → http://localhost:4000)

```bash
cd backend
cp .env.example .env      # then fill in Firebase Admin credentials
npm install
npm run dev
```

Health check: `GET /health`

### 3. AI service (FastAPI → http://localhost:8000)

```bash
cd ai
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env             # set OPENAI_API_KEY for AI features
uvicorn main:app --reload --port 8000
```

### 4. Frontend (Next.js → http://localhost:3000)

```bash
cd frontend
cp .env.example .env.local       # set NEXT_PUBLIC_API_URL + Firebase keys
npm install
npm run dev
```

> **Windows note:** PowerShell before v7 doesn't support `&&`. Run each command on its own line, or upgrade to pwsh 7+.

### 5. Smoke test
1. Open http://localhost:3000 — landing page loads.
2. **Get started** → register a student account → land on the dashboard.
3. Open **AI Assistant** and ask a visa question.

See [SETUP.md](SETUP.md) for the full guide.

---

## Environment Variables

Each service is configured via its own `.env` file. The backend validates required variables with a Zod schema (`backend/src/env.ts`) and degrades gracefully when optional services (Postgres, Redis) are absent.

See **[ENV.md](ENV.md)** for the complete reference. Key variables:

| Service | Required | Purpose |
|---------|----------|---------|
| Backend | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin auth |
| AI | `OPENAI_API_KEY` | OpenAI-powered features |
| Frontend | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_FIREBASE_*`, `OPENAI_API_KEY` | API base, Firebase web auth, server AI routes |

---

## API Reference

### Backend REST (`http://localhost:4000`)

| Base path | Responsibility |
|-----------|----------------|
| `/health` | Service health check |
| `/api/auth` | Register, login, session |
| `/api/users` | Profiles, roles |
| `/api/opportunities` | Scholarships & programs |
| `/api/housing` | Housing listings & roommate prefs |
| `/api/jobs` | Job postings & sponsorship |
| `/api/forums` | Categories, posts, replies |
| `/api/messages` | Conversations & direct messages |
| `/api/ai` | Proxy to the AI microservice |
| `/api/content` | Success stories, scam alerts, static content |
| `/api/moderation` | Reports & admin moderation |
| `/api/uploads` | File uploads (auth-protected static serving) |
| `ws://…/ws` | Real-time messaging (WebSocket) |

Requests pass through Helmet, CORS, CSRF protection, rate limiting, and JSON body limits.

### AI microservice (`http://localhost:8000`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/health` | Health check |
| `POST` | `/chat` | Conversational visa/immigration assistant |
| `POST` | `/checklist` | Generate a personalized visa document checklist |
| `POST` | `/doc-check` | Validate an uploaded document |
| `POST` | `/translate` | Translate content |

### Frontend server routes (Next.js)

`/api/ai/chat` · `/api/ai/compare-countries` · `/api/ai/doc-check` · `/api/ai/score-essay` · `/api/ai/translate` · `/api/i18n/translate-dynamic`

---

## Database Schema

PostgreSQL, 18 tables (see [`db/schema.sql`](db/schema.sql)):

**Identity** — `users`, `mentor_profiles`, `employer_profiles`
**Marketplace** — `opportunities`, `housing_listings`, `roommate_preferences`
**Community** — `forum_categories`, `forum_posts`, `forum_replies`, `success_stories`
**Messaging** — `conversations`, `messages`
**AI** — `ai_conversations`, `ai_messages`, `visa_checklists`
**Trust & safety** — `reports`, `scam_alerts`

Seed data is available in [`db/seed.sql`](db/seed.sql).

---

## Internationalization

The UI ships in **14 languages**, with JSON locale files in `frontend/src/i18n/locales/`:

`ar` · `de` · `en` · `es` · `fr` · `hi` · `it` · `ja` · `ko` · `pt` · `ru` · `sw` · `tr` · `zh`

Static UI strings come from the locale files; dynamic user content is translated on demand via the Google Translate integration (`/api/i18n/translate-dynamic`), cached in Redis.

---

## Testing

```bash
# Frontend (Vitest)
cd frontend && npm test

# Backend (Vitest, with coverage available)
cd backend && npm test

# Type checks
cd frontend && npx tsc --noEmit
cd backend  && npm run typecheck
```

---

## Deployment

| Component | Platform |
|-----------|----------|
| Frontend | **Vercel** (`vercel --prod` from `frontend/`) — auto-deploys on push to `main` |
| Backend | Railway / Heroku / AWS Elastic Beanstalk |
| AI service | Railway / Google Cloud Run / AWS Fargate |
| Postgres | Neon / AWS RDS |
| Redis | Upstash / AWS ElastiCache |
| Storage | Cloudinary / AWS S3 |

Set the production environment variables per service (see [ENV.md](ENV.md)).

---

## Team

**Group 8 — Final Year Project** · Academic Year 2024/2025

| Member | ID | Responsibility |
|--------|-----|----------------|
| Eric Asante | 3376122 | Backend, AI service, database, deployment |
| Baddoo Jeremiah Nii Adotei | 3381622 | Frontend, UI/UX, design system |

**Branch convention:** `main` (production) · `dev` (integration) · `feat/<scope>` (features)

---

<sub>Built with Next.js, Express, FastAPI, and OpenAI. © 2025 GlobalBridge · Group 8 FYP.</sub>
