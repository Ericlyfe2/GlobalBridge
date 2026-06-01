# GlobalBridge — Setup Guide

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker** (for Postgres + Redis)
- **npm** or **pnpm**

## 1. Clone & Install

```bash
# From the repo root
cd "Madam Linda"
```

## 2. Start Postgres + Redis

```bash
docker compose up -d
```

Verify:
```bash
docker ps
# Expect: globalbridge_postgres, globalbridge_redis
```

Database schema auto-loads from `db/schema.sql` on first start.

## 3. Backend (Express API)

**PowerShell (Windows):**
```powershell
cd backend
Copy-Item .env.example .env
# Edit .env — set JWT_SECRET to long random string
npm install
npm run dev
```

**Bash (macOS/Linux/Git Bash):**
```bash
cd backend && cp .env.example .env && npm install && npm run dev
```

Backend runs on **http://localhost:4000**. Health: `GET /health`.

## 4. AI Service (FastAPI)

**PowerShell:**
```powershell
cd ai
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env — set ANTHROPIC_API_KEY (optional)
uvicorn main:app --reload --port 8000
```

**Bash:**
```bash
cd ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

AI service runs on **http://localhost:8000**. Health: `GET /health`.

## 5. Frontend (Next.js)

**PowerShell:**
```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

**Bash:**
```bash
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Frontend runs on **http://localhost:3000**.

> **Windows PowerShell note:** Pre-pwsh 7 doesn't support `&&`. Run commands separately or use `;` (continues on error). Upgrade to pwsh 7+ for bash-like chaining.

## 6. Smoke Test

1. Open http://localhost:3000 — landing page should load with warm Claude palette.
2. Click **Get started** → register a student account.
3. Land on dashboard.
4. Click **AI Assistant** in sidebar → ask a visa question.

## Architecture

```
[ Browser ]
     ↓
[ Next.js :3000 ] —— rewrites /api/* ——→ [ Express :4000 ]
                                              ↓ uses
                                         [ Postgres :5432 ]
                                         [ Redis :6379 ]
                                              ↓ proxies AI
                                         [ FastAPI :8000 ]
                                              ↓ uses
                                         [ Anthropic Claude ]
                                         [ Google Translate ]
```

## Production Deployment

- **Frontend**: Vercel (`vercel --prod` from `frontend/`)
- **Backend**: Heroku, Railway, or AWS Elastic Beanstalk
- **AI Service**: AWS Fargate, Google Cloud Run, or Railway
- **Postgres**: Neon, AWS RDS, or any managed Postgres provider
- **Redis**: Upstash or AWS ElastiCache
- **Storage**: Cloudinary or AWS S3

Set production env vars per service.

## Team Workflow

| Member | Owns |
|---|---|
| Eric Asante (3376122) | `backend/`, `ai/`, `db/`, deployment |
| Baddoo Jeremiah (3381622) | `frontend/`, UI/UX, design system |

Branch convention:
- `main` — production-ready
- `dev` — integration
- `feat/<scope>` — per feature

## Useful Commands

```bash
# Reset DB
docker compose down -v && docker compose up -d

# Backend logs
docker compose logs -f postgres

# Type check frontend
cd frontend && npx tsc --noEmit

# Run AI service in production mode
cd ai && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
