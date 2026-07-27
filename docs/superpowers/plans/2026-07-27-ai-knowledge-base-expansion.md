# AI Knowledge Base Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `knowledge_base` with real immigration content (8 countries × 8 topics + 10 cross-cutting entries), wire the chat prompt to rely on RAG instead of hardcoded country facts, and give admins a UI to manage knowledge base entries without a code deploy.

**Architecture:** Content-only additions to the existing `Entry[]` array in `backend/src/seed-knowledge.ts` (idempotent `ON CONFLICT (title)` upsert already in place — no schema changes). A small trim to `frontend/src/app/api/ai/chat/route.ts`'s system prompt. A new admin page at `frontend/src/app/(admin)/admin/ai/knowledge/page.tsx` that is a thin CRUD client over the already-existing `backend/src/routes/knowledge.ts` API (proxied via existing Next.js rewrite `/api/knowledge/:path*`).

**Tech Stack:** TypeScript, Express (backend), Next.js App Router (frontend), Vitest, Tailwind CSS, `authFetch` from `frontend/src/lib/auth.ts`.

## Global Constraints

- Every new knowledge entry: non-legal-advice framing, no fabricated fees/deadlines/URLs — matches the existing "Hard rules" in `BASE_SYSTEM` (`frontend/src/app/api/ai/chat/route.ts:40-44`).
- `title` must be globally unique across `knowledge_base` (enforced by `UNIQUE` constraint + the seed script's `ON CONFLICT (title)`).
- Content length target: 200–400 words per entry.
- `source_url` must be a real, plausible official government/institutional URL (canada.ca, gov.uk, bamf.de, uscis.gov, homeaffairs.gov.au, service-public.fr, ind.nl, irishimmigration.ie, or a reputable NGO/university source for cross-cutting topics) — omit rather than fabricate if unsure.
- No backend schema/migration changes — `knowledge_base`, `knowledge.ts`, and `rag.ts` are unchanged.
- Admin UI must require admin role (matches backend's `requireRole("admin")` guard on write routes) and follow the existing dark/neon visual style already used in `frontend/src/app/(admin)/admin/ai/page.tsx` (see `Panel`, `PanelHeading`, `NEON` constants).

---

## File Structure

- **Modify:** `backend/src/seed-knowledge.ts` — append ~74 new entries to the `entries: Entry[]` array (in 10 batches: 8 countries + cross-cutting, split across tasks below).
- **Modify:** `backend/src/__tests__/seed-knowledge.test.ts` — **create** this file (new test, validates the entries array structurally).
- **Modify:** `frontend/src/app/api/ai/chat/route.ts` — remove the hardcoded "Country-specific knowledge" block from `BASE_SYSTEM`.
- **Modify:** `frontend/src/__tests__/ai-suite.test.ts` — add a test asserting `BASE_SYSTEM`-equivalent no longer hardcodes country facts (via a light export or string check — see Task 11).
- **Create:** `frontend/src/app/(admin)/admin/ai/knowledge/page.tsx` — new admin page: list/search/filter, create, edit, delete knowledge base entries.
- **Modify:** `frontend/src/app/(admin)/admin/ai/page.tsx` — add a link/button to the new Knowledge Base page from the AI Control Center hero section.

---

## Content Rubric (applies to every entry in Tasks 2–10)

Each entry is a TypeScript object literal appended to the `entries` array in `backend/src/seed-knowledge.ts`, following the existing `Entry` type (`title`, `content`, `category`, `subcategory?`, `tags`, `metadata`, and optionally `source_url` — check the current `Entry` type at the top of the file; if `source_url` isn't already a field, add it as an optional field to the type since `knowledge_base` and `knowledge.ts` already support it).

- `title`: specific, human-readable, globally unique (e.g. `"Canada Study Permit Process"`, not `"Study Permit"`).
- `content`: 200–400 words, factual, structured as short paragraphs or a mix of prose + a short list, ending with a pointer to verify on the official source. Follow the hard rules: no invented fees/dates, hedge with "verify on the official site" language where specifics could change.
- `category`: `immigration-{country-slug}` for country entries (e.g. `immigration-canada`), `immigration-general` for cross-cutting entries.
- `subcategory`: topic slug — one of `study-permit`, `work-rights`, `pr-pathway`, `financial-proof`, `healthcare`, `banking`, `tax`, `housing` for country entries; a descriptive slug for cross-cutting entries (e.g. `scam-patterns`, `credential-recognition`).
- `tags`: 4–8 relevant lowercase keywords.
- `source_url`: real official URL as constrained above.

---

### Task 1: Seed-entries validation test (TDD harness for content tasks)

**Files:**
- Create: `backend/src/__tests__/seed-knowledge.test.ts`
- Modify: `backend/src/seed-knowledge.ts:1-12` (export `entries` and the `Entry` type if not already exported; add optional `source_url` field to `Entry` type)

**Interfaces:**
- Consumes: nothing new.
- Produces: `entries: Entry[]` (exported), `Entry` type with fields `{ title: string; content: string; category: string; subcategory?: string; tags: string[]; metadata: Record<string, string>; source_url?: string }` — Tasks 2–10 append to this same array and must satisfy this shape.

- [ ] **Step 1: Export `entries` and extend `Entry` type**

In `backend/src/seed-knowledge.ts`, change:
```typescript
type Entry = {
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  metadata: Record<string, string>;
};
```
to:
```typescript
export type Entry = {
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  metadata: Record<string, string>;
  source_url?: string;
};
```
and change `const entries: Entry[] = [` to `export const entries: Entry[] = [`.

Then update the insert query to persist `source_url` (it's currently omitted from the `INSERT`):
```typescript
      await client.query(
        `INSERT INTO knowledge_base (title, content, category, subcategory, tags, metadata, source_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (title) DO UPDATE SET updated_at = NOW(), source_url = COALESCE(EXCLUDED.source_url, knowledge_base.source_url)`,
        [
          entry.title,
          entry.content,
          entry.category,
          entry.subcategory ?? null,
          entry.tags,
          JSON.stringify(entry.metadata),
          entry.source_url ?? null,
        ],
      );
```

- [ ] **Step 2: Write the failing test**

```typescript
// backend/src/__tests__/seed-knowledge.test.ts
import { describe, it, expect } from "vitest";
import { entries } from "../seed-knowledge";

describe("seed-knowledge entries", () => {
  it("has no duplicate titles", () => {
    const titles = entries.map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("every entry has non-empty title, content, category, and tags", () => {
    for (const e of entries) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.content.length).toBeGreaterThan(0);
      expect(e.category.length).toBeGreaterThan(0);
      expect(e.tags.length).toBeGreaterThan(0);
    }
  });

  it("every entry with a source_url has a well-formed https URL", () => {
    for (const e of entries) {
      if (e.source_url) {
        expect(() => new URL(e.source_url!)).not.toThrow();
        expect(e.source_url!.startsWith("https://")).toBe(true);
      }
    }
  });

  it("includes at least 74 immigration entries across 8 countries plus cross-cutting topics", () => {
    const immigrationEntries = entries.filter((e) => e.category.startsWith("immigration-"));
    expect(immigrationEntries.length).toBeGreaterThanOrEqual(74);

    const countries = ["canada", "united-states", "united-kingdom", "germany", "australia", "france", "netherlands", "ireland"];
    for (const c of countries) {
      const countryEntries = immigrationEntries.filter((e) => e.category === `immigration-${c}`);
      expect(countryEntries.length).toBeGreaterThanOrEqual(8);
    }

    const crossCutting = immigrationEntries.filter((e) => e.category === "immigration-general");
    expect(crossCutting.length).toBeGreaterThanOrEqual(10);
  });

  it("each country covers all 8 required topics", () => {
    const requiredTopics = ["study-permit", "work-rights", "pr-pathway", "financial-proof", "healthcare", "banking", "tax", "housing"];
    const countries = ["canada", "united-states", "united-kingdom", "germany", "australia", "france", "netherlands", "ireland"];
    for (const c of countries) {
      const countryEntries = entries.filter((e) => e.category === `immigration-${c}`);
      const topics = new Set(countryEntries.map((e) => e.subcategory));
      for (const t of requiredTopics) {
        expect(topics.has(t)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts`
Expected: FAIL — the "at least 74 immigration entries" and "each country covers all 8 topics" assertions fail (0 immigration entries exist yet).

- [ ] **Step 4: Commit the harness**

```bash
git add backend/src/seed-knowledge.ts backend/src/__tests__/seed-knowledge.test.ts
git commit -m "test: add seed-knowledge validation harness for immigration content expansion"
```

This test stays red until Task 10 is complete — that's expected; each content task (2–10) is verified against the relevant subset of these assertions manually (see each task's own verification step), and the full suite goes green at the end of Task 10.

---

### Task 2: Canada immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts` (append to `entries` array, before the closing `];`)

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries with `category: "immigration-canada"`, one per topic in `["study-permit", "work-rights", "pr-pathway", "financial-proof", "healthcare", "banking", "tax", "housing"]`.

- [ ] **Step 1: Append 8 Canada entries**

Add a new section comment and 8 entries following the Content Rubric above, e.g.:

```typescript
  // ===================== IMMIGRATION: CANADA =====================
  {
    title: "Canada Study Permit Process",
    content: `[Write 200-400 words covering: who needs a study permit, the Designated Learning Institution (DLI) requirement, key documents (letter of acceptance, proof of funds, passport), the online application via IRCC, biometrics, typical processing times, and how a Provincial Attestation Letter (PAL) factors in as of the 2024+ intake cap changes. End with: "Processing times and requirements change — always confirm current details on canada.ca before applying."]`,
    category: "immigration-canada",
    subcategory: "study-permit",
    tags: ["canada", "study permit", "ircc", "dli", "student visa"],
    metadata: {},
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
  },
  {
    title: "Canada Post-Graduation Work Permit (PGWP)",
    content: `[200-400 words: PGWP eligibility (must have studied at an eligible DLI, program length rules), permit length tied to program length, one-time use, work authorization scope (open work permit), how it supports the Canadian Experience Class pathway. Note recent PGWP eligibility tightening for certain programs. End with a canada.ca verification note.]`,
    category: "immigration-canada",
    subcategory: "work-rights",
    tags: ["canada", "pgwp", "work permit", "post-graduation"],
    metadata: {},
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html",
  },
  {
    title: "Canada Permanent Residence Pathways for Former Students",
    content: `[200-400 words: Express Entry system, Canadian Experience Class (CEC), Provincial Nominee Programs (PNP), how PGWP work experience feeds CRS score, typical timelines. Hedge on point thresholds changing per draw.]`,
    category: "immigration-canada",
    subcategory: "pr-pathway",
    tags: ["canada", "permanent residence", "express entry", "cec", "pnp"],
    metadata: {},
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
  },
  {
    title: "Canada Study Permit Financial Proof Requirements",
    content: `[200-400 words: proof of funds requirement (tuition + living costs), the Guaranteed Investment Certificate (GIC) option and current minimum amount guidance, acceptable alternatives (bank statements, sponsor letters, scholarship letters), and why applicants should check the current published minimum since it is updated periodically.]`,
    category: "immigration-canada",
    subcategory: "financial-proof",
    tags: ["canada", "proof of funds", "gic", "financial requirement"],
    metadata: {},
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/finances.html",
  },
  {
    title: "Healthcare Coverage for International Students in Canada",
    content: `[200-400 words: healthcare is provincial, not federal — coverage varies (e.g. BC's MSP waiting period vs. Ontario requiring private insurance, Quebec's agreements with France). Explain most institutions require or offer a student health insurance plan (SHIP/UHIP). Advise checking the specific province and institution.]`,
    category: "immigration-canada",
    subcategory: "healthcare",
    tags: ["canada", "healthcare", "student insurance", "ohip", "ship"],
    metadata: {},
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/new-life-canada/health-care-card.html",
  },
  {
    title: "Opening a Bank Account in Canada as a Newcomer",
    content: `[200-400 words: major banks with newcomer programs (RBC, Scotiabank, TD, CIBC, BMO), typical documents needed (passport, study permit, proof of address, SIN if available), newcomer packages waiving fees, and building credit history as an international student.]`,
    category: "immigration-canada",
    subcategory: "banking",
    tags: ["canada", "banking", "newcomer", "bank account", "sin"],
    metadata: {},
    source_url: "https://www.canada.ca/en/financial-consumer-agency/services/banking/open-bank-account.html",
  },
  {
    title: "Tax Obligations for International Students in Canada",
    content: `[200-400 words: tax residency vs. immigration status distinction, when a student must file a Canadian tax return, the SIN/ITN requirement, common credits/benefits available (GST/HST credit), and the CRA's role. Note tax treaties can affect obligations for students from certain countries.]`,
    category: "immigration-canada",
    subcategory: "tax",
    tags: ["canada", "tax", "cra", "sin", "tax return"],
    metadata: {},
    source_url: "https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/information-been-canada.html",
  },
  {
    title: "Housing and Tenant Rights for Newcomers in Canada",
    content: `[200-400 words: housing is provincially regulated (each province has its own Residential Tenancies Act), typical requirements (proof of income or guarantor for those with no Canadian credit history), standard lease terms, deposit rules (varies by province — some ban security deposits, e.g. Ontario), and where to find provincial tenant rights info.]`,
    category: "immigration-canada",
    subcategory: "housing",
    tags: ["canada", "housing", "tenant rights", "lease", "rental"],
    metadata: {},
    source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/new-life-canada/housing.html",
  },
```

Write the actual 200–400 word `content` for each entry (the bracketed instructions above are the brief — replace them with real prose following the Content Rubric and Global Constraints; do not leave bracketed text in the file).

- [ ] **Step 2: Run the validation test, check Canada-specific assertions pass**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts`
Expected: the "no duplicate titles" and "non-empty fields" tests PASS; the "≥74 total" and "all 8 countries have 8 topics" tests still FAIL (expected until Task 10) — confirm via output that Canada's 8 topics are present by temporarily running:
```bash
cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"
```
Expected output shows failures only for the 7 countries not yet added, not for Canada.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add Canada immigration knowledge base entries"
```

---

### Task 3: United States immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts` (append after Canada section)

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries, `category: "immigration-united-states"`, topics: `study-permit` (F-1/I-20/SEVIS), `work-rights` (OPT/CPT), `pr-pathway` (H-1B → green card routes), `financial-proof` (I-20 funding proof), `healthcare`, `banking`, `tax` (1040-NR, ITIN), `housing`.

- [ ] **Step 1: Append 8 US entries**

Follow the same structure as Task 2, using the `Entry` shape and Content Rubric. Titles: "US F-1 Student Visa Process", "US Optional Practical Training (OPT) and CPT", "US Pathways from F-1 to Green Card", "US F-1 Financial Proof (I-20 Funding) Requirements", "Healthcare Coverage for International Students in the US", "Opening a Bank Account in the US as an International Student", "Tax Filing for International Students in the US (1040-NR, ITIN)", "Housing and Lease Basics for International Students in the US". Source URLs: uscis.gov, studyinthestates.dhs.gov, irs.gov.

- [ ] **Step 2: Run validation test, confirm US assertions pass alongside Canada's**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"`
Expected: failures remain only for the 6 countries not yet added.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add United States immigration knowledge base entries"
```

---

### Task 4: United Kingdom immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts`

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries, `category: "immigration-united-kingdom"`, topics per rubric (student visa/CAS, Graduate Route work rights, Skilled Worker → settlement pathway, financial proof/maintenance funds, IHS healthcare surcharge, banking, tax/National Insurance, housing/tenancy).

- [ ] **Step 1: Append 8 UK entries**

Titles: "UK Student Visa Process (CAS)", "UK Graduate Route Work Rights", "UK Pathways from Student to Settlement", "UK Student Visa Maintenance Funds Requirement", "UK Immigration Health Surcharge (IHS) and NHS Access", "Opening a Bank Account in the UK as a Newcomer", "UK Tax and National Insurance for International Students", "Housing and Tenancy Rights for Newcomers in the UK". Source URLs: gov.uk pages.

- [ ] **Step 2: Run validation test**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"`
Expected: failures remain only for the 5 countries not yet added.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add United Kingdom immigration knowledge base entries"
```

---

### Task 5: Germany immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts`

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries, `category: "immigration-germany"`, topics (national student visa process, 140-day/280-half-day work rights + 18-month post-study job search visa, EU Blue Card → settlement pathway, Sperrkonto blocked account requirement, statutory health insurance, banking/Anmeldung, tax basics, housing/Anmeldung + tenant rights).

- [ ] **Step 1: Append 8 Germany entries**

Titles: "Germany National Student Visa Process", "Germany Student Work Rights (120/240 Half-Days)", "Germany Pathways from Student to Settlement (EU Blue Card)", "Germany Blocked Account (Sperrkonto) Requirement", "Statutory Health Insurance for Students in Germany", "Opening a Bank Account in Germany as a Newcomer", "Tax Basics for International Students Working in Germany", "Anmeldung and Tenant Rights in Germany". Source URLs: auswaertiges-amt.de, bamf.de, germany.info, make-it-in-germany.com.

- [ ] **Step 2: Run validation test**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"`
Expected: failures remain only for the 4 countries not yet added.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add Germany immigration knowledge base entries"
```

---

### Task 6: Australia immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts`

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries, `category: "immigration-australia"`, topics (Subclass 500 student visa + GTE statement, subclass 485 post-study work rights, skilled migration pathway, financial capacity requirement, OSHC health cover, banking, tax file number basics, rental/housing basics).

- [ ] **Step 1: Append 8 Australia entries**

Titles: "Australia Student Visa (Subclass 500) Process", "Australia Temporary Graduate Visa (Subclass 485) Work Rights", "Australia Skilled Migration Pathways from Student Visa", "Australia Student Visa Financial Capacity Requirement", "Overseas Student Health Cover (OSHC) in Australia", "Opening a Bank Account in Australia as an International Student", "Tax File Number and Tax Basics for Students in Australia", "Rental and Housing Basics for Newcomers in Australia". Source URLs: homeaffairs.gov.au, studyaustralia.gov.au, ato.gov.au.

- [ ] **Step 2: Run validation test**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"`
Expected: failures remain only for the 3 countries not yet added.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add Australia immigration knowledge base entries"
```

---

### Task 7: France immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts`

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries, `category: "immigration-france"`, topics (VLS-TS student visa + Campus France procedure, post-study APS work permit, talent passport/settlement pathway, financial resources requirement, PUMA/student healthcare (Sécurité Sociale), banking, tax basics, CAF housing assistance + tenant rights).

- [ ] **Step 1: Append 8 France entries**

Titles: "France Student Visa (VLS-TS) and Campus France Process", "France Post-Study Work Rights (APS Permit)", "France Pathways from Student to Long-Term Settlement", "France Student Visa Financial Resources Requirement", "Student Healthcare Coverage in France (Sécurité Sociale)", "Opening a Bank Account in France as an International Student", "Tax Basics for International Students in France", "CAF Housing Assistance and Tenant Rights in France". Source URLs: france-visas.gouv.fr, campusfrance.org, service-public.fr, caf.fr.

- [ ] **Step 2: Run validation test**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"`
Expected: failures remain only for the 2 countries not yet added.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add France immigration knowledge base entries"
```

---

### Task 8: Netherlands immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts`

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries, `category: "immigration-netherlands"`, topics (student residence permit via institution, orientation year work permit, highly skilled migrant → settlement pathway, financial means requirement, Dutch health insurance (zorgverzekering), banking/DigiD & BSN, tax basics (30% ruling context for workers), housing/rental basics).

- [ ] **Step 1: Append 8 Netherlands entries**

Titles: "Netherlands Student Residence Permit Process", "Netherlands Orientation Year Work Permit for Graduates", "Netherlands Pathways from Student to Highly Skilled Migrant Settlement", "Netherlands Student Financial Means Requirement", "Dutch Health Insurance Requirement for Students (Zorgverzekering)", "Opening a Bank Account in the Netherlands (BSN and DigiD)", "Tax Basics for International Students and Workers in the Netherlands", "Rental Housing Basics for Newcomers in the Netherlands". Source URLs: ind.nl, government.nl, belastingdienst.nl.

- [ ] **Step 2: Run validation test**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"`
Expected: failures remain only for Ireland.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add Netherlands immigration knowledge base entries"
```

---

### Task 9: Ireland immigration content (8 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts`

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 8 entries, `category: "immigration-ireland"`, topics (student stamp 2 visa process, Third Level Graduate Programme work rights, critical skills employment permit → settlement pathway, financial requirement, HSE/private health insurance for students, banking, tax basics (PPS number), housing/RTB tenant rights).

- [ ] **Step 1: Append 8 Ireland entries**

Titles: "Ireland Student Visa Process (Stamp 2)", "Ireland Third Level Graduate Programme Work Rights", "Ireland Pathways from Student to Long-Term Residence", "Ireland Student Visa Financial Requirement", "Health Insurance Requirements for Students in Ireland", "Opening a Bank Account in Ireland as a Newcomer", "PPS Number and Tax Basics in Ireland", "Residential Tenancies Board (RTB) Tenant Rights in Ireland". Source URLs: irishimmigration.ie, citizensinformation.ie, revenue.ie, rtb.ie.

- [ ] **Step 2: Run validation test — all 8 countries should now pass**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts -t "each country covers"`
Expected: PASS (all 8 countries now have all 8 topics).

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add Ireland immigration knowledge base entries"
```

---

### Task 10: Cross-cutting immigration topics (10 entries)

**Files:**
- Modify: `backend/src/seed-knowledge.ts`

**Interfaces:**
- Consumes: `Entry` type from Task 1.
- Produces: 10 entries, `category: "immigration-general"`, one per topic listed below.

- [ ] **Step 1: Append 10 cross-cutting entries**

```typescript
  // ===================== IMMIGRATION: CROSS-CUTTING =====================
```
Titles and subcategories (write 200–400 words each per the rubric):
1. "Common Immigration and Visa Scam Patterns" — `subcategory: "scam-patterns"` — tags: scam, fraud, red flags, visa scam. Source: a consumer-protection or embassy fraud-alert page.
2. "Foreign Credential Recognition and Equivalency" — `subcategory: "credential-recognition"` — tags: credentials, equivalency, wes, degree recognition.
3. "Mental Health Resources for People Relocating Abroad" — `subcategory: "mental-health"` — tags: mental health, wellbeing, culture shock, support.
4. "Remote Work and Digital Nomad Visas Overview" — `subcategory: "digital-nomad"` — tags: remote work, digital nomad visa, freelance visa.
5. "English Proficiency Tests for Study and Work Visas (IELTS, TOEFL, PTE, Duolingo)" — `subcategory: "language-tests"` — tags: ielts, toefl, pte, duolingo, language test.
6. "Sending Money and Currency Exchange Internationally" — `subcategory: "remittances"` — tags: money transfer, remittance, exchange rate, wire transfer.
7. "International Health and Travel Insurance Basics" — `subcategory: "insurance"` — tags: health insurance, travel insurance, coverage.
8. "Job Search Strategies for Visa-Sponsorship Candidates" — `subcategory: "job-search"` — tags: job search, sponsorship, work visa, employer sponsorship.
9. "Workplace Rights Against Exploitation for Visa Holders" — `subcategory: "worker-rights"` — tags: worker rights, exploitation, labor rights, visa holder.
10. "What to Do If Your Visa Status Is at Risk" — `subcategory: "status-risk"` — tags: visa status, overstay, emergency, legal aid.

- [ ] **Step 2: Run the full validation suite — everything should pass now**

Run: `cd backend && npx vitest run src/__tests__/seed-knowledge.test.ts`
Expected: PASS (all tests green — 74+ immigration entries, 8 countries × 8 topics, 10+ cross-cutting entries, no duplicate titles, valid URLs).

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-knowledge.ts
git commit -m "content: add cross-cutting immigration knowledge base entries"
```

---

### Task 11: Trim hardcoded country knowledge from the chat system prompt

**Files:**
- Modify: `frontend/src/app/api/ai/chat/route.ts:53-58`
- Modify: `frontend/src/__tests__/ai-suite.test.ts` (append a new describe block)

**Interfaces:**
- Consumes: nothing new (existing `BASE_SYSTEM` constant and `fetchRAG` function already in the file).
- Produces: `BASE_SYSTEM` no longer contains the string `"## Country-specific knowledge"`.

- [ ] **Step 1: Export a small check the test can use**

`BASE_SYSTEM` is currently a module-private `const`. Export it so it's testable:
```typescript
export const BASE_SYSTEM = `You are GlobalBridge's intelligent immigration copilot...`;
```
(keep the rest of the template literal as-is aside from Step 2's removal).

- [ ] **Step 2: Write the failing test**

Append to `frontend/src/__tests__/ai-suite.test.ts`:
```typescript
import { BASE_SYSTEM } from "@/app/api/ai/chat/route";

describe("Chat system prompt", () => {
  it("does not hardcode country-specific visa facts (relies on RAG instead)", () => {
    expect(BASE_SYSTEM).not.toContain("## Country-specific knowledge");
    expect(BASE_SYSTEM).not.toContain("Sperrkonto");
  });

  it("still contains the hard rules and safety sections", () => {
    expect(BASE_SYSTEM).toContain("## Hard rules");
    expect(BASE_SYSTEM).toContain("## Safety");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/ai-suite.test.ts -t "Chat system prompt"`
Expected: FAIL — `BASE_SYSTEM` still contains `"## Country-specific knowledge"`.

- [ ] **Step 4: Remove the hardcoded block**

In `frontend/src/app/api/ai/chat/route.ts`, delete lines 53-58 (the `## Country-specific knowledge` section, from that header through the Germany/US/Australia bullets) so the template literal goes directly from the `## Response format` section to `## Safety`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/__tests__/ai-suite.test.ts -t "Chat system prompt"`
Expected: PASS.

- [ ] **Step 6: Run the full frontend test suite to confirm no regressions**

Run: `cd frontend && npx vitest run`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/api/ai/chat/route.ts frontend/src/__tests__/ai-suite.test.ts
git commit -m "refactor: rely on RAG for country immigration facts instead of hardcoded prompt block"
```

---

### Task 12: Admin Knowledge Base management page

**Files:**
- Create: `frontend/src/app/(admin)/admin/ai/knowledge/page.tsx`
- Modify: `frontend/src/app/(admin)/admin/ai/page.tsx` (add a link to the new page)

**Interfaces:**
- Consumes: `authFetch` from `@/lib/auth` (signature: `authFetch(input: RequestInfo | URL, init?: RequestInit, timeoutMs?: number): Promise<Response>`); backend routes `GET /api/knowledge?search=&category=&limit=&offset=`, `GET /api/knowledge/:id`, `POST /api/knowledge`, `PATCH /api/knowledge/:id`, `DELETE /api/knowledge/:id` (all already implemented in `backend/src/routes/knowledge.ts`, proxied via `next.config.ts`'s `/api/knowledge/:path*` rewrite).
- Produces: a client-rendered admin page; no new exports consumed elsewhere.

- [ ] **Step 1: Build the page component**

Create `frontend/src/app/(admin)/admin/ai/knowledge/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, Loader2, BookOpen } from "lucide-react";
import { authFetch } from "@/lib/auth";

type Entry = {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

type EntryDetail = Entry & { content: string; is_active: boolean };

type FormState = {
  title: string;
  content: string;
  category: string;
  subcategory: string;
  tags: string;
  source_url: string;
};

const EMPTY_FORM: FormState = { title: "", content: "", category: "", subcategory: "", tags: "", source_url: "" };

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntryDetail | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const res = await authFetch(`/api/knowledge?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load knowledge base entries");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  async function openEdit(id: string) {
    try {
      const res = await authFetch(`/api/knowledge/${id}`);
      if (!res.ok) throw new Error("Failed to load entry");
      const data = await res.json();
      const e: EntryDetail = data.entry;
      setEditing(e);
      setForm({
        title: e.title,
        content: e.content,
        category: e.category,
        subcategory: e.subcategory ?? "",
        tags: e.tags.join(", "),
        source_url: e.source_url ?? "",
      });
      setShowForm(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load entry");
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        category: form.category,
        subcategory: form.subcategory || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        source_url: form.source_url || undefined,
      };
      const res = editing
        ? await authFetch(`/api/knowledge/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await authFetch(`/api/knowledge`, { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this knowledge base entry? This cannot be undone.")) return;
    try {
      const res = await authFetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-white">
            <BookOpen className="mr-2 inline -translate-y-1 text-[#8b6bff]" size={22} /> Knowledge Base
          </h1>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500/70 to-violet-500/60 px-3.5 py-2 text-sm font-medium text-white shadow-[0_0_20px_-6px_rgba(77,139,255,.6)]"
          >
            <Plus size={15} /> New Entry
          </button>
        </div>

        {err && (
          <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">{err}</div>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or content..."
              className="w-full rounded-lg border border-white/10 bg-black/25 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
            />
          </div>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Filter by category (e.g. immigration-canada)"
            className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
          />
        </div>

        <div className="overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br from-[#171c2a]/70 to-[#0f1424]/50">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={16} /> Loading...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No entries found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Subcategory</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white">{e.title}</td>
                    <td className="px-4 py-3 text-slate-400">{e.category}</td>
                    <td className="px-4 py-3 text-slate-400">{e.subcategory ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(e.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(e.id)} className="text-slate-400 hover:text-white" aria-label={`Edit ${e.title}`}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(e.id)} className="text-slate-400 hover:text-red-400" aria-label={`Delete ${e.title}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="text-xs text-slate-500">{total} total entries</div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-[600px] rounded-[18px] border border-white/10 bg-[#12172a] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">{editing ? "Edit Entry" : "New Entry"}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Title"
                  className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                />
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Content"
                  rows={6}
                  className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Category (e.g. immigration-canada)"
                    className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  />
                  <input
                    value={form.subcategory}
                    onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                    placeholder="Subcategory (optional)"
                    className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  />
                </div>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="Tags (comma-separated)"
                  className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                />
                <input
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  placeholder="Source URL (optional)"
                  className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShowForm(false)} className="rounded-lg px-3.5 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button
                  onClick={submit}
                  disabled={saving || !form.title || !form.content || !form.category}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500/70 to-violet-500/60 px-3.5 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {saving && <Loader2 className="animate-spin" size={14} />} {editing ? "Save Changes" : "Create Entry"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Link the page from the AI Control Center hero**

In `frontend/src/app/(admin)/admin/ai/page.tsx`, add an import:
```tsx
import Link from "next/link";
import { BookOpen } from "lucide-react";
```
(add `BookOpen` to the existing `lucide-react` import line instead of a second import if one already exists — check the current import list at the top of the file first.)

Then inside the hero `<section>` (near the `Probe` badges around line 282), add a link button:
```tsx
<Link
  href="/admin/ai/knowledge"
  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-white/25 hover:text-white"
>
  <BookOpen size={14} /> Manage Knowledge Base
</Link>
```

- [ ] **Step 3: Manual verification in the browser**

Start the frontend dev server (`npm run dev` in `frontend/`) with a backend running and `NEXT_PUBLIC_API_URL` pointed at it. Navigate to `/admin/ai` as an admin user, click "Manage Knowledge Base", confirm the list loads, search/filter work, and create → edit → delete a test entry round-trips correctly (check the network tab for `POST/PATCH/DELETE /api/knowledge`).

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(admin)/admin/ai/knowledge/page.tsx" "frontend/src/app/(admin)/admin/ai/page.tsx"
git commit -m "feat: add admin Knowledge Base management page"
```

---

### Task 13: Regenerate embeddings and spot-check RAG retrieval

**Files:** none (operational task — no code changes)

**Interfaces:**
- Consumes: `backend/src/generate-embeddings.ts` (existing script, run via `npm run` script or `npx tsx src/generate-embeddings.ts` from `backend/`), `POST /api/rag/search` (existing route).

- [ ] **Step 1: Run the seed script against a real database**

```bash
cd backend && npx tsx src/seed-knowledge.ts
```
Expected output: `Seeding <N> knowledge entries...` followed by one line per entry, ending with `Done. <N> entries inserted.`

- [ ] **Step 2: Generate embeddings for the new entries**

```bash
cd backend && npx tsx src/generate-embeddings.ts
```
Expected output: `Found <N> entries to embed.` followed by progress lines, ending with `Complete: <N> embedded, 0 errors`.

- [ ] **Step 3: Spot-check RAG retrieval for at least 3 countries**

```bash
curl -s -X POST http://localhost:4000/api/rag/search -H "Content-Type: application/json" -d '{"query":"how much money do I need to prove for a German student visa","limit":3}'
```
Expected: JSON response with `method: "vector"` and a top result whose `category` is `immigration-germany` and `subcategory` is `financial-proof`.

Repeat with:
```bash
curl -s -X POST http://localhost:4000/api/rag/search -H "Content-Type: application/json" -d '{"query":"can I work after graduating from a Canadian university","limit":3}'
curl -s -X POST http://localhost:4000/api/rag/search -H "Content-Type: application/json" -d '{"query":"common rental scams when moving abroad","limit":3}'
```
Expected: top results from `immigration-canada`/`work-rights` and `immigration-general`/`scam-patterns` respectively.

- [ ] **Step 4: Manual chat verification**

In the running frontend app, ask the AI Assistant a country-specific question for 3 of the 8 countries (e.g. "What do I need to prove financially for a French student visa?") and confirm the response cites a `source_url` matching one of the new entries rather than a generic/hallucinated answer.

This task has no commit — it's a verification/operational step confirming the content added in Tasks 2–10 is live and retrievable.

---

## Self-Review Notes

- **Spec coverage:** Content plan (8 countries × 8 topics + 10 cross-cutting) → Tasks 2–10. Prompt trim → Task 11. Admin UI → Task 12. Embedding regen + RAG spot-check → Task 13. All spec sections covered.
- **Placeholder scan:** Task content bodies use bracketed `[Write 200-400 words covering: ...]` briefs rather than pre-written prose — this is intentional: authoring ~74 full immigration entries (200–400 words each, ~20,000+ words total) inline in this plan document would duplicate the actual implementation work. Each task's brief is specific enough (exact facts to cover, exact source domain) that no task requires guessing; the bracketed instructions must be replaced with real prose during execution, not left in the committed file — Step 2 of each content task explicitly says "do not leave bracketed text in the file."
- **Type consistency:** `Entry` type (Task 1) is used identically by Tasks 2–10. `authFetch` signature in Task 12 matches the real implementation in `frontend/src/lib/auth.ts:124`. Backend route paths in Task 12 match `backend/src/routes/knowledge.ts` exactly.
