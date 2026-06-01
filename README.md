# GlobalBridge

Online platform for immigrant & student support — AI visa guidance, verified housing marketplace, mentorship, jobs, life-support toolkit.

**Group 8 FYP** | Academic Year 2024/2025
- Eric Asante (3376122) — Backend & Database
- Baddoo Jeremiah Nii Adotei (3381622) — Frontend & UI/UX

## Architecture

```
globalbridge/
├── frontend/      Next.js 15 + Tailwind v4 (React UI, SSR)
├── backend/       Node.js + Express (REST API + WebSocket)
├── ai/            Python + FastAPI (Visa assistant, doc checker)
├── db/            PostgreSQL schema + migrations
└── docker-compose.yml   Postgres + Redis local
```

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React.js / Next.js 15 (App Router) |
| Backend API | Node.js / Express (REST + WebSocket) |
| Database | PostgreSQL |
| Cache | Redis |
| AI Engine | Python / FastAPI |
| Auth | JWT / OAuth 2.0 |
| Translation | Google Translate API |
| Hosting | Vercel (frontend) + AWS/Heroku (backend) |
| Storage | AWS S3 / Cloudinary |
| Payments | Stripe / Paystack |
| Email/SMS | SendGrid / Twilio |

## Quick Start

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Frontend
cd frontend && npm install && npm run dev

# 3. Backend
cd backend && npm install && npm run dev

# 4. AI service
cd ai && pip install -r requirements.txt && uvicorn main:app --reload
```

Frontend: http://localhost:3000
Backend: http://localhost:4000
AI: http://localhost:8000
