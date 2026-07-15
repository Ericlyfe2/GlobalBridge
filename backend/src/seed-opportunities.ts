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
    type: "scholarship", title: "Research Training Program Scholarship", country: "Australia",
    institution: "Australian Government", field_of_study: "All research fields",
    description: "Funds tuition fees and a living stipend for a Master's by Research or PhD at an Australian university.",
    funding_amount: 32000, currency: "AUD", eligibility: "Bachelor's with honours or equivalent research experience, offer of admission to a research degree",
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
  // ===================== TOP-UP BATCH =====================
  {
    type: "scholarship", title: "Marshall Scholarship", country: "United Kingdom",
    institution: "UK Government (Marshall Aid Commemoration Commission)", field_of_study: "All fields",
    description: "Fully funded scholarship for young Americans to study for a graduate degree at any UK university.",
    funding_amount: 55000, currency: "GBP", eligibility: "US citizen, bachelor's degree with a GPA of 3.7 or above",
    application_url: "https://www.marshallscholarship.org", deadline: "2026-09-24",
  },
  {
    type: "scholarship", title: "Schwarzman Scholars Program", country: "China",
    institution: "Tsinghua University", field_of_study: "Public policy, economics, business, international studies",
    description: "Fully funded one-year Master's program in Beijing designed to build leadership skills and understanding of China.",
    funding_amount: 45000, currency: "USD", eligibility: "Bachelor's degree, age 18-29",
    application_url: "https://www.schwarzmanscholars.org", deadline: "2026-09-15",
  },
  {
    type: "scholarship", title: "OFID Scholarship Award", country: "Austria",
    institution: "OPEC Fund for International Development", field_of_study: "Development-related fields",
    description: "Master's scholarship for students from developing countries pursuing studies in a development-related field.",
    funding_amount: 20000, currency: "USD", eligibility: "Citizen of an OFID partner country, bachelor's degree",
    application_url: "https://ofid.org", deadline: "2027-03-31",
  },
  {
    type: "exchange", title: "Global Semester Exchange", country: "South Korea",
    institution: "Yonsei University", field_of_study: "All faculties",
    description: "One-semester exchange with a wide range of courses taught in English and dedicated international student services.",
    eligibility: "Nominated by home institution",
    application_url: "https://www.yonsei.ac.kr", deadline: "2027-04-15",
  },
  {
    type: "exchange", title: "Iberian Exchange Program", country: "Spain",
    institution: "University of Barcelona", field_of_study: "All faculties",
    description: "Semester or full-year exchange with strong offerings in business, humanities, and social sciences.",
    eligibility: "Nominated by home institution",
    application_url: "https://www.ub.edu", deadline: "2027-03-01",
  },
  {
    type: "job", title: "Site Reliability Engineer", country: "Ireland",
    institution: "Cloud communications company · Dublin", field_of_study: "Computer Science, Engineering",
    description: "Ensure uptime and performance for a high-traffic communications API platform serving global customers.",
    funding_amount: 68000, currency: "EUR", eligibility: "3+ years SRE or backend experience",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Actuarial Analyst", country: "Switzerland",
    institution: "Reinsurance company · Zurich", field_of_study: "Actuarial Science, Mathematics",
    description: "Support pricing and risk modeling for a global reinsurance portfolio, progressing toward actuarial exams.",
    funding_amount: 85000, currency: "CHF", eligibility: "Bachelor's in Mathematics, Statistics, or Actuarial Science",
    sponsors_visa: true,
  },
  {
    type: "job", title: "Renewable Energy Project Engineer", country: "Denmark",
    institution: "Offshore wind developer · Aarhus", field_of_study: "Engineering",
    description: "Support technical feasibility and permitting work for offshore wind farm development projects.",
    funding_amount: 490000, currency: "DKK", eligibility: "Bachelor's or Master's in Engineering",
    sponsors_visa: true,
  },
  {
    type: "internship", title: "International Development Internship", country: "Switzerland",
    institution: "UN-affiliated agency · Geneva", field_of_study: "International Relations, Development Studies",
    description: "12-week internship supporting program evaluation and reporting for a development agency's field programs.",
    funding_amount: 2000, currency: "CHF", eligibility: "Graduate student in International Relations or related field",
    deadline: "2027-01-31",
  },
  {
    type: "internship", title: "Software Engineering Internship", country: "South Korea",
    institution: "Consumer electronics company · Seoul", field_of_study: "Computer Science, Electrical Engineering",
    description: "10-week internship on an embedded systems team building firmware for consumer devices.",
    funding_amount: 2500000, currency: "KRW", eligibility: "Currently enrolled undergraduate or graduate student",
    deadline: "2027-02-15", sponsors_visa: true,
  },
  {
    type: "work_study", title: "Sports Center Assistant", country: "United States",
    institution: "State university · Colorado", field_of_study: "Any field",
    description: "Part-time role staffing the campus recreation center front desk and equipment checkout.",
    funding_amount: 14, currency: "USD", eligibility: "Enrolled student, available evenings and weekends",
  },
  {
    type: "work_study", title: "Alumni Relations Assistant", country: "United Kingdom",
    institution: "University · Nottingham", field_of_study: "Any field",
    description: "Part-time role supporting alumni event planning and communications.",
    funding_amount: 12, currency: "GBP", eligibility: "Enrolled student, strong written communication",
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
