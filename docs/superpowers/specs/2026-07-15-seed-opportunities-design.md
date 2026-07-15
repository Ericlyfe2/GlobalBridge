# Seed Opportunities Catalog

Date: 2026-07-15
Status: Approved

## Context

The live `opportunities` table has only 7 rows (4 scholarships, 1 exchange,
1 job, 1 work-study), seeded manually at some earlier point. The
`/opportunities` page (real listings, real UUIDs, backed by
`GET /api/opportunities`) is functionally correct but sparse — filters,
country spread, and the interactive globe view all look thin with this
little data. The user asked to add a lot more opportunities and verify
every one actually works when visited.

Note: the earlier report of `/opportunities/o_001` returning 500 is not a
reachable bug — nothing in the app links to that ID; the real listings page
always links via real database UUIDs (`/opportunities/${o.id}`). No fix
needed there.

## Goal

Bring the `opportunities` table to roughly 100 rows total (~93 new), modeled
on real, well-known scholarship/exchange/job programs, spread across the
existing 5 `opportunity_type` values and a realistic set of countries, then
verify every single row's detail page actually loads correctly.

## Non-goals

- The separate `crawled_opportunities` / `trusted_sources` tables (the
  not-yet-built live crawler from the original "God Mode" AI-engine
  spec) — out of scope; this seeds the existing, already-live
  `opportunities` table only.
- Changing the `opportunities` schema, the listing route, or the detail
  route — both are existing, correct code. Only data changes.
- A permanent automated test suite for the opportunities routes — the
  route logic is unchanged; the risk here is bad seed data, not route
  behavior. Verification is a one-time live check, not new test files.
- Fixing the OpportunitiesPreview landing-page static sample cards —
  they're intentionally static and don't link anywhere that could 500.

## Design

### Content

~93 new rows, each with realistic values for every column the frontend
renders (`title`, `description`, `country`, `institution`,
`field_of_study`, `funding_amount`, `currency`, `eligibility`,
`application_url`, `deadline`, `sponsors_visa`, `is_verified`).

- Scholarships and exchanges are modeled on real, well-known, publicly
  documented programs (Fulbright, Erasmus+, Commonwealth, DAAD, Rhodes,
  Chevening-style government scholarships, Gates Cambridge, etc.) —
  genuinely real programs whose general parameters (typical funding,
  eligibility) are public knowledge.
- Jobs, internships, and work-study rows use generic company
  descriptions (e.g. "Fintech · Berlin", "Health-tech · Dublin"), matching
  the pattern already used by the 7 existing seeded rows — **not** the
  names of specific real employers. Inventing salary, deadline, and
  visa-sponsorship details and attributing them to a real named company
  that never posted them would put false information on a live public
  site; genericizing the employer avoids that.
- Countries: a spread across the set the app already treats as
  first-class (Canada, UK, US, Germany, Australia, Ireland,
  Netherlands, Sweden, France), plus a few more for variety (Switzerland,
  Japan, Singapore, New Zealand) — matching the destination countries
  already referenced in the RAG knowledge base and visa assistant.
- Types: a spread across all 5 `opportunity_type` values, weighted
  toward `scholarship` and `job` since those are the two most-referenced
  types in the existing UI copy ("Scholarships, work-study & exchanges").
- Deadlines: future dates (the listing query excludes past deadlines:
  `deadline IS NULL OR deadline >= CURRENT_DATE`) or `NULL` for
  rolling-deadline programs.
- `is_verified: true` for all seeded rows (they represent real,
  verifiable programs). `sponsors_visa: true` for a realistic subset of
  `job`/`internship`/`work_study` rows (not all — real jobs aren't all
  visa-sponsoring), `false`/omitted for `scholarship`/`exchange` rows
  (visa sponsorship isn't the relevant concept for those types).
- `posted_by: NULL` (system-seeded, not attributed to any user —
  `posted_by` already allows `NULL` via `ON DELETE SET NULL`).

### Implementation

New script `backend/src/seed-opportunities.ts`, following the same shape
as the existing `backend/src/seed-knowledge.ts`: a typed array of entries,
one `INSERT` per entry inside a loop. Since `opportunities.title` has no
unique constraint (unlike `knowledge_base.title`), idempotency is handled
in the script itself: fetch existing titles once at the start, skip any
entry whose title already exists, so the script can be safely re-run.
Wired into `backend/package.json` as `npm run seed:opportunities`, matching
the existing `seed:knowledge` / `embed:knowledge` convention.

Run once against the live database (same `DATABASE_URL` already used for
the RAG seeding earlier this session).

### Verification ("test all the opportunities to see if they all work")

After seeding, a one-time live check (not a permanent test file): fetch
`GET /api/opportunities` to get every row's real UUID, then `GET
/api/opportunities/:id` for every single one of the ~100 rows, confirming
each returns `200` with a non-null `title` and the expected shape. Any
failure (bad UUID formatting, a `NULL` in a column the frontend assumes is
present, etc.) is a real bug to fix before considering this done — not
something to wave through.

## Testing

- The verification pass above is the primary test: 100/100 opportunities
  return 200 from their detail endpoint.
- `cd backend && npm run typecheck` (new script must typecheck).
- Manual: reload `/opportunities` in the browser, confirm the count,
  filters, and globe view all reflect the larger catalog.

## Open questions

None — scope confirmed with user before writing this spec.
