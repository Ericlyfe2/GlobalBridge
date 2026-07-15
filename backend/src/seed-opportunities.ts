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
