# AI Knowledge Base Expansion — Design Spec

Date: 2026-07-27
Status: Approved
Sub-project 1 of 4 in the "make the AI more powerful" roadmap:
1. **Knowledge base expansion** (this spec)
2. Smarter chat assistant (tool-calling, streaming)
3. New AI features
4. Admin AI Control Center upgrades

## Problem

`knowledge_base` has 79 entries, but they are almost entirely about *how to use GlobalBridge itself* (dashboards, tools, roles, settings) — only 2 entries touch actual visa/immigration substance. The real country-specific immigration knowledge (Canada, UK, Germany, US, Australia — a few bullets each) is hardcoded directly in `frontend/src/app/api/ai/chat/route.ts`'s `BASE_SYSTEM` prompt. This means:

- Only the main chat assistant benefits from that country knowledge; other AI tools (doc-checker, visa-roadmap, readiness) that call `/api/rag/search` can't retrieve it.
- Updating country facts requires a code change and redeploy, not a content edit.
- Coverage is shallow (5 countries, no work-rights/PR/banking/tax/housing depth) and there's no knowledge base admin tooling — the only way to add entries today is re-running `seed-knowledge.ts` or calling the API directly.

The backend CRUD (`backend/src/routes/knowledge.ts`) and RAG search (`backend/src/routes/rag.ts`) already fully support arbitrary categorized, embedded entries. No schema or backend changes are needed — this is a content + admin-UI project.

## Goals

1. Add substantial, accurate immigration knowledge content to `knowledge_base`, organized so RAG retrieval surfaces it for any AI feature.
2. Give admins a way to view/search/create/edit/delete knowledge base entries without a code deploy.
3. Remove the duplicated hardcoded country knowledge from the chat prompt in favor of RAG, so there's one source of truth.

## Non-goals

- No web crawling / automated source ingestion (the `trusted_sources` / `crawled_opportunities` tables are unrelated to this effort and untouched).
- No fine-tuning or custom model training — "training" here means enriching the retrieval corpus, per the OpenAI-hosted-API architecture already in place.
- No changes to embedding model, vector index, or search ranking algorithm.

## Content Plan

### Countries (8)
Canada, United States, United Kingdom, Germany, Australia, France, Netherlands, Ireland.

### Topics per country (8, ~64 entries)
1. Study permit / student visa process (requirements, timeline, fees)
2. Post-graduation work rights (PGWP equivalents, OPT/CPT-style rules, graduate visas)
3. Permanent residence / settlement pathway from student status
4. Financial proof requirements (blocked accounts, GIC, bank statement rules)
5. Healthcare enrollment for international students
6. Banking setup (opening an account as a newcomer, common providers/requirements)
7. Tax basics for international students/workers (filing obligations, tax treaties)
8. Housing / tenant rights basics for newcomers

### Cross-cutting topics (~10 entries, not country-specific)
- Common immigration/visa scam patterns and red flags
- Foreign credential recognition/equivalency process
- Mental health resources for people relocating abroad
- Remote work & digital nomad visa overview
- Language proficiency test overview (IELTS/TOEFL/PTE/Duolingo — what's accepted where)
- Currency exchange & sending money internationally
- International health/travel insurance basics
- Job search strategies for visa-sponsorship-seeking candidates
- Rights against workplace exploitation for visa holders
- Emergency contacts / what to do if your visa status is at risk

Total: ~74 new entries (8×8 + 10), each with:
- `title`, `content` (200–400 words, factual, non-legal-advice framing matching existing `BASE_SYSTEM` hard rules)
- `category` = `immigration-{country-slug}` for country entries, `immigration-general` for cross-cutting
- `subcategory` = the topic slug (e.g. `study-permit`, `work-rights`, `scam-patterns`)
- `tags`: relevant keywords for text-search fallback
- `source_url`: real official government/institutional URL (canada.ca, gov.uk, bamf.de, uscis.gov, homeaffairs.gov.au, service-public.fr, ind.nl, irishimmigration.ie, or reputable NGO/university sources for cross-cutting topics)

Content is authored directly (by the assistant, from general knowledge), not scraped — consistent with how `seed-knowledge.ts` entries already exist. Same non-legal-advice, cite-your-source discipline as the existing chat system prompt.

## Implementation

### 1. Extend `backend/src/seed-knowledge.ts`
Add the ~74 entries above, following the existing `Entry[]` array pattern and section-comment style already used in the file. Script remains idempotent-safe via the existing `ON CONFLICT` / insert logic (verify current script's upsert behavior; if it only inserts, guard re-runs by checking existing titles before insert).

### 2. Re-run embeddings
After seeding, run the existing `generate-embeddings.ts` / `reembed-all` path so new entries get vector embeddings (same as current entries).

### 3. Trim `BASE_SYSTEM` in `frontend/src/app/api/ai/chat/route.ts`
Remove the "## Country-specific knowledge" hardcoded bullet block (lines ~53-58). RAG (`fetchRAG`) already runs on every request and injects results into the prompt — the new immigration entries will be retrieved the same way platform-knowledge entries are today. Keep the "Hard rules" section (cite sources, no legal advice, no fabrication) unchanged.

### 4. Admin UI: Knowledge Base tab
Add a new tab/section to `frontend/src/app/(admin)/admin/ai/page.tsx` (or a new route `(admin)/admin/ai/knowledge/page.tsx` linked from the existing page, following whichever pattern keeps the file size reasonable):
- **List view:** paginated table of entries (title, category, subcategory, updated_at), search box (hits `GET /api/knowledge?search=`), category filter dropdown.
- **Detail/edit:** click a row to view full content in a side panel or modal; edit form (title, content, category, subcategory, tags, source_url) submitting `PATCH /api/knowledge/:id`.
- **Create:** a "New Entry" button opening the same form, submitting `POST /api/knowledge`.
- **Delete:** confirm-then-delete via `DELETE /api/knowledge/:id`.
- Uses `authFetch` (already used elsewhere in the admin AI page) for authenticated requests; requires admin role, matching backend's `requireRole("admin")` guard.
- Visual style matches the existing AI Control Center reskin (dark neon panel style already in `page.tsx`).

## Testing

- Extend/verify RAG search test coverage (`backend/src/__tests__/rag.test.ts`) with a couple of representative queries against new categories (e.g. "how much money do I need to prove for a German student visa" → expects a `immigration-germany`/`financial-proof` hit).
- Manual verification: query the chat assistant with country-specific questions for at least 3 of the 8 countries and confirm RAG-sourced (not hallucinated) answers with correct source citations.
- Admin UI: manual create → edit → search → delete round trip in the browser; confirm embeddings are regenerated on create/edit (existing backend behavior, just confirm the UI triggers it correctly).

## Risks / considerations

- Content volume (~74 entries) is a meaningful writing effort; must stay accurate and appropriately hedged (no fabricated fees/deadlines, matching existing hard rules) since this feeds a user-facing assistant.
- Removing hardcoded country knowledge from the prompt makes chat answer quality dependent on RAG retrieval quality for those topics — mitigated by seeding before trimming, and by keeping the existing `min_score: 0.5` threshold/fallback-to-none behavior (chat already handles zero RAG results gracefully).
