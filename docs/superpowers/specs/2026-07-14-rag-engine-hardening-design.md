# RAG Knowledge Engine Hardening

Date: 2026-07-14
Status: Approved

## Context

An earlier session built most of the GlobalBridge RAG knowledge engine as
uncommitted work: pgvector-backed `knowledge_base` table, `/api/rag/search`
(vector similarity + text-search fallback), `/api/knowledge` CRUD, an
embedding cache (Redis + Postgres), 70+ seeded platform-knowledge entries,
and a frontend chat route that combines RAG context + user profile +
conversation history + OpenAI. This is sub-project 1 of a larger "AI
Intelligence Engine" initiative (see conversation context); later
sub-projects (opportunity crawler, Admin AI Control Center, etc.) are out of
scope here.

The code is functionally complete but has never been run end-to-end, has a
hardcoded database credential, has three redundant debug scripts, and
duplicated embedding logic between `rag.ts` and `knowledge.ts`. This spec
covers hardening that existing work to a committable, verified state — not
adding new AI capabilities.

## Goals

1. Remove the hardcoded Neon Postgres credential from `run-migration.ts`.
2. Remove redundant one-off debug scripts.
3. Deduplicate embedding-generation logic into a single shared module.
4. Verify the full pipeline works against the real configured database:
   migration → seed → embed → search returns relevant results.
5. Add minimal regression tests for the RAG search and knowledge CRUD
   endpoints.
6. Commit the hardened, verified RAG engine as one coherent unit.

## Non-goals

- Building the opportunity discovery/crawler engine (schema already exists,
  no crawler code — separate future sub-project).
- Building the Admin AI Control Center.
- Exhaustive automated test matrix (hundreds of scenarios) from the original
  "God Mode" spec — that's a future sub-project once more of the system
  exists to test.
- Redis-based response caching beyond what already exists for embeddings.
- Changing the chat route's prompt design, personalization logic, or
  citation format — those already work as designed; only the retrieval
  layer underneath is being hardened.

## Design

### 1. Security fix — `backend/run-migration.ts`

Remove the hardcoded connection-string fallback:

```ts
connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:...",
```

becomes:

```ts
connectionString: process.env.DATABASE_URL,
```

with an explicit check-and-exit if `DATABASE_URL` is unset, consistent with
how `backend/src/env.ts` already treats required config. `backend/.env`
already has `DATABASE_URL` set, so this doesn't change local dev behavior —
it just removes a committed secret.

### 2. Remove redundant scripts

Delete `backend/src/test-vector.ts`, `backend/src/check-embeddings.ts`, and
`backend/src/embed-remaining.ts`. All three were ad hoc debugging aids
superseded by `backend/src/generate-embeddings.ts`, which already has
proper retry/backoff and is wired into `package.json` as
`npm run embed:knowledge`. No other file imports these three scripts.

### 3. Shared embedding module

New file `backend/src/lib/embeddings.ts` exporting:

- `generateEmbedding(text: string): Promise<number[]>` — raw OpenAI call
  (the `https` request implementation currently in `rag.ts`, reused as-is).
- `getEmbedding(text: string): Promise<number[]>` — cache-checked version
  (Redis first, then Postgres `embedding_cache`, then generate + persist to
  both caches), moved from `rag.ts` verbatim.

`rag.ts`, `knowledge.ts`, and `generate-embeddings.ts` all import from this
module instead of each having their own copy. `knowledge.ts`'s current
bare `embedUrl()` (no caching) is replaced with `getEmbedding()`, so
knowledge-base CRUD embedding calls now benefit from the same cache as
search does.

No behavior change to the cache TTL, hashing scheme, or fallback order —
this is a pure extraction, not a redesign.

### 4. End-to-end verification

Run against the already-configured `DATABASE_URL` (a remote Neon Postgres
instance — no local docker required for this):

1. Confirm whether `migration_rag.sql` is still needed or if the consolidated
   `db/schema.sql` already covers the same tables (they look identical) —
   apply whichever is authoritative so the live DB has `knowledge_base`,
   `trusted_sources`, `crawled_opportunities`, `ai_feedback`, `ai_usage_log`,
   `embedding_cache`.
2. Run `npm run seed:knowledge` — confirm all 70+ entries insert/upsert
   without error.
3. Run `npm run embed:knowledge` — confirm embeddings are generated for all
   entries (spot-check count via a query, not a dedicated script per goal 2).
4. Start the backend and call `POST /api/rag/search` with a handful of real
   queries (e.g. "how do I verify my mentor account", "housing marketplace
   fees", "visa checklist for Canada") and confirm the top results are
   topically relevant, not just non-error.
5. Confirm the text-search fallback path also works by temporarily checking
   the no-API-key branch logic (via test, not by actually unsetting the
   production key — see Testing below).

If step 1 finds schema drift between `migration_rag.sql` and `schema.sql`,
reconcile in favor of `schema.sql` (the consolidated file) and note it in
the commit message; `migration_rag.sql` may end up redundant and removable
if schema.sql fully supersedes it — decide based on what's found.

### 5. Regression tests

Add `backend/src/routes/rag.test.ts` and extend/add
`backend/src/routes/knowledge.test.ts` using the existing vitest setup:

- RAG search: vector-search path returns results shaped correctly given a
  mocked embedding; text-fallback path (no `OPENAI_API_KEY`) returns
  results via `ts_rank`; category filter narrows results; `min_score`
  filters out low-similarity rows.
- Knowledge CRUD: create requires admin role; create without
  `OPENAI_API_KEY` still succeeds with `embedding: null`; update only
  re-embeds when title/content changes; list supports category + search
  filters and pagination.

These are scoped to catch regressions in the retrieval logic itself, not a
full scenario matrix. OpenAI calls are mocked (no real API calls in tests).

### 6. Commit

Once verified and tests pass, stage the RAG-related files (backend routes,
lib, scripts, schema, docker-compose, frontend chat route/assistant page,
AGENTS.md, this spec) and commit as one coherent change. `AGENTS.md`'s
existing "AI System (RAG + Memory)" section already accurately documents
the shipped behavior — only update it if the embeddings-module extraction
changes any documented file paths.

## Testing

- `cd backend && npm run typecheck`
- `cd backend && npm run test` (includes new rag/knowledge tests)
- Manual verification per section 4 above (seed → embed → search) against
  the real dev database.
- `cd frontend && npm run typecheck` (chat route/assistant page are already
  modified; confirm no type errors after any shared-module changes, though
  none are expected on the frontend side).

## Open questions

None — scope confirmed with user before writing this spec.
