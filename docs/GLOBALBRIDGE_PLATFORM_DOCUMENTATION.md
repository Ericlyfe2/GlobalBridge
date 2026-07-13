# GlobalBridge Platform Documentation

> **Final Year Project — Group 8**  
> Academic Year 2024/2025  
> Supervisors: Mr. Ernest Osei & Mr. Michael Agyemang Adarkwah

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Getting Started](#4-getting-started)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [AI Microservice](#7-ai-microservice)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Internationalization (i18n)](#11-internationalization-i18n)
12. [Real-Time Features](#12-real-time-features)
13. [Deployment](#13-deployment)
14. [Testing](#14-testing)
15. [Contributing](#15-contributing)

---

## 1. Project Overview

GlobalBridge is a comprehensive digital platform designed to support international students and immigrants throughout their journey abroad. The platform provides AI-powered visa guidance, verified housing marketplace, structured mentorship, job matching with visa-sponsor filtering, and a life-support toolkit — all accessible in 14 languages.

### Problem Statement

International students and immigrants face fragmented, expensive, and unreliable support systems. Information is scattered across government websites, forums, and costly consultants. Students struggle with visa applications, finding verified housing, securing jobs that sponsor visas, and connecting with mentors who understand their destination country.

### Solution

GlobalBridge unifies everything into a single AI-powered platform:

- **AI Visa Assistant** — Conversational guidance for any visa type with step-by-step document checklists
- **Verified Housing Marketplace** — Identity-checked landlords with roommate matching
- **Mentorship Network** — Connect with verified mentors who have lived in your destination
- **Jobs & Internships** — Filter by visa sponsorship, AI resume builder, sponsorship-history tracker
- **Life Support Toolkit** — Cost calculators, healthcare guides, banking setup, emergency SOS
- **14 Languages** — Full platform translation with instant switching

### Team

| Member | Role |
|---|---|
| Eric Asante (3376122) | Backend & Database |
| Baddoo Jeremiah Nii Adotei (3381622) | Frontend & UI/UX |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js 15 (App Router)                 │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐   │   │
│  │  │  Pages  │ │Components│ │  i18n  │ │  Auth    │   │   │
│  │  │  (50+)  │ │  (20+)   │ │14 langs│ │Firebase  │   │   │
│  │  └─────────┘ └──────────┘ └────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Next.js)                    │
│              Rewrites /api/* → Express Backend               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Express.js + TypeScript                    │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌─────────┐   │   │
│  │  │ Auth │ │Users │ │  AI  │ │Msg   │ │WebSocket│   │   │
│  │  │Routes│ │Routes│ │Proxy │ │Routes│ │  /ws    │   │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └─────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└───────┬──────────────────────────────┬──────────────────────┘
        │                              │
        ▼                              ▼
┌───────────────┐           ┌──────────────────┐
│  PostgreSQL   │           │   Redis (Opt.)   │
│  (18 tables)  │           │  Cache + Pub/Sub  │
└───────────────┘           └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI MICROSERVICE                           │
│           Python / FastAPI + OpenAI API                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │   Chat   │ │Checklist │ │Doc Check │ │  Translator  │   │
│  │ Assistant│ │ Generator│ │   + AI   │ │  Google/OpenAI│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Browser → Next.js**: All requests hit the Next.js server first
2. **Next.js → Express**: API routes are proxied to the Express backend via rewrites (eliminates CORS)
3. **Firebase Auth**: Authentication is handled entirely by Firebase — the frontend uses the Firebase JS SDK, the backend verifies tokens via Firebase Admin SDK
4. **Express → AI**: The AI proxy routes in Express forward chat/checklist/document requests to the Python microservice
5. **WebSocket**: Real-time messaging uses a WebSocket server attached to the Express HTTP server, with optional Redis pub/sub for multi-instance support

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.5.18 | React framework with App Router |
| React | 19.1.0 | UI library |
| TypeScript | 5.6.3 | Type safety |
| Tailwind CSS | 4.3.0 | Utility-first styling |
| Firebase JS SDK | 11.10.0 | Client-side authentication |
| Lucide React | 0.460.0 | Icon library |
| flag-icons | 7.5.0 | Country flag CSS |
| clsx / tailwind-merge | — | Class name utilities |
| @OpenAI-ai/sdk | — | Direct OpenAI API integration (server routes) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express.js | — | HTTP framework |
| TypeScript | — | Type safety |
| PostgreSQL (pg) | — | Primary database |
| Redis (ioredis) | — | Caching & pub/sub |
| Firebase Admin SDK | — | Token verification |
| Zod | — | Schema validation |
| ws | — | WebSocket server |
| Helmet | — | Security headers |
| Compression | — | Gzip/brotli |
| bcrypt | — | Legacy password hashing |
| jsonwebtoken | — | Legacy JWT (for WebSocket) |

### AI Microservice

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.115.5 | HTTP framework |
| OpenAI SDK | 0.39.0 | OpenAI API client |
| Google Cloud Translate | 3.18.0 | Translation provider |
| Uvicorn | 0.32.0 | ASGI server |
| httpx | 0.27.2 | Async HTTP client |

### Database

| Technology | Purpose |
|---|---|
| PostgreSQL 16 | Primary relational database |
| Redis 7 | In-memory cache & WebSocket pub/sub |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker Compose | Local development (Postgres + Redis) |
| Railway | Backend deployment |
| Vercel | Frontend deployment |
| Cloudinary | Image hosting (planned) |

---

## 4. Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop
- npm or pnpm

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Ericlyfe2/GlobalBridge.git
cd GlobalBridge

# 2. Start PostgreSQL and Redis
docker compose up -d

# 3. Set up the backend
cd backend
cp .env.example .env    # Edit with your Firebase credentials
npm install
npm run dev

# 4. Set up the frontend (in a new terminal)
cd frontend
cp .env.example .env.local    # Edit with your Firebase credentials
npm install
npm run dev

# 5. Set up the AI service (in a new terminal)
cd ai
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate    # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Environment Variables

#### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

#### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://globalbridge:globalbridge@localhost:5432/globalbridge
REDIS_URL=redis://localhost:6379
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-at-least-32-chars-long
```

#### AI Service (`ai/.env`)

```env
OPENAI_API_KEY=sk-ant-...
GOOGLE_APPLICATION_CREDENTIALS=
```

### Smoke Test Checklist

- [ ] `http://localhost:3000` loads the landing page
- [ ] Clicking "Get Started" navigates to signup
- [ ] Creating an account works (Firebase)
- [ ] Language switcher changes all text instantly
- [ ] Dashboard loads with real data
- [ ] AI Assistant responds to questions
- [ ] Housing listings are visible
- [ ] Jobs with visa sponsorship are filterable
- [ ] Dark mode toggle works
- [ ] Mobile responsive layout

---

## 5. Frontend Architecture

### Directory Structure

```
frontend/src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout (LocaleProvider, ToastProvider, AuthSync)
│   ├── page.tsx              # Landing page
│   ├── globals.css           # Global styles (Tailwind + RTL)
│   ├── error.tsx             # Error boundary
│   ├── not-found.tsx         # 404 page
│   ├── middleware.ts         # Next.js middleware (i18n detection)
│   ├── (auth)/               # Unauthenticated route group
│   │   ├── layout.tsx        # Auth layout (split-screen design)
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   ├── (app)/                # Authenticated route group
│   │   ├── layout.tsx        # App layout (sidebar + header + LanguageSwitcher)
│   │   ├── dashboard/        # Role-specific dashboards
│   │   │   ├── student/      # Profile completion, visa progress, deadlines
│   │   │   ├── mentor/       # Mentee stats, sessions, community impact
│   │   │   ├── employer/     # Listings, candidates, sponsorship rate
│   │   │   └── admin/        # Platform analytics (redirects to /admin)
│   │   ├── assistant/        # AI chat interface
│   │   ├── opportunities/    # Scholarships & exchanges
│   │   ├── housing/          # Housing marketplace
│   │   ├── jobs/             # Job listings with visa filter
│   │   ├── community/        # Mentors, discussions, safe space
│   │   ├── forums/           # Discussion forums
│   │   ├── messages/         # Direct messaging
│   │   ├── notifications/    # User notifications
│   │   ├── settings/         # User preferences
│   │   ├── toolkit/          # Life support tools
│   │   ├── tools/            # Productivity tools
│   │   ├── stories/          # Success stories
│   │   ├── scam-alerts/      # Community scam reports
│   │   ├── library/          # Resource library
│   │   └── onboarding/       # First-time user flow
│   ├── (admin)/              # Admin route group
│   │   ├── layout.tsx        # Admin layout (sidebar + LanguageSwitcher)
│   │   └── admin/            # Admin pages (users, verifications, reports)
│   ├── api/                  # Next.js API routes (not proxied)
│   │   ├── ai/               # AI endpoints (chat, translate, doc-check)
│   │   └── i18n/             # Dynamic translation endpoint
│   ├── about/
│   ├── contact/
│   ├── help/
│   ├── pricing/
│   ├── privacy/
│   ├── terms/
│   └── unauthorized/
├── components/               # Shared React components
├── lib/                      # Utility libraries
├── i18n/                     # Internationalization system
└── __tests__/                # Unit tests
```

### Key Components

| Component | Description |
|---|---|
| `Navbar` | Public navigation bar with auth-aware links, theme toggle, and language switcher |
| `Footer` | Site-wide footer with translated column links |
| `LanguageSwitcher` | Dropdown with country flags, search, and native language names |
| `ThemeToggle` | Light/dark mode switch |
| `UserMenu` | Authenticated user dropdown (profile, settings, sign out) |
| `MobileSidebar` | Responsive sidebar for authenticated pages |
| `CommandPalette` | Cmd+K command search palette |
| `AuthGuard` | Redirects unauthenticated users to login |
| `RoleGuard` | Restricts pages to specific roles |
| `AdminGuard` | Admin-only route protection |
| `AuthSync` | Firebase auth state synchronization |
| `Toast` | Toast notification system |
| `SaveButton` | Bookmark/save favorite items |
| `Skeleton` | Loading skeleton placeholders |
| `FlagSelect` | Country flag dropdown selector |

### Routing Structure

```
Public Routes:
/                        → Landing page
/auth                    → Auth page (sign in / sign up)
/about                   → About page
/contact                 → Contact page
/help                    → Help page
/pricing                 → Pricing page
/privacy                 → Privacy policy
/terms                   → Terms of service

Auth Routes (group):
/login                   → Sign in
/signup                  → Sign up
/forgot-password         → Password reset request
/reset-password          → Password reset form
/verify-email            → Email verification

App Routes (authenticated):
/dashboard/student       → Student dashboard
/dashboard/mentor        → Mentor dashboard
/dashboard/employer      → Employer dashboard
/dashboard/admin         → Admin dashboard (redirect)
/assistant               → AI visa assistant
/opportunities           → Scholarships & programs
/housing                 → Housing marketplace
/jobs                    → Job listings
/community               → Community page
/forums                  → Discussion forums
/messages                → Direct messages
/notifications           → Notifications
/settings                → User settings
/toolkit/*               → Life support tools
/tools/*                 → Productivity tools
/stories                 → Success stories
/scam-alerts             → Scam alerts
/library                 → Resource library
/onboarding              → First-time setup

Admin Routes:
/admin                   → Admin overview
/admin/users             → User management
/admin/verifications     → Verification queue
/admin/listings          → Listing moderation
/admin/reports           → Report management
/admin/ai                → AI configuration
```

### State Management

GlobalBridge uses React Context for global state:

1. **LocaleContext** (`i18n/provider.tsx`) — Current language, translation function, RTL direction
2. **ToastContext** (`components/Toast.tsx`) — Toast notifications
3. **Firebase Auth** (`lib/auth.ts`) — Authentication state via Firebase `onIdTokenChanged`

No external state management library (Redux, Zustand) is used — the application is primarily server-data-driven with local component state for UI interactions.

---

## 6. Backend Architecture

### Directory Structure

```
backend/src/
├── index.ts               # Express app entry point
├── env.ts                 # Zod environment validation
├── db.ts                  # PostgreSQL pool + Redis connection
├── ws.ts                  # WebSocket server
├── middleware/
│   ├── auth.ts            # Firebase token verification + role guard
│   ├── csrf.ts            # CSRF protection (origin/referer check)
│   └── error.ts           # Global error handler
├── routes/
│   ├── auth.ts            # Authentication endpoints
│   ├── users.ts           # User profiles & dashboards
│   ├── opportunities.ts   # Scholarships, exchanges, jobs CRUD
│   ├── housing.ts         # Housing listings CRUD
│   ├── jobs.ts            # Job listings with visa filter
│   ├── forums.ts          # Forum threads & replies
│   ├── messages.ts        # Direct messaging
│   ├── ai.ts              # AI service proxy
│   ├── moderation.ts      # Reports & scam alerts
│   ├── content.ts         # Success stories, notifications, saved items
│   └── uploads.ts         # File uploads
├── lib/
│   ├── firebase-admin.ts  # Firebase Admin SDK initialization
│   ├── sanitize.ts        # XSS input sanitization
│   └── storage.ts         # File storage abstraction
└── __tests__/
    ├── env.test.ts
    ├── auth.test.ts
    └── auth-routes.test.ts
```

### Middleware Pipeline

```
1. helmet          → Security headers (CSP, HSTS)
2. compression     → Gzip/brotli response compression
3. morgan("dev")   → Request logging
4. cors            → CORS with configurable origin
5. rate-limit      → 300 requests per 15 minutes per IP
6. csrfProtection  → Origin/referer validation
7. express.json    → JSON body parser (10MB limit)
8. Routes          → API route mounting
9. errorHandler    → Global error handler
```

### WebSocket Server

The WebSocket server at `/ws` provides real-time messaging:

1. **Authentication**: Client sends `{"type": "auth", "token": "<Firebase ID token>"}` within 10 seconds
2. **Server verifies** the token via Firebase Admin SDK
3. **Resolves** the Postgres user (auto-creates if missing)
4. **Client sends** `{"type": "ping"}` for keepalive
5. **Server pushes** notifications via `notifyUsers()` function

**Redis Integration**: When Redis is available, the WebSocket server subscribes to a `ws:broadcast` channel for multi-instance message delivery. Without Redis, it falls back to local-only delivery.

### Security

| Layer | Implementation |
|---|---|
| Authentication | Firebase Auth with ID tokens (JWTs verified via Firebase Admin SDK) |
| Authorization | Role-based middleware (`requireRole`) backed by Firebase custom claims |
| CSRF Protection | Origin/Referer header validation against allowlist |
| XSS Prevention | Input sanitization (`sanitize.ts`) for all user-generated content |
| Rate Limiting | Express rate-limit (300 req/15min global, 20/min for chat) |
| Security Headers | Helmet with strict CSP |
| File Uploads | MIME validation per purpose, 8MB size limit |
| Password Policy | Client-side validation (8+ chars, uppercase, lowercase, number, special) |

---

## 7. AI Microservice

### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/chat` | POST | Conversational visa guidance via OpenAI |
| `/checklist` | POST | Generate visa document checklist |
| `/doc-check` | POST | Document validity analysis |
| `/translate` | POST | Text translation (Google Translate + OpenAI fallback) |

### Services

#### Visa Assistant (`visa_assistant.py`)
- Uses `OpenAI-haiku-4-5-20251001` with prompt caching
- Strict system prompt: no fabricated visa rules, cite official sources, disclaimer
- Extracts source URLs from responses
- Fallback stub when no API key configured

#### Checklist Generator (`checklist_generator.py`)
- Static baselines for 4 destinations: Canada (study permit), UK (student visa), Germany (student visa), USA (F1 visa)
- AI refinement when OpenAI key is available
- Fallback to generic checklist

#### Document Checker (`doc_checker.py`)
- Heuristic checks: expiry dates, passport validity < 6 months, bank statement analysis
- AI-powered analysis via OpenAI for rejection triggers
- Returns `{ valid, issues, ai_used }`

#### Translator (`translator.py`)
- Primary: Google Cloud Translation API
- Fallback: OpenAI API
- Last resort: Passthrough (returns original text with warning)
- Provider tracked in response

---

## 8. Database Schema

### Tables (18 total)

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | User accounts | firebase_uid, email, role, preferred_language, verification_status |
| `mentor_profiles` | Mentor details | expertise_areas, years_abroad, languages_spoken |
| `employer_profiles` | Employer company info | company_name, sponsors_visas |
| `opportunities` | Scholarships, jobs, programs | type, country, deadline, sponsors_visa |
| `housing_listings` | Housing marketplace | city, rent, furnished, status |
| `roommate_preferences` | Roommate matching | budget, lifestyle, smoking, pets |
| `forum_categories` | Forum organization | name, slug |
| `forum_posts` | Discussion threads | title, tags, upvotes |
| `forum_replies` | Post replies | body, is_accepted_answer |
| `conversations` | Message threads | participant_a, participant_b |
| `messages` | Direct messages | sender_id, body |
| `success_stories` | Student testimonials | origin, destination, quote, body |
| `ai_conversations` | AI chat sessions | user_id |
| `ai_messages` | AI chat messages | role, content, sources (JSONB) |
| `visa_checklists` | Document checklists | items (JSON), completed_items |
| `saved_items` | User bookmarks | item_type, item_id |
| `mentor_bookings` | Session scheduling | slot_date, duration_min, status |
| `notifications` | User notifications | kind, title, body, read |
| `reports` | Moderation reports | target_type, reason, status |
| `scam_alerts` | Community fraud warnings | title, scam_type, affected_countries |
| `user_documents` | Uploaded files | purpose, url, mime, size_bytes |

### Indexes

- 35 indexes total including:
  - GIN trigram indexes for full-text search on opportunities (`title`, `description`, `institution`)
  - Composite indexes on `saved_items(user_id, item_type)`
  - Indexes on foreign keys and frequently filtered columns

---

## 9. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register-profile` | Firebase Token | Create/update user profile |
| GET | `/api/auth/me` | Firebase Token | Get current user profile |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/dashboard` | Firebase Token | Student dashboard data |
| GET | `/api/users/mentor-dashboard` | Firebase Token | Mentor dashboard data |
| GET | `/api/users/employer-dashboard` | Firebase Token | Employer dashboard data |
| GET | `/api/users/mentors` | Public | List verified mentors |
| GET | `/api/users/` | Admin | List all users (paginated, filterable) |
| GET | `/api/users/summary/all` | Admin | Platform analytics |
| GET | `/api/users/:id` | Public | Get user profile |
| PATCH | `/api/users/me` | Firebase Token | Update own profile |
| POST | `/api/users/:id/verify` | Admin | Verify a user |
| PATCH | `/api/users/:id/status` | Admin | Suspend/reinstate user |

### Opportunities

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/opportunities/` | Public | List opportunities (filterable) |
| GET | `/api/opportunities/:id` | Public | Get opportunity details |
| POST | `/api/opportunities/` | Mentor/Admin/Employer | Create opportunity |

### Housing

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/housing/` | Public | List active listings |
| GET | `/api/housing/admin/pending` | Admin | Pending review listings |
| GET | `/api/housing/:id` | Public | Get listing details |
| PATCH | `/api/housing/:id/status` | Admin | Change listing status |

### Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs/` | Public | List jobs (filterable) |
| GET | `/api/jobs/sponsors` | Public | Visa sponsor employers |
| GET | `/api/jobs/:id` | Public | Get job details |
| POST | `/api/jobs/` | Employer/Admin | Post new job |

### Forums

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/forums/categories` | Public | List categories |
| GET | `/api/forums/posts` | Public | List posts |
| GET | `/api/forums/posts/:id` | Public | Get post with replies |
| POST | `/api/forums/posts` | Firebase Token | Create post |
| POST | `/api/forums/posts/:id/replies` | Firebase Token | Reply to post |

### Messages

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/messages/conversations` | Firebase Token | List conversations |
| GET | `/api/messages/conversations/:id` | Firebase Token | Get conversation messages |
| POST | `/api/messages/send` | Firebase Token | Send message |

### AI

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/chat` | Firebase Token | Chat with AI assistant (proxied) |
| POST | `/api/ai/checklist` | Firebase Token | Generate visa checklist (proxied) |
| GET | `/api/ai/checklists` | Firebase Token | Get saved checklists |
| POST | `/api/ai/doc-check` | Firebase Token | Document compliance check (proxied) |
| POST | `/api/ai/translate` | Firebase Token | Translate text (proxied) |

### Frontend API Routes (Next.js)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/chat` | OpenAI chat with language support |
| POST | `/api/ai/translate` | Batch text translation |
| POST | `/api/ai/doc-check` | Document checking |
| POST | `/api/ai/score-essay` | Essay scoring |
| POST | `/api/i18n/translate-dynamic` | Dynamic content translation |

---

## 10. Authentication & Authorization

### Firebase Auth Integration

GlobalBridge uses **Firebase Authentication** as its primary identity provider.

**Flow:**

1. User signs up via Firebase JS SDK (`createUserWithEmailAndPassword`)
2. Firebase returns an ID token (JWT)
3. Frontend stores the token in localStorage
4. Backend receives the token in the `Authorization: Bearer <token>` header
5. Backend middleware (`requireAuth`) verifies the token via Firebase Admin SDK
6. On first authentication, a Postgres `users` row is auto-created (self-healing)
7. User's role is stored as a Firebase custom claim

### Role-Based Access Control

**Roles:** `student`, `mentor`, `employer`, `admin`

**Frontend Guards:**

| Component | Usage |
|---|---|
| `AuthGuard` | Redirects to login if unauthenticated |
| `RoleGuard` | Shows children only for allowed roles |
| `AdminGuard` | Admin-only page protection |

**Backend Guards:**

| Middleware | Description |
|---|---|
| `requireAuth` | Verifies Firebase token, populates `req.user` |
| `requireRole("admin")` | Restricts to specific role(s) |

### Permission Matrix

| Resource | Student | Mentor | Employer | Admin | Public |
|---|---|---|---|---|---|
| View public content | ✓ | ✓ | ✓ | ✓ | ✓ |
| View dashboard | ✓ | ✓ | ✓ | ✓ | — |
| Create forum post | ✓ | ✓ | ✓ | ✓ | — |
| Reply to post | ✓ | ✓ | ✓ | ✓ | — |
| Send message | ✓ | ✓ | ✓ | ✓ | — |
| Book mentor | ✓ | — | — | ✓ | — |
| Create opportunity | — | ✓ | ✓ | ✓ | — |
| Post housing | ✓ | ✓ | ✓ | ✓ | — |
| Post job | — | — | ✓ | ✓ | — |
| Moderate reports | — | — | — | ✓ | — |
| Verify users | — | — | — | ✓ | — |
| Platform analytics | — | — | — | ✓ | — |
| Manage all content | — | — | — | ✓ | — |

---

## 11. Internationalization (i18n)

### Supported Languages (14)

| Code | Language | Flag | RTL |
|---|---|---|---|
| `en` | English | 🇺🇸 | No |
| `fr` | French | 🇫🇷 | No |
| `es` | Spanish | 🇪🇸 | No |
| `de` | German | 🇩🇪 | No |
| `it` | Italian | 🇮🇹 | No |
| `pt` | Portuguese | 🇧🇷 | No |
| `ar` | Arabic | 🇸🇦 | **Yes** |
| `zh` | Chinese | 🇨🇳 | No |
| `ja` | Japanese | 🇯🇵 | No |
| `ko` | Korean | 🇰🇷 | No |
| `ru` | Russian | 🇷🇺 | No |
| `tr` | Turkish | 🇹🇷 | No |
| `hi` | Hindi | 🇮🇳 | No |
| `sw` | Swahili | 🇹🇿 | No |

### Architecture

```
src/i18n/
├── config.ts              # Language definitions, RTL config, detection maps
├── provider.tsx           # LocaleProvider (React Context)
├── middleware.ts          # Next.js middleware for cookie detection
├── server.ts              # SSR translation utilities
├── utils.ts               # Browser detection, cache, profile sync
├── hooks/
│   └── useTranslation.ts  # t(), formatDate(), formatCurrency(), etc.
└── locales/
    ├── en.json            # Source of truth (583 keys, 18 sections)
    ├── fr.json
    ├── es.json
    ├── de.json
    ├── it.json
    ├── pt.json
    ├── ar.json            # Full RTL support
    ├── zh.json
    ├── ja.json
    ├── ko.json
    ├── ru.json
    ├── tr.json
    ├── hi.json
    └── sw.json
```

### Translation Key Structure (18 sections)

| Section | Key Count | Description |
|---|---|---|
| `common` | 60+ | Shared UI (save, cancel, loading, etc.) |
| `nav` | 25+ | Navigation labels |
| `footer` | 15+ | Footer content |
| `landing` | 50+ | Home page content |
| `auth` | 30+ | Authentication pages |
| `dashboard` | 40+ | Dashboard widgets |
| `assistant` | 20+ | AI assistant |
| `housing` | 25+ | Housing marketplace |
| `jobs` | 30+ | Job marketplace |
| `community` | 30+ | Community pages |
| `notifications` | 10+ | Notification types |
| `messages` | 12+ | Messaging |
| `toolkit` | 12+ | Life support tools |
| `settings` | 30+ | User settings |
| `errors` | 10+ | Error pages |
| `placeholders` | 10+ | Input placeholders |
| `tooltips` | 10+ | Tooltip text |
| `admin` | 30+ | Admin panel |
| `onboarding` | 15+ | First-time setup |
| `validation` | 12+ | Form validation |

### Key Features

- **Instant switching** via React Context — no page reload, no state loss
- **3 persistence layers**: localStorage, cookie (365 days), user profile (DB)
- **Auto-detection**: browser language → geolocation → saved preference → English fallback
- **Full RTL support** with 22 CSS directional rules
- **AI Assistant** sends `lang` parameter — OpenAI responds in user's language
- **Dynamic translation** via `/api/i18n/translate-dynamic` with caching
- **SSR support** via `getServerTranslations()`
- **Locale-aware formatting**: dates, numbers, currency, relative time

### Usage

```tsx
import { useTranslation } from "@/i18n/hooks/useTranslation";

function MyComponent() {
  const { t, lang, setLang, dir, isRTL, formatDate, formatCurrency } = useTranslation();

  return (
    <div dir={dir}>
      <h1>{t("dashboard.welcome", { name: userName })}</h1>
      <p>{formatCurrency(1000, "USD")}</p>
      <p>{formatDate(new Date(), { month: "long", year: "numeric" })}</p>
    </div>
  );
}
```

---

## 12. Real-Time Features

### WebSocket Server

- Path: `/ws`
- Authentication: Firebase ID token within 10 seconds
- Compression: per-message deflate
- Multi-instance: Redis pub/sub (optional, degrades gracefully)

### Real-Time Capabilities

| Feature | Implementation |
|---|---|
| Direct messaging | WebSocket push via `notifyUsers()` |
| Notifications | Push via `notifyUsers()` on relevant events |
| Online status | Tracked via WebSocket connection state |
| Typing indicators | WebSocket message type (future) |

### Message Push

```typescript
// Server-side: push notification to user
import { notifyUsers } from "../ws";

await notifyUsers([userId], {
  type: "notification",
  payload: {
    id: "abc123",
    kind: "message",
    title: "New message from John",
    body: "Hey, how are you?",
  },
});
```

---

## 13. Deployment

### Frontend (Vercel)

```bash
cd frontend
npx vercel --prod
```

Required environment variables on Vercel:
- `NEXT_PUBLIC_API_URL` → Production backend URL
- `NEXT_PUBLIC_WS_URL` → Production WebSocket URL
- Firebase config variables

### Backend (Railway)

The backend includes a `railway.toml` and `Procfile` for Railway deployment:

```bash
cd backend
railway up
```

Required environment variables on Railway:
- `DATABASE_URL` → Production PostgreSQL URL
- `REDIS_URL` → Production Redis URL (optional)
- Firebase Admin credentials
- `CORS_ORIGIN` → Frontend URL
- `AI_SERVICE_URL` → AI microservice URL

### AI Service

```bash
cd ai
# Deploy to Railway, Render, or similar
```

### Database

Production PostgreSQL can be hosted on:
- **Neon** (serverless PostgreSQL, recommended)
- **Railway** (built-in PostgreSQL)
- **AWS RDS**

### Docker

```bash
# Build all services
docker compose build

# Run locally
docker compose up -d
```

---

## 14. Testing

### Frontend Tests

```bash
cd frontend
npm test            # Run once
npm run test:watch # Watch mode
```

Test framework: Vitest

### Backend Tests

```bash
cd backend
npm test            # Run once
npm run test:watch # Watch mode
```

Test framework: Vitest with v8 coverage

Coverage areas:
- Environment validation (`env.test.ts`)
- Auth middleware (`auth.test.ts`) — missing token, cached user, auto-provisioning, invalid token
- Auth routes (`auth-routes.test.ts`) — profile registration, profile retrieval

### Manual Smoke Test Checklist

- [ ] Landing page loads with all sections
- [ ] Language switcher changes all visible text
- [ ] User registration works (Firebase)
- [ ] Email verification flow works
- [ ] Login/logout flow works
- [ ] Password reset works
- [ ] Student dashboard shows real data
- [ ] Mentor dashboard shows real data
- [ ] Employer dashboard shows real data
- [ ] Admin dashboard shows platform analytics
- [ ] AI Assistant responds to questions
- [ ] Housing listings load and filter
- [ ] Job listings load and filter by visa sponsorship
- [ ] Forum posts display and allow replies
- [ ] Messaging works between users
- [ ] Dark mode toggle works
- [ ] Language persists after page refresh
- [ ] Language persists after login/logout
- [ ] RTL activates for Arabic
- [ ] Mobile responsive layout
- [ ] Save/bookmark items works
- [ ] Notifications display correctly

---

## 15. Contributing

### Branch Convention

| Branch | Purpose |
|---|---|
| `main` | Production-ready code |
| `dev` | Integration branch |
| `feat/<scope>` | Feature branches (e.g., `feat/housing-map`) |
| `fix/<scope>` | Bug fixes (e.g., `fix/auth-timeout`) |
| `docs/<scope>` | Documentation changes |

### Commit Convention

```
<type>(<scope>): <description>

Types: feat, fix, docs, refactor, test, chore
Scope: frontend, backend, ai, db, docs
```

### Pull Request Process

1. Branch from `dev`
2. Implement changes
3. Run tests: `npm test`
4. Run type check: `npm run typecheck` or `npm run lint`
5. Create PR to `dev`
6. Review and merge

---

## Appendix A: File Inventory

### Frontend (50+ pages, 17 components, 14 locale files)

```
frontend/src/
├── app/
│   ├── (admin)/  admin/page.tsx, layouts, users, verifications, reports, ai
│   ├── (app)/    dashboard/*, assistant, opportunities, housing, jobs, forums, messages, etc.
│   ├── (auth)/   login, signup, forgot-password, reset-password, verify-email
│   └── standalone pages: about, contact, help, pricing, privacy, terms, auth, unauthorized
├── components/  17 UI components
├── lib/         7 utility files
├── i18n/        18 files (config, provider, hooks, 14 locales)
└── api/         5 API route files
```

### Backend (11 route files, 3 middleware, 3 lib)

```
backend/src/
├── routes/      11 route files
├── middleware/  3 middleware files
├── lib/         3 utility files
└── __tests__/   3 test files
```

### AI Service (5 service files)

```
ai/
├── main.py              FastAPI entry point
├── visa_assistant.py    OpenAI chat assistant
├── checklist_generator.py
├── doc_checker.py
└── translator.py
```

### Database

```
db/
├── schema.sql   326 lines, 18 tables, 35 indexes
└── seed.sql     163 lines, sample data
```

---

## Appendix B: Environment Variables Reference

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | — | Backend API URL (for rewrites) |
| `NEXT_PUBLIC_WS_URL` | No | — | WebSocket URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | **Yes** | — | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | **Yes** | — | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **Yes** | — | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | **Yes** | — | Firebase app ID |

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | — | PostgreSQL connection string |
| `REDIS_URL` | No | — | Redis connection string |
| `FIREBASE_PROJECT_ID` | **Yes** | — | Firebase Admin project ID |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | — | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | **Yes** | — | Firebase private key |
| `AI_SERVICE_URL` | No | `http://localhost:8000` | AI microservice URL |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins |
| `JWT_SECRET` | No | — | Legacy WebSocket JWT secret |
| `PORT` | No | `4000` | Server port |

### AI Service

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | No | — | OpenAI API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | — | Google Translate credentials |
| `PORT` | No | `8000` | Service port |

---

> *Generated from source code analysis — Fri Jun 19 2026*  
> *GlobalBridge — Group 8 Final Year Project*
