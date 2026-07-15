# GlobalBridge Development Guide

## Commands

```bash
# Backend
cd backend
npm run dev          # Start Express API (tsx watch)
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run test         # Run vitest tests
npm run seed:knowledge  # Seed RAG knowledge base

# Frontend
cd frontend
npm run dev          # Start Next.js dev server (turbopack, port 3000)
npm run build        # Production build
npm run test         # Run vitest tests

# Infrastructure
docker compose up -d  # Start Postgres (pgvector) + Redis
```

## Architecture

- **Frontend**: Next.js 15 App Router on port 3000
- **Backend**: Express API on port 4000
- **Database**: PostgreSQL 16 + pgvector on port 5432
- **Cache**: Redis 7 on port 6379
- **Auth**: Firebase Authentication (tokens passed as Bearer header)

## AI System (RAG + Memory)

1. **Knowledge Base**: Seed with `npm run seed:knowledge` (backend), then run `POST /api/rag/reembed-all` with admin auth to generate vector embeddings.
2. **RAG Search**: Backend `/api/rag/search` performs vector similarity search against knowledge_base using OpenAI text-embedding-3-small.
3. **Chat Flow**: Frontend `/api/ai/chat` → calls backend for RAG context + user profile + conversation history → calls OpenAI → returns response with sources + conversation_id.
4. **Conversation Memory**: Messages are persisted to ai_messages via backend `/api/ai/messages` endpoint.
5. **Personalization**: User role, profile, and preferences are injected into the system prompt.

## Key Files Added/Modified

| File | Purpose |
|------|---------|
| `db/schema.sql` | Added pgvector, knowledge_base, trusted_sources, crawled_opportunities, ai_feedback, ai_usage_log, embedding_cache tables |
| `backend/src/routes/rag.ts` | RAG search, embedding generation, re-embedding endpoint |
| `backend/src/routes/knowledge.ts` | Knowledge base CRUD (admin only) |
| `backend/src/routes/ai.ts` | Conversation management (create, list, get, update, delete messages) |
| `backend/src/seed-knowledge.ts` | Seed 70+ platform knowledge entries |
| `frontend/src/app/api/ai/chat/route.ts` | Rewritten with RAG + memory + user context + source citations |
| `frontend/src/app/(app)/assistant/page.tsx` | Updated with history, auth, role-based suggestions, source badges |
| `frontend/next.config.ts` | Added proxy rules for /api/knowledge, /api/rag, /api/ai/conversations, /api/ai/messages |
| `docker-compose.yml` | Changed postgres image to pgvector/pgvector:pg16 |
