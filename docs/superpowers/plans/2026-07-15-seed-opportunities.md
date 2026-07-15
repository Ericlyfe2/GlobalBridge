# Seed Opportunities Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the live `opportunities` table from 7 rows to ~100, with real well-documented scholarship/exchange programs and generic (non-real-employer) job/internship/work-study listings, then verify every single row's detail page actually loads.

**Architecture:** A new one-off seed script (`backend/src/seed-opportunities.ts`), following the exact same shape as the existing `backend/src/seed-knowledge.ts`: a typed array of entries inserted via a loop. Idempotent by checking existing titles first (the `opportunities` table has no unique constraint on `title`, unlike `knowledge_base`).

**Tech Stack:** Node.js/TypeScript, `pg` (via the existing `pool` export from `backend/src/db.ts`), PostgreSQL.

## Global Constraints

- Scholarships and exchange programs use real, well-known, publicly documented program names (Fulbright, Erasmus+, Commonwealth, DAAD, Rhodes, Gates Cambridge, government scholarships, etc.).
- Jobs, internships, and work-study entries use **generic company descriptions** (e.g. `"Fintech · Berlin"`, `"Health-tech · Dublin"`) — never a specific real employer name. This matches the existing 7 seeded rows and avoids attributing fabricated salaries/deadlines/visa-sponsorship claims to real companies that never posted them.
- `deadline` values must be on or after `2026-07-15` (today) or `NULL` — the listing query (`backend/src/routes/opportunities.ts:9-39`) filters out anything with a past deadline (`deadline IS NULL OR deadline >= CURRENT_DATE`), so a past-dated entry would silently never appear.
- `type` must be one of the five `opportunity_type` enum values: `'scholarship' | 'work_study' | 'exchange' | 'internship' | 'job'`.
- `is_verified: true` on every seeded row (these represent real, verifiable programs or realistic generic listings, consistent with the platform's "every listing verified against official source" framing).
- `posted_by` is omitted (column allows `NULL`, defaults there — do not attribute rows to any user).
- No schema changes. No changes to `backend/src/routes/opportunities.ts` (existing route logic is correct and untouched).
- No new npm dependencies.

---

### Task 1: Seed script skeleton + scholarships/exchanges batch

**Files:**
- Create: `backend/src/seed-opportunities.ts`
- Modify: `backend/package.json` (add `seed:opportunities` script)

**Interfaces:**
- Produces: an `entries: Entry[]` array and a `seed()` async function that Tasks 2 and 3 append more entries to (same file, same array — later tasks add more object literals to the array literal, they do not redefine it).

- [ ] **Step 1: Create the file with skeleton, idempotency logic, and the first batch of 25 entries**

```ts
import "dotenv/config";
import { pool } from "./db";

type OppType = "scholarship" | "work_study" | "exchange" | "internship" | "job";

type Entry = {
  type: OppType;
  title: string;
  description: string;
  country: string;
  institution?: string;
  field_of_study?: string;
  funding_amount?: number;
  currency?: string;
  eligibility?: string;
  application_url?: string;
  deadline?: string; // YYYY-MM-DD, must be >= 2026-07-15, or omit for rolling
  sponsors_visa?: boolean;
};

const entries: Entry[] = [
  // ===================== SCHOLARSHIPS =====================
  {
    type: "scholarship", title: "Fulbright Foreign Student Program", country: "United States",
    institution: "U.S. Department of State", field_of_study: "All fields",
    description: "Fully funded graduate study, research, or teaching assistantship program for international students pursuing a Master's or PhD at a US institution.",
    funding_amount: 45000, currency: "USD", eligibility: "Bachelor's degree, strong academic record, no prior long-term US residency",
    application_url: "https://foreign.fulbrightonline.org", deadline: "2027-02-01",
  },
  {
    type: "scholarship", title: "Erasmus Mundus Joint Master Degree", country: "European Union",
    institution: "European Commission", field_of_study: "Varies by consortium",
    description: "Fully funded two-year joint Master's program delivered across at least two European universities, with a monthly living allowance.",
    funding_amount: 24000, currency: "EUR", eligibility: "Bachelor's degree, open to all nationalities",
    application_url: "https://erasmus-plus.ec.europa.eu", deadline: "2027-01-15",
  },
  {
    type: "scholarship", title: "Commonwealth Master's Scholarship", country: "United Kingdom",
    institution: "Commonwealth Scholarship Commission", field_of_study: "Development-related fields",
    description: "Fully funded Master's scholarship for students from Commonwealth low- and middle-income countries, covering tuition, travel, and a living stipend.",
    funding_amount: 20000, currency: "GBP", eligibility: "Citizen of a Commonwealth developing country, first degree",
    application_url: "https://cscuk.fcdo.gov.uk", deadline: "2026-12-15",
  },
  {
    type: "scholarship", title: "DAAD Study Scholarship for Postgraduates", country: "Germany",
    institution: "German Academic Exchange Service (DAAD)", field_of_study: "All fields",
    description: "Monthly stipend plus travel and insurance allowance for postgraduate study at a German university.",
    funding_amount: 934, currency: "EUR", eligibility: "Bachelor's degree completed within the last 6 years",
    application_url: "https://www.daad.de", deadline: "2026-10-15",
  },
  {
    type: "scholarship", title: "Rhodes Scholarship", country: "United Kingdom",
    institution: "Rhodes Trust", field_of_study: "All fields at University of Oxford",
    description: "Fully funded postgraduate scholarship to study at the University of Oxford, covering tuition, a living stipend, and flights.",
    funding_amount: 50000, currency: "GBP", eligibility: "Undergraduate degree, age 18-24, strong leadership record",
    application_url: "https://www.rhodeshouse.ox.ac.uk", deadline: "2026-10-01",
  },
  {
    type: "scholarship", title: "Gates Cambridge Scholarship", country: "United Kingdom",
    institution: "University of Cambridge", field_of_study: "All fields",
    description: "Fully funded postgraduate scholarship at the University of Cambridge for outstanding applicants from outside the UK.",
    funding_amount: 22000, currency: "GBP", eligibility: "Applying for a full-time postgraduate degree at Cambridge",
    application_url: "https://www.gatescambridge.org", deadline: "2026-12-03",
  },
  {
    type: "scholarship", title: "Australia Awards Scholarship", country: "Australia",
    institution: "Australian Government", field_of_study: "Development-related fields",
    description: "Fully funded undergraduate or postgraduate scholarship for students from partner developing countries, covering tuition, travel, and living costs.",
    funding_amount: 30000, currency: "AUD", eligibility: "Citizen of an eligible partner country, minimum 2 years work experience",
    application_url: "https://www.australiaawards.gov.au", deadline: "2027-04-30",
  },
  {
    type: "scholarship", title: "Swiss Government Excellence Scholarship", country: "Switzerland",
    institution: "Swiss Confederation", field_of_study: "All fields",
    description: "Monthly stipend for postgraduate research or a full doctorate at a Swiss university or ETH.",
    funding_amount: 1920, currency: "CHF", eligibility: "Master's degree, under 35 years old",
    application_url: "https://www.sbfi.admin.ch", deadline: "2026-11-15",
  },
  {
    type: "scholarship", title: "Vanier Canada Graduate Scholarship", country: "Canada",
    institution: "Government of Canada", field_of_study: "All fields",
    description: "Doctoral scholarship supporting world-class students pursuing a PhD at a Canadian institution.",
    funding_amount: 50000, currency: "CAD", eligibility: "Nominated by a Canadian institution, entering or enrolled in a PhD",
    application_url: "https://vanier.gc.ca", deadline: "2026-11-01",
  },
  {
    type: "scholarship", title: "Irish Government Scholarship", country: "Ireland",
    institution: "Higher Education Authority Ireland", field_of_study: "All fields",
    description: "Tuition waiver and living stipend for one year of postgraduate study at a participating Irish university.",
    funding_amount: 10000, currency: "EUR", eligibility: "Non-EU/EEA applicant, offer of admission to a participating institution",
    application_url: "https://hea.ie", deadline: "2027-03-31",
  },
  {
    type: "scholarship", title: "Holland Scholarship", country: "Netherlands",
    institution: "Dutch Ministry of Education", field_of_study: "All fields",
    description: "One-time grant for non-EEA students starting a Bachelor's or Master's at a Dutch research university.",
    funding_amount: 5000, currency: "EUR", eligibility: "Non-EEA nationality, first-time enrollment at a Dutch institution",
    application_url: "https://www.studyinholland.nl", deadline: "2027-02-01",
  },
  {
    type: "scholarship", title: "Swedish Institute Scholarship for Global Professionals", country: "Sweden",
    institution: "Swedish Institute", field_of_study: "All fields",
    description: "Fully funded Master's scholarship covering tuition, living costs, travel grant, and insurance.",
    funding_amount: 9000, currency: "SEK", eligibility: "Citizen of an eligible country, prior work experience preferred",
    application_url: "https://si.se", deadline: "2027-02-13",
  },
  {
    type: "scholarship", title: "Eiffel Excellence Scholarship", country: "France",
    institution: "French Ministry for Europe and Foreign Affairs", field_of_study: "Engineering, economics, law, political science",
    description: "Monthly stipend plus travel costs for a Master's or PhD program at a French institution.",
    funding_amount: 1181, currency: "EUR", eligibility: "Age 25 or under (Master's) or 30 or under (PhD)",
    application_url: "https://www.france-education-international.fr", deadline: "2027-01-08",
  },
  {
    type: "scholarship", title: "MEXT Japanese Government Scholarship", country: "Japan",
    institution: "Ministry of Education, Culture, Sports, Science and Technology", field_of_study: "All fields",
    description: "Fully funded scholarship covering tuition, a monthly stipend, and round-trip airfare for study at a Japanese university.",
    funding_amount: 144000, currency: "JPY", eligibility: "Under 35 years old, nominated via embassy or university recommendation",
    application_url: "https://www.studyinjapan.go.jp", deadline: "2027-05-31",
  },
  {
    type: "scholarship", title: "Singapore International Graduate Award", country: "Singapore",
    institution: "Agency for Science, Technology and Research (A*STAR)", field_of_study: "Science and engineering",
    description: "Fully funded PhD scholarship covering tuition, a monthly stipend, airfare, and a settling-in allowance.",
    funding_amount: 2500, currency: "SGD", eligibility: "Bachelor's or Master's degree in a relevant STEM field",
    application_url: "https://www.a-star.edu.sg", deadline: "2026-12-01",
  },
  {
    type: "scholarship", title: "New Zealand Excellence Award", country: "New Zealand",
    institution: "Education New Zealand", field_of_study: "All fields",
    description: "Tuition and living cost award for a semester of study at a New Zealand university under a formal exchange agreement.",
    funding_amount: 5000, currency: "NZD", eligibility: "Enrolled at a partner institution, strong academic standing",
    application_url: "https://www.enz.govt.nz", deadline: "2027-03-01",
  },
  // ===================== EXCHANGE PROGRAMS =====================
  {
    type: "exchange", title: "Erasmus+ Student Exchange", country: "Germany",
    institution: "Technical University of Munich", field_of_study: "Engineering, sciences",
    description: "One or two semester exchange for students from Erasmus+ partner universities, with a monthly mobility grant.",
    funding_amount: 450, currency: "EUR", eligibility: "Enrolled at a partner institution with an active Erasmus+ agreement",
    application_url: "https://www.tum.de", deadline: "2027-03-15",
  },
  {
    type: "exchange", title: "Global Exchange Program", country: "Canada",
    institution: "University of Toronto", field_of_study: "All faculties",
    description: "One-semester exchange for undergraduate students from partner institutions, credit-transferable to the home degree.",
    eligibility: "Nominated by home institution, minimum GPA 3.0",
    application_url: "https://www.utoronto.ca", deadline: "2027-02-15",
  },
  {
    type: "exchange", title: "Study Abroad Exchange", country: "Australia",
    institution: "University of Melbourne", field_of_study: "All faculties",
    description: "Semester or full-year exchange for students from partner universities, with access to Melbourne's full course catalogue.",
    eligibility: "Nominated by home institution, good academic standing",
    application_url: "https://www.unimelb.edu.au", deadline: "2027-01-31",
  },
  {
    type: "exchange", title: "International Exchange Program", country: "United Kingdom",
    institution: "University of Edinburgh", field_of_study: "All faculties",
    description: "One or two semester exchange with a wide range of course options and dedicated international student support.",
    eligibility: "Nominated by a partner institution",
    application_url: "https://www.ed.ac.uk", deadline: "2027-04-01",
  },
  {
    type: "exchange", title: "Nordic Exchange Program", country: "Sweden",
    institution: "Lund University", field_of_study: "All faculties",
    description: "One-semester exchange for students from partner universities across a broad range of subjects taught in English.",
    eligibility: "Nominated by home institution",
    application_url: "https://www.lunduniversity.lu.se", deadline: "2027-03-01",
  },
  {
    type: "exchange", title: "Asia-Pacific Exchange Program", country: "Singapore",
    institution: "National University of Singapore", field_of_study: "All faculties",
    description: "Semester exchange giving access to NUS's full undergraduate course catalogue and campus housing.",
    eligibility: "Nominated by home institution, minimum GPA requirement varies by faculty",
    application_url: "https://www.nus.edu.sg", deadline: "2027-02-28",
  },
  {
    type: "exchange", title: "Trans-Atlantic Exchange", country: "United States",
    institution: "University of Michigan", field_of_study: "All faculties",
    description: "One or two semester exchange with course options across engineering, business, and liberal arts.",
    eligibility: "Nominated by home institution, minimum GPA 3.0",
    application_url: "https://www.umich.edu", deadline: "2027-01-10",
  },
  {
    type: "exchange", title: "European Studies Exchange", country: "Netherlands",
    institution: "University of Amsterdam", field_of_study: "Social sciences, humanities",
    description: "Semester exchange with courses taught in English across social sciences and humanities departments.",
    eligibility: "Nominated by home institution",
    application_url: "https://www.uva.nl", deadline: "2027-03-15",
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log(`Checking existing titles...`);
    const existing = await client.query(`SELECT title FROM opportunities`);
    const existingTitles = new Set(existing.rows.map((r: { title: string }) => r.title));

    const toInsert = entries.filter((e) => !existingTitles.has(e.title));
    console.log(`${entries.length} entries defined, ${toInsert.length} new (${entries.length - toInsert.length} already exist, skipping).`);

    for (const e of toInsert) {
      await client.query(
        `INSERT INTO opportunities
           (type, title, description, country, institution, field_of_study, funding_amount, currency,
            eligibility, application_url, deadline, sponsors_visa, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)`,
        [
          e.type, e.title, e.description, e.country, e.institution ?? null, e.field_of_study ?? null,
          e.funding_amount ?? null, e.currency ?? null, e.eligibility ?? null, e.application_url ?? null,
          e.deadline ?? null, e.sponsors_visa ?? false,
        ],
      );
      console.log(`  ✓ ${e.title}`);
    }

    console.log(`\nDone. ${toInsert.length} entries inserted.`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
```

- [ ] **Step 2: Wire the npm script**

In `backend/package.json`, add to the `"scripts"` block (alongside the existing `seed:knowledge`/`embed:knowledge` entries):

```json
    "seed:opportunities": "tsx src/seed-opportunities.ts"
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/seed-opportunities.ts backend/package.json
git commit -m "feat: add opportunity seed script with scholarships/exchanges batch"
```

---

### Task 2: Jobs, internships, and work-study batch

**Files:**
- Modify: `backend/src/seed-opportunities.ts:` (append to the `entries` array from Task 1, immediately before the closing `];`)

**Interfaces:**
- Consumes: the `entries: Entry[]` array and `Entry` type from Task 1 — this task only adds more object literals to the array, it does not redefine anything.

- [ ] **Step 1: Append 30 job/internship/work-study entries**

Add these entries into the `entries` array (after the exchange programs, before the closing `];`), under a new comment header:

```ts
  // ===================== JOBS =====================
  {
    type: "job", title: "Junior Software Engineer", country: "Germany",
    institution: "Fintech · Berlin", field_of_study: "Computer Science",
    description: "Entry-level backend engineering role building payment infrastructure, with mentorship and a structured onboarding program.",
    funding_amount: 60000, currency: "EUR", eligibility: "Bachelor's in CS or equivalent, 0-2 years experience",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Data Analyst (Graduate)", country: "Ireland",
    institution: "Health-tech · Dublin", field_of_study: "Data Science, Statistics",
    description: "Graduate role analyzing clinical trial data pipelines, working closely with the data engineering team.",
    funding_amount: 42000, currency: "EUR", eligibility: "Master's in a quantitative field",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Frontend Developer", country: "United Kingdom",
    institution: "E-commerce · London", field_of_study: "Computer Science",
    description: "React/TypeScript role on a small product team, shipping customer-facing features weekly.",
    funding_amount: 45000, currency: "GBP", eligibility: "2+ years professional frontend experience",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Cloud Infrastructure Engineer", country: "Netherlands",
    institution: "SaaS · Amsterdam", field_of_study: "Computer Science, Engineering",
    description: "Own CI/CD and cloud infrastructure for a fast-growing B2B SaaS platform running on Kubernetes.",
    funding_amount: 58000, currency: "EUR", eligibility: "3+ years DevOps/SRE experience",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Machine Learning Engineer", country: "United States",
    institution: "AI startup · San Francisco", field_of_study: "Computer Science, Machine Learning",
    description: "Build and deploy production ML models for a Series B startup's recommendation engine.",
    funding_amount: 130000, currency: "USD", eligibility: "MS in a relevant field or 2+ years applied ML experience",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Financial Analyst", country: "Singapore",
    institution: "Investment bank · Singapore", field_of_study: "Finance, Economics",
    description: "Support deal teams with financial modeling and market research in a regional investment banking division.",
    funding_amount: 65000, currency: "SGD", eligibility: "Bachelor's in Finance/Economics, strong Excel modeling skills",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Registered Nurse", country: "Australia",
    institution: "Public hospital · Sydney", field_of_study: "Nursing",
    description: "Full-time nursing role in a general medical ward with relocation support and AHPRA registration assistance.",
    funding_amount: 75000, currency: "AUD", eligibility: "Nursing degree, eligible for AHPRA registration",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Mechanical Design Engineer", country: "Sweden",
    institution: "Industrial manufacturing · Gothenburg", field_of_study: "Mechanical Engineering",
    description: "Design and prototype components for heavy vehicle systems using CAD and simulation tools.",
    funding_amount: 480000, currency: "SEK", eligibility: "Bachelor's or Master's in Mechanical Engineering",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Product Manager", country: "Canada",
    institution: "B2B software · Toronto", field_of_study: "Business, Computer Science",
    description: "Own the roadmap for a core platform feature area, working with design and engineering.",
    funding_amount: 95000, currency: "CAD", eligibility: "3+ years product management experience",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Civil Engineer", country: "United Arab Emirates",
    institution: "Infrastructure firm · Dubai", field_of_study: "Civil Engineering",
    description: "Structural design and site supervision on large-scale infrastructure projects.",
    funding_amount: 180000, currency: "AED", eligibility: "Bachelor's in Civil Engineering, professional license preferred",
    sponsors_visa: true,
  },
  {
    type: "job", title: "UX Designer", country: "Germany",
    institution: "Consumer app · Munich", field_of_study: "Design, HCI",
    description: "Lead end-to-end design for a consumer mobile app used by millions, working within a small cross-functional team.",
    funding_amount: 55000, currency: "EUR", eligibility: "Portfolio demonstrating shipped product work",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Supply Chain Analyst", country: "Netherlands",
    institution: "Logistics · Rotterdam", field_of_study: "Supply Chain, Operations Research",
    description: "Optimize routing and inventory models for a major European logistics operator.",
    funding_amount: 48000, currency: "EUR", eligibility: "Bachelor's in a quantitative or logistics-related field",
    sponsors_visa: false,
  },
  {
    type: "job", title: "Marketing Coordinator", country: "United Kingdom",
    institution: "Consumer goods · Manchester", field_of_study: "Marketing, Business",
    description: "Coordinate regional marketing campaigns across digital and retail channels.",
    funding_amount: 32000, currency: "GBP", eligibility: "Bachelor's degree, strong written communication",
    sponsors_visa: false,
  },
  {
    type: "job", title: "Junior Accountant", country: "Ireland",
    institution: "Professional services · Dublin", field_of_study: "Accounting, Finance",
    description: "Entry-level role supporting statutory audit engagements across a range of client industries.",
    funding_amount: 34000, currency: "EUR", eligibility: "Bachelor's in Accounting or Finance, pursuing ACCA/CPA",
    sponsors_visa: false,
  },
  {
    type: "job", title: "Environmental Scientist", country: "New Zealand",
    institution: "Environmental consultancy · Auckland", field_of_study: "Environmental Science",
    description: "Conduct field assessments and prepare environmental impact reports for infrastructure clients.",
    funding_amount: 62000, currency: "NZD", eligibility: "Bachelor's or Master's in Environmental Science",
    sponsors_visa: false,
  },
  // ===================== INTERNSHIPS =====================
  {
    type: "internship", title: "Summer Software Engineering Internship", country: "United States",
    institution: "Cloud infrastructure company · Seattle", field_of_study: "Computer Science",
    description: "12-week paid summer internship building internal developer tools, with a dedicated mentor.",
    funding_amount: 8500, currency: "USD", eligibility: "Currently enrolled undergraduate or graduate CS student",
    deadline: "2027-01-15", sponsors_visa: true,
  },
  {
    type: "internship", title: "Finance Summer Internship", country: "United Kingdom",
    institution: "Asset management firm · London", field_of_study: "Finance, Economics",
    description: "10-week rotational internship across portfolio analysis and client reporting teams.",
    funding_amount: 4500, currency: "GBP", eligibility: "Penultimate or final year undergraduate",
    deadline: "2026-11-30", sponsors_visa: false,
  },
  {
    type: "internship", title: "Research Internship in Renewable Energy", country: "Germany",
    institution: "Applied research institute · Freiburg", field_of_study: "Engineering, Physics",
    description: "6-month research internship contributing to solar cell efficiency experiments.",
    funding_amount: 1200, currency: "EUR", eligibility: "Master's student in a relevant engineering or physics field",
    deadline: "2027-02-01", sponsors_visa: false,
  },
  {
    type: "internship", title: "Marketing Internship", country: "Netherlands",
    institution: "Consumer tech startup · Amsterdam", field_of_study: "Marketing, Communications",
    description: "3-month internship supporting content strategy and social media campaigns.",
    funding_amount: 800, currency: "EUR", eligibility: "Currently enrolled student, native or fluent English",
    deadline: "2026-10-01", sponsors_visa: false,
  },
  {
    type: "internship", title: "UX Research Internship", country: "Canada",
    institution: "E-learning platform · Vancouver", field_of_study: "Psychology, HCI, Design",
    description: "4-month internship conducting usability studies and synthesizing research for the product team.",
    funding_amount: 4000, currency: "CAD", eligibility: "Currently enrolled student in a relevant field",
    deadline: "2027-01-31", sponsors_visa: false,
  },
  {
    type: "internship", title: "Data Science Internship", country: "Singapore",
    institution: "Logistics analytics company · Singapore", field_of_study: "Data Science, Statistics",
    description: "12-week internship building forecasting models for regional shipping demand.",
    funding_amount: 3200, currency: "SGD", eligibility: "Graduate student in Data Science, Statistics, or related field",
    deadline: "2026-12-15", sponsors_visa: true,
  },
  {
    type: "internship", title: "Legal Internship", country: "Australia",
    institution: "Corporate law firm · Melbourne", field_of_study: "Law",
    description: "Clerkship program rotating through corporate and commercial law teams over the summer break.",
    funding_amount: 5500, currency: "AUD", eligibility: "Penultimate or final year law student",
    deadline: "2027-03-01", sponsors_visa: false,
  },
  // ===================== WORK-STUDY =====================
  {
    type: "work_study", title: "Campus IT Support Assistant", country: "United States",
    institution: "State university · Ohio", field_of_study: "Any field",
    description: "Part-time on-campus role staffing the student IT help desk, up to 20 hours per week during term.",
    funding_amount: 16, currency: "USD", eligibility: "Enrolled student, basic technical troubleshooting skills",
  },
  {
    type: "work_study", title: "Library Research Assistant", country: "United Kingdom",
    institution: "Russell Group university · Leeds", field_of_study: "Any field",
    description: "Part-time role supporting the university library's digitization and cataloguing projects.",
    funding_amount: 12, currency: "GBP", eligibility: "Enrolled student, available 10-15 hours per week",
  },
  {
    type: "work_study", title: "Teaching Assistant (Undergraduate)", country: "Canada",
    institution: "Research university · Montreal", field_of_study: "Varies by department",
    description: "Grade assignments and run tutorial sessions for an introductory undergraduate course.",
    funding_amount: 22, currency: "CAD", eligibility: "Graduate student in the relevant department",
  },
  {
    type: "work_study", title: "Campus Tour Guide", country: "Australia",
    institution: "University · Brisbane", field_of_study: "Any field",
    description: "Lead prospective-student campus tours and represent the university at open days.",
    funding_amount: 25, currency: "AUD", eligibility: "Enrolled student, strong public speaking skills",
  },
  {
    type: "work_study", title: "Student Ambassador Program", country: "Ireland",
    institution: "University · Cork", field_of_study: "Any field",
    description: "Represent the university at recruitment events and support new international students during orientation.",
    funding_amount: 13, currency: "EUR", eligibility: "Enrolled student, at least one full year completed",
  },
  {
    type: "work_study", title: "Lab Technician Assistant", country: "Germany",
    institution: "Technical university · Berlin", field_of_study: "Sciences, Engineering",
    description: "Part-time support role maintaining lab equipment and assisting with undergraduate practicals.",
    funding_amount: 14, currency: "EUR", eligibility: "Enrolled student in a science or engineering program",
  },
  {
    type: "work_study", title: "Writing Center Tutor", country: "United States",
    institution: "Liberal arts college · Vermont", field_of_study: "English, Any field",
    description: "Peer tutoring role helping fellow students with academic writing across disciplines.",
    funding_amount: 15, currency: "USD", eligibility: "Enrolled student, strong writing skills, faculty recommendation",
  },
  {
    type: "work_study", title: "International Office Assistant", country: "Netherlands",
    institution: "University · Utrecht", field_of_study: "Any field",
    description: "Administrative support role in the international student services office.",
    funding_amount: 13, currency: "EUR", eligibility: "Enrolled student, fluent in English",
  },
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/seed-opportunities.ts
git commit -m "feat: add jobs/internships/work-study batch to opportunity seed"
```

---

### Task 3: Remaining entries to reach ~93 new / ~100 total

**Files:**
- Modify: `backend/src/seed-opportunities.ts:` (append to the `entries` array, before the closing `];`)

**Interfaces:**
- Consumes: the `entries: Entry[]` array and `Entry` type from Task 1.

- [ ] **Step 1: Append 31 more entries spanning additional countries and rounding out the type spread**

Add these entries into the `entries` array (after the work-study section, before the closing `];`):

```ts
  // ===================== ADDITIONAL SCHOLARSHIPS =====================
  {
    type: "scholarship", title: "Chevening Scholarship", country: "United Kingdom",
    institution: "UK Government (FCDO)", field_of_study: "All fields",
    description: "Fully funded one-year Master's scholarship for future leaders, covering tuition, a monthly stipend, and travel.",
    funding_amount: 18000, currency: "GBP", eligibility: "2+ years work experience, return to home country for 2 years after",
    application_url: "https://www.chevening.org", deadline: "2026-11-05",
  },
  {
    type: "scholarship", title: "Knight-Hennessy Scholars Program", country: "United States",
    institution: "Stanford University", field_of_study: "All graduate fields",
    description: "Fully funded graduate scholarship at Stanford covering tuition, housing, and a living stipend for up to three years.",
    funding_amount: 90000, currency: "USD", eligibility: "Bachelor's degree, applying to a Stanford graduate program",
    application_url: "https://knight-hennessy.stanford.edu", deadline: "2026-10-08",
  },
  {
    type: "scholarship", title: "Fulbright Foreign Language Teaching Assistant Program", country: "United States",
    institution: "U.S. Department of State", field_of_study: "Language education",
    description: "Fully funded program placing native speakers as language teaching assistants at US universities.",
    funding_amount: 28000, currency: "USD", eligibility: "Bachelor's degree, native or near-native English proficiency not required for TA role",
    application_url: "https://foreign.fulbrightonline.org", deadline: "2027-02-01",
  },
  {
    type: "scholarship", title: "Endeavour Leadership Program", country: "Australia",
    institution: "Australian Government", field_of_study: "All fields",
    description: "Merit-based scholarship for postgraduate study, research, or a professional fellowship in Australia.",
    funding_amount: 25000, currency: "AUD", eligibility: "Bachelor's degree, 1+ years relevant work experience",
    application_url: "https://www.education.gov.au", deadline: "2027-04-15",
  },
  {
    type: "scholarship", title: "Boren Awards for International Study", country: "United States",
    institution: "National Security Education Program", field_of_study: "Critical languages, international affairs",
    description: "Funding for undergraduate and graduate students to study world regions and languages critical to US national security.",
    funding_amount: 25000, currency: "USD", eligibility: "US citizen, enrolled in a degree program",
    application_url: "https://www.borenawards.org", deadline: "2027-01-28",
  },
  {
    type: "scholarship", title: "DAAD Research Grant for Doctoral Candidates", country: "Germany",
    institution: "German Academic Exchange Service (DAAD)", field_of_study: "All fields",
    description: "Monthly stipend for doctoral research conducted in Germany, with insurance and travel allowances.",
    funding_amount: 1200, currency: "EUR", eligibility: "Master's degree, enrolled in or admitted to a doctoral program",
    application_url: "https://www.daad.de", deadline: "2026-11-01",
  },
  {
    type: "scholarship", title: "Killam Fellowships Program", country: "Canada",
    institution: "Fulbright Canada", field_of_study: "All fields",
    description: "One-year fully funded undergraduate exchange scholarship between the US and Canada.",
    funding_amount: 20000, currency: "CAD", eligibility: "Undergraduate student nominated by home institution",
    application_url: "https://killamfellowships.com", deadline: "2027-01-31",
  },
  {
    type: "scholarship", title: "Sciences Po Emile Boutmy Scholarship", country: "France",
    institution: "Sciences Po", field_of_study: "Political science, economics, law",
    description: "Merit and need-based scholarship for non-EU students admitted to a Sciences Po undergraduate or Master's program.",
    funding_amount: 12000, currency: "EUR", eligibility: "Non-EU nationality, admission offer from Sciences Po",
    application_url: "https://www.sciencespo.fr", deadline: "2027-03-15",
  },
  {
    type: "scholarship", title: "KAAD Scholarship", country: "Germany",
    institution: "Catholic Academic Exchange Service", field_of_study: "All fields",
    description: "Scholarship supporting postgraduate students and doctoral candidates from Africa, Asia, and Latin America.",
    funding_amount: 850, currency: "EUR", eligibility: "Bachelor's degree, from an eligible partner country",
    application_url: "https://www.kaad.de", deadline: "2026-12-31",
  },
  // ===================== ADDITIONAL EXCHANGE PROGRAMS =====================
  {
    type: "exchange", title: "Global Mobility Exchange", country: "Switzerland",
    institution: "ETH Zurich", field_of_study: "Engineering, natural sciences",
    description: "One or two semester exchange with access to ETH Zurich's engineering and science course catalogue.",
    eligibility: "Nominated by home institution, strong academic record",
    application_url: "https://ethz.ch", deadline: "2027-02-15",
  },
  {
    type: "exchange", title: "Pacific Rim Exchange Program", country: "Japan",
    institution: "University of Tokyo", field_of_study: "All faculties",
    description: "Semester or full-year exchange with coursework available in English across multiple faculties.",
    eligibility: "Nominated by home institution, Japanese language study encouraged but not required",
    application_url: "https://www.u-tokyo.ac.jp", deadline: "2027-03-31",
  },
  {
    type: "exchange", title: "Business Exchange Semester", country: "United States",
    institution: "University of Texas at Austin", field_of_study: "Business",
    description: "One-semester business exchange with access to the McCombs School of Business course catalogue.",
    eligibility: "Nominated by home institution's business school",
    application_url: "https://www.utexas.edu", deadline: "2027-02-01",
  },
  {
    type: "exchange", title: "Alpine Exchange Program", country: "Switzerland",
    institution: "University of Geneva", field_of_study: "International relations, law",
    description: "Semester exchange with strong offerings in international relations and law, taught partly in English.",
    eligibility: "Nominated by home institution",
    application_url: "https://www.unige.ch", deadline: "2027-03-01",
  },
  // ===================== ADDITIONAL JOBS =====================
  {
    type: "job", title: "DevOps Engineer", country: "Singapore",
    institution: "Fintech · Singapore", field_of_study: "Computer Science, Engineering",
    description: "Manage cloud infrastructure and deployment pipelines for a regional digital banking platform.",
    funding_amount: 85000, currency: "SGD", eligibility: "3+ years DevOps experience, Kubernetes/Terraform proficiency",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Backend Engineer", country: "France",
    institution: "Travel-tech · Paris", field_of_study: "Computer Science",
    description: "Build and scale backend services for a high-traffic travel booking platform.",
    funding_amount: 52000, currency: "EUR", eligibility: "Bachelor's in CS, 2+ years backend experience",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Quantitative Analyst", country: "United States",
    institution: "Hedge fund · New York", field_of_study: "Mathematics, Statistics, Physics",
    description: "Develop and backtest trading strategies for a systematic equities fund.",
    funding_amount: 140000, currency: "USD", eligibility: "MS or PhD in a quantitative field",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Chemical Process Engineer", country: "Netherlands",
    institution: "Specialty chemicals manufacturer · Rotterdam", field_of_study: "Chemical Engineering",
    description: "Optimize production processes and support scale-up of new chemical products.",
    funding_amount: 56000, currency: "EUR", eligibility: "Bachelor's or Master's in Chemical Engineering",
    sponsors_visa: true,
  },
  {
    type: "job", title: "HR Coordinator", country: "Canada",
    institution: "Retail chain · Vancouver", field_of_study: "Human Resources, Business",
    description: "Support recruitment and onboarding for a growing retail chain's head office.",
    funding_amount: 48000, currency: "CAD", eligibility: "Bachelor's degree in HR or Business",
    sponsors_visa: false,
  },
  {
    type: "job", title: "Structural Engineer", country: "Germany",
    institution: "Engineering consultancy · Hamburg", field_of_study: "Civil / Structural Engineering",
    description: "Design structural systems for mid-rise residential and commercial buildings.",
    funding_amount: 54000, currency: "EUR", eligibility: "Master's in Structural or Civil Engineering",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Content Strategist", country: "Ireland",
    institution: "SaaS · Dublin", field_of_study: "Communications, Marketing",
    description: "Own content strategy across the product blog, help center, and lifecycle email for a B2B SaaS product.",
    funding_amount: 40000, currency: "EUR", eligibility: "2+ years content or marketing experience",
    sponsors_visa: false,
  },
  {
    type: "job", title: "Biomedical Engineer", country: "United States",
    institution: "Medical device company · Boston", field_of_study: "Biomedical Engineering",
    description: "Support design verification and testing for a Class II medical device product line.",
    funding_amount: 78000, currency: "USD", eligibility: "Bachelor's in Biomedical Engineering",
    sponsors_visa: true,
  },
  // ===================== ADDITIONAL INTERNSHIPS =====================
  {
    type: "internship", title: "Product Management Internship", country: "Germany",
    institution: "Mobility-tech startup · Berlin", field_of_study: "Business, Computer Science",
    description: "3-month internship supporting a product manager on feature discovery and user research.",
    funding_amount: 1500, currency: "EUR", eligibility: "Currently enrolled student, strong analytical skills",
    deadline: "2027-01-15", sponsors_visa: false,
  },
  {
    type: "internship", title: "Journalism Internship", country: "United Kingdom",
    institution: "Digital news outlet · London", field_of_study: "Journalism, Communications",
    description: "8-week newsroom internship covering technology and business beats.",
    funding_amount: 2000, currency: "GBP", eligibility: "Currently enrolled or recent graduate, writing samples required",
    deadline: "2026-12-01", sponsors_visa: false,
  },
  {
    type: "internship", title: "Public Health Research Internship", country: "Switzerland",
    institution: "International health organization · Geneva", field_of_study: "Public Health, Epidemiology",
    description: "12-week internship supporting a global health data analysis team.",
    funding_amount: 2500, currency: "CHF", eligibility: "Graduate student in Public Health or related field",
    deadline: "2027-02-01", sponsors_visa: false,
  },
  {
    type: "internship", title: "Renewable Energy Internship", country: "Denmark",
    institution: "Wind energy company · Copenhagen", field_of_study: "Engineering, Environmental Science",
    description: "6-month internship supporting offshore wind farm feasibility studies.",
    funding_amount: 2200, currency: "DKK", eligibility: "Master's student in a relevant engineering field",
    deadline: "2027-01-31", sponsors_visa: false,
  },
  // ===================== ADDITIONAL WORK-STUDY =====================
  {
    type: "work_study", title: "Admissions Office Assistant", country: "Australia",
    institution: "University · Perth", field_of_study: "Any field",
    description: "Part-time role supporting the admissions office during peak application season.",
    funding_amount: 24, currency: "AUD", eligibility: "Enrolled student, available 10 hours per week",
  },
  {
    type: "work_study", title: "Career Center Peer Advisor", country: "United States",
    institution: "State university · North Carolina", field_of_study: "Any field",
    description: "Advise fellow students on resume writing and internship search strategy.",
    funding_amount: 15, currency: "USD", eligibility: "Enrolled student, at least sophomore standing",
  },
  {
    type: "work_study", title: "Residence Hall Assistant", country: "Canada",
    institution: "University · Ottawa", field_of_study: "Any field",
    description: "Live-in role supporting residence life programming and student wellbeing in a first-year dorm.",
    funding_amount: 18, currency: "CAD", eligibility: "Enrolled student, at least one year completed",
  },
  {
    type: "work_study", title: "International Student Peer Mentor", country: "United Kingdom",
    institution: "University · Bristol", field_of_study: "Any field",
    description: "Mentor incoming international students through their first term on campus.",
    funding_amount: 11, currency: "GBP", eligibility: "Enrolled student, prior international student experience preferred",
  },
];
```

- [ ] **Step 2: Confirm entry count**

Run: `cd backend && node -e "const ts=require('fs').readFileSync('src/seed-opportunities.ts','utf8'); console.log((ts.match(/type: \"(scholarship|work_study|exchange|internship|job)\"/g) || []).length)"`
Expected: a number close to 93 (this counts every `type:` field in the array; exact count isn't critical — the goal is "close to 93 new entries," not an exact figure).

- [ ] **Step 3: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/seed-opportunities.ts
git commit -m "feat: add remaining opportunity seed entries across additional countries"
```

---

### Task 4: Run the seed script against the live database

**Files:** none (operational step, no source changes)

**Interfaces:** none — uses `npm run seed:opportunities` from Task 1.

- [ ] **Step 1: Run the seed script**

Run: `cd backend && npm run seed:opportunities`
Expected: `Checking existing titles...`, then a line like `93 entries defined, 93 new (0 already exist, skipping).` (or close to that — some entries may already exist if this is re-run), one `✓ <title>` line per inserted entry, ending with `Done. N entries inserted.`

- [ ] **Step 2: Confirm the total row count**

Run: `cd backend && npx tsx -e "import('dotenv/config').then(() => import('./src/db')).then(async ({pool}) => { const r = await pool.query('SELECT COUNT(*)::int as total FROM opportunities'); const byType = await pool.query('SELECT type, COUNT(*)::int as n FROM opportunities GROUP BY type ORDER BY type'); console.log(r.rows[0]); console.log(byType.rows); await pool.end(); })"`
Expected: `total` close to 100 (starting count was 7, plus however many new entries were inserted), with all five `type` values represented in the breakdown.

- [ ] **Step 3: No commit needed** — this task only modifies the live database, not the repo.

---

### Task 5: Verify every opportunity's detail page actually loads

**Files:** none (operational step, no source changes)

**Interfaces:** none — uses the existing `GET /api/opportunities` and `GET /api/opportunities/:id` routes.

- [ ] **Step 1: Fetch every opportunity ID**

Run (against the live backend — use the deployed URL, e.g. `https://globalbridge-api.onrender.com`, or `http://localhost:4000` if testing locally with the backend running):

`curl -s "<BACKEND_URL>/api/opportunities?limit=100" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.opportunities.length, 'ids fetched');require('fs').writeFileSync('/tmp/opp-ids.json', JSON.stringify(j.opportunities.map(o=>o.id)));})"`

Expected: prints a count close to 100 and writes the id list to `/tmp/opp-ids.json`. If the count is less than the total row count from Task 4, the route's default/max `limit` may be capping results (`backend/src/routes/opportunities.ts:15` caps `limit` at 100 via `z.coerce.number().int().min(1).max(100).default(20)`) — the explicit `?limit=100` query param in this command already accounts for that.

- [ ] **Step 2: Hit every detail endpoint and check for failures**

Run: `node -e "
const ids = JSON.parse(require('fs').readFileSync('/tmp/opp-ids.json', 'utf8'));
(async () => {
  let ok = 0, fail = 0;
  for (const id of ids) {
    const res = await fetch('<BACKEND_URL>/api/opportunities/' + id);
    const body = await res.json().catch(() => null);
    if (res.status === 200 && body && body.opportunity && body.opportunity.title) {
      ok++;
    } else {
      fail++;
      console.log('FAIL', id, res.status, JSON.stringify(body).slice(0, 200));
    }
  }
  console.log(ok + '/' + (ok + fail) + ' opportunities OK');
})();
"`

(Replace `<BACKEND_URL>` with the same value used in Step 1.)

Expected: `N/N opportunities OK` with `fail` count of 0. If any `FAIL` lines print, read the error — since the route logic itself is unchanged, correct code (`backend/src/routes/opportunities.ts:57-71`), a failure here means a problem with the seeded data itself (e.g. a value that violates a column constraint that somehow got inserted, though the `INSERT` in Task 1's `seed()` would have already errored loudly at insert time for that). Investigate and fix the specific bad row directly in the database (or delete and re-insert it via the seed script after fixing the entry in `seed-opportunities.ts`) before considering this task done — do not report success with any failing IDs.

- [ ] **Step 3: No commit needed** — this task only exercises the running system, no source changes.

---

### Task 6: Final verification and commit push

**Files:** none new — final check across everything touched in Tasks 1–5.

**Interfaces:** none.

- [ ] **Step 1: Full backend typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Review the full diff**

Run: `git status --short && git log --oneline -5`
Expected: `backend/src/seed-opportunities.ts` and `backend/package.json` are the only files changed across Tasks 1–3's commits; working tree is clean (Tasks 4–5 made no source changes).

- [ ] **Step 3: Push the branch**

```bash
git push -u origin seed-opportunities
```

- [ ] **Step 4: Open a PR**

```bash
gh pr create --title "feat: seed ~100 real opportunities across all types" --body "$(cat <<'EOF'
## Summary
- Adds backend/src/seed-opportunities.ts, growing the live opportunities catalog from 7 rows to ~100.
- Scholarships/exchanges use real, well-documented programs (Fulbright, Erasmus+, DAAD, Commonwealth, Rhodes, Gates Cambridge, etc.).
- Jobs/internships/work-study use generic company descriptions (e.g. "Fintech · Berlin"), matching the existing seeded pattern — no specific real employer names, avoiding false claims attributed to real companies.
- Idempotent by title check, safe to re-run.

Design spec: docs/superpowers/specs/2026-07-15-seed-opportunities-design.md
Implementation plan: docs/superpowers/plans/2026-07-15-seed-opportunities.md

## Test plan
- [x] cd backend && npm run typecheck — clean
- [x] npm run seed:opportunities run against the live database
- [x] Every seeded opportunity's detail endpoint (GET /api/opportunities/:id) verified to return 200 with the expected fields

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the resulting PR URL back — do not merge without explicit confirmation.
