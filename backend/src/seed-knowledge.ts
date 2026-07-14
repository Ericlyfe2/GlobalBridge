import "dotenv/config";
import { pool } from "./db";

type Entry = {
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  metadata: Record<string, string>;
};

const entries: Entry[] = [
  // ===================== PLATFORM OVERVIEW =====================
  {
    title: "What is GlobalBridge?",
    content: `GlobalBridge is an all-in-one platform for international students and immigrants. It combines AI-guided visa and immigration support, a verified housing marketplace, mentorship programs, job and scholarship discovery, and a life-support toolkit. The platform serves four user roles: Student, Mentor, Employer, and Admin. GlobalBridge supports 14 languages and is built with Next.js 15, Express, PostgreSQL, and OpenAI.`,
    category: "platform-overview",
    tags: ["about", "overview", "introduction", "platform"],
    metadata: {},
  },
  {
    title: "Supported Languages",
    content: `GlobalBridge supports 14 languages: English, French, Spanish, German, Italian, Portuguese, Arabic, Chinese (Simplified), Japanese, Korean, Russian, Turkish, Hindi, and Swahili. Users can switch languages at any time using the language switcher in the navigation. The AI assistant responds in the user's selected language.`,
    category: "platform-overview",
    tags: ["languages", "i18n", "translation", "localization"],
    metadata: {},
  },
  {
    title: "User Roles and Permissions",
    content: `GlobalBridge has four user roles:
- Student: Can browse opportunities, housing, forums, use AI tools, message mentors, save listings, apply for scholarships, use the visa assistant, document checker, and essay scorer.
- Mentor: Verified mentors can list themselves for mentoring, post opportunities, answer forum questions, create success stories, and book sessions with students.
- Employer: Can post jobs, list visa sponsorship opportunities, find candidates, and manage job listings.
- Admin: Full platform access including user management, verification moderation, listing moderation, report handling, audit log access, AI configuration, and system health monitoring.`,
    category: "platform-overview",
    tags: ["roles", "permissions", "student", "mentor", "employer", "admin", "access"],
    metadata: {},
  },

  // ===================== AUTHENTICATION =====================
  {
    title: "Authentication and Registration",
    content: `GlobalBridge uses Firebase Authentication for user identity. Users can sign up with email and password or sign in with existing accounts. During registration, users select their role (Student, Mentor, or Employer). After Firebase auth, a profile is created in the GlobalBridge database. JWT tokens are used for WebSocket connections. Session data is stored in localStorage. The authentication flow includes email/password login, registration with profile creation, password reset, and automatic token refresh.`,
    category: "authentication",
    tags: ["login", "signup", "register", "firebase", "auth", "sign in"],
    metadata: {},
  },
  {
    title: "Profile Setup",
    content: `After registration, users can set up their profile including: full name, bio, avatar, country of origin, country of residence, preferred language, and contact information. Students can add their educational background. Mentors can add expertise areas, languages spoken, universities attended, and years abroad. Employers can add company name, website, size, industry, and visa sponsorship details.`,
    category: "authentication",
    tags: ["profile", "setup", "avatar", "bio", "settings"],
    metadata: {},
  },
  {
    title: "Account Verification",
    content: `Users can verify their identity on the Verification page. The verification process includes submitting identification documents. Admin reviews and approves or rejects verification requests. Verified users get a verification badge. Mentors must be verified before they can offer mentoring services. Verification status can be: pending, verified, or rejected.`,
    category: "authentication",
    tags: ["verification", "verify", "identity", "badge", "approved"],
    metadata: {},
  },

  // ===================== DASHBOARDS =====================
  {
    title: "Student Dashboard",
    content: `The Student Dashboard provides a personalized overview of the student's journey. It includes: recommended opportunities based on profile, recent messages, upcoming mentor sessions, saved items, application deadlines, personalized AI recommendations, scholarship matches, housing suggestions, and quick access to AI tools. The dashboard adapts to the student's preferences and activity.`,
    category: "dashboards",
    subcategory: "student",
    tags: ["student", "dashboard", "home", "overview", "recommendations"],
    metadata: {},
  },
  {
    title: "Mentor Dashboard",
    content: `The Mentor Dashboard shows: upcoming booked sessions, student reach-outs, mentoring analytics, profile views, student review scores, earnings (if applicable), recent forum activity, and quick actions to create opportunities or success stories. Mentors can manage their availability and expertise areas.`,
    category: "dashboards",
    subcategory: "mentor",
    tags: ["mentor", "dashboard", "sessions", "students", "analytics"],
    metadata: {},
  },
  {
    title: "Employer Dashboard",
    content: `The Employer Dashboard provides: active job listings, candidate applications, sponsorship tracking, analytics on job views and applications, company profile management, and quick actions to post new jobs or search for candidates. Employers can track which candidates need visa sponsorship.`,
    category: "dashboards",
    subcategory: "employer",
    tags: ["employer", "dashboard", "jobs", "candidates", "sponsorship", "hiring"],
    metadata: {},
  },
  {
    title: "Admin Dashboard",
    content: `The Admin Dashboard is the main control center for platform administrators. It displays: platform statistics (total users, active listings, reports), system health status (Postgres, Redis, AI service), recent reports requiring attention, new user registrations, verification queue, platform revenue metrics, and quick links to all admin sections: Users, Verifications, Listings, Reports, Audit Log, and AI Configuration.`,
    category: "dashboards",
    subcategory: "admin",
    tags: ["admin", "dashboard", "overview", "stats", "health", "reports"],
    metadata: {},
  },

  // ===================== AI TOOLS =====================
  {
    title: "AI Assistant Overview",
    content: `The AI Assistant is GlobalBridge's intelligent immigration copilot. It can: answer visa and immigration questions, provide document checklists, explain application processes, compare countries, help with scholarship searches, and guide users through studying abroad. The AI is context-aware (knows your role and preferences), uses RAG to retrieve platform knowledge, remembers conversation history, cites official sources, supports all 14 platform languages, and provides personalized recommendations based on user profile and activity.`,
    category: "ai-tools",
    subcategory: "assistant",
    tags: ["ai", "assistant", "chat", "immigration", "visa", "help", "copilot"],
    metadata: {},
  },
  {
    title: "Country Comparison Tool",
    content: `The Country Comparison tool allows users to compare two countries side-by-side across 8 categories: Cost of Living, Visa Requirements, Job Market, Housing, Education, Healthcare, Culture, and Banking. The comparison is AI-generated based on publicly available data. Users can select from 50+ countries. Results include a verdict recommending the better option based on the user's profile. Accessible from the Tools menu or at /tools/country-compare.`,
    category: "ai-tools",
    subcategory: "country-compare",
    tags: ["compare", "countries", "cost of living", "visa", "education", "healthcare"],
    metadata: {},
  },
  {
    title: "Document Checker",
    content: `The Document Checker (Doc Checker) validates application documents before submission. It checks passports, bank statements, transcripts, acceptance letters, study permits, and national IDs. The AI analyzes the document metadata and user notes, then returns a score (0-100), severity findings (ok/warn/fail), and specific recommendations. Available at /tools/doc-checker. Rate limited to 10 requests per minute per IP.`,
    category: "ai-tools",
    subcategory: "doc-checker",
    tags: ["documents", "checker", "validation", "passport", "transcript", "bank statement", "visa"],
    metadata: {},
  },
  {
    title: "Essay Scoring Tool",
    content: `The Essay Scoring tool evaluates application essays against 6 rubric dimensions: hook, arc, evidence, fit, voice, and close. It provides inline feedback with quotes from the essay, a score for each dimension, and overall suggestions for improvement. Useful for scholarship applications, university admissions essays, and visa statements of purpose. Available at /tools/app-coach. Rate limited to 10 requests per minute per IP.`,
    category: "ai-tools",
    subcategory: "essay-scoring",
    tags: ["essay", "scoring", "application", "rubric", "feedback", "writing"],
    metadata: {},
  },
  {
    title: "Scholarship Matcher",
    content: `The Scholarship Matcher helps students find scholarships that match their profile. Users enter their country of origin, intended destination, field of study, degree level, and other preferences. The AI matches them with relevant scholarships from the platform's database and trusted external sources. Available at /tools/scholarship-matcher.`,
    category: "ai-tools",
    subcategory: "scholarship-matcher",
    tags: ["scholarship", "match", "funding", "financial aid", "grants"],
    metadata: {},
  },
  {
    title: "Timeline Planner",
    content: `The Timeline Planner helps students create a step-by-step timeline for their study abroad journey. It covers: application deadlines, visa processing times, housing search timelines, scholarship application dates, pre-departure preparation, and arrival tasks. The timeline is personalized based on the user's destination country, program start date, and origin country. Available at /tools/timeline.`,
    category: "ai-tools",
    subcategory: "timeline-planner",
    tags: ["timeline", "planning", "deadlines", "visa", "application", "preparation"],
    metadata: {},
  },
  {
    title: "Peer Review Tool",
    content: `The Peer Review tool allows students to get feedback on their application materials from other students and mentors. Users can submit essays, personal statements, or applications for peer review. Reviews include constructive feedback, suggestions for improvement, and scoring. Available at /tools/peer-review.`,
    category: "ai-tools",
    subcategory: "peer-review",
    tags: ["peer", "review", "feedback", "essay", "application", "mentor"],
    metadata: {},
  },
  {
    title: "University Success Guides",
    content: `The University Success guides provide comprehensive information about studying at universities worldwide. Each guide covers: admission requirements, tuition fees, cost of living, student life, accommodation options, visa processes, part-time work opportunities, and post-graduation options. Available at /tools/uni-success.`,
    category: "ai-tools",
    subcategory: "uni-success",
    tags: ["university", "success", "guide", "admission", "tuition", "student life"],
    metadata: {},
  },

  // ===================== OPPORTUNITIES =====================
  {
    title: "Opportunities Page",
    content: `The Opportunities page (accessible from the navigation menu) displays scholarships, work-study programs, exchanges, internships, and jobs. Users can filter by type, country, and search by keyword. The page features an interactive 3D globe showing opportunities by country. Each opportunity card shows: title, type, institution, country, deadline, funding amount, visa sponsorship status, and verification status. Verified opportunities have a shield badge. Users can save opportunities to their profile. Data is fetched from the backend API at /api/opportunities with 60-second cache.`,
    category: "opportunities",
    tags: ["opportunities", "scholarships", "internships", "exchanges", "jobs", "funding"],
    metadata: {},
  },
  {
    title: "Opportunity Types",
    content: `GlobalBridge supports five opportunity types:
- Scholarship: Funding for tuition and/or living expenses. Can be fully funded or partially funded.
- Work-Study: Part-time work programs for students, often on campus.
- Exchange: Academic exchange programs between institutions in different countries.
- Internship: Short-term work experience in a professional setting.
- Job: Full-time or part-time employment opportunities, including those with visa sponsorship.
Each opportunity includes: title, description, country, institution, field of study, funding amount, currency, eligibility requirements, application URL, deadline, and visa sponsorship flag.`,
    category: "opportunities",
    tags: ["scholarship", "work-study", "exchange", "internship", "job", "types"],
    metadata: {},
  },
  {
    title: "Saving Opportunities",
    content: `Users can save opportunities by clicking the bookmark icon on any opportunity card. Saved opportunities are stored in the user's profile and can be viewed later. The saved items list is accessible from the user menu. Users can unsave items at any time. The save/unsave state is synced with the backend via the /api/content/saved endpoint.`,
    category: "opportunities",
    tags: ["save", "bookmark", "favorites", "saved items", "opportunities"],
    metadata: {},
  },

  // ===================== JOBS =====================
  {
    title: "Jobs Page",
    content: `The Jobs page (accessible from the navigation menu) displays employment opportunities. Features include: filtering by visa sponsorship, country filtering, search by keyword, salary insights, visa sponsorship tracker, job readiness assessment, and resume builder. Each job card shows: title, company, location, salary range, visa sponsorship status, and application deadline. The Jobs page integrates with the Opportunities system.`,
    category: "jobs",
    tags: ["jobs", "employment", "career", "visa sponsorship", "salary"],
    metadata: {},
  },
  {
    title: "Visa Sponsorship Tracker",
    content: `The Visa Sponsorship Tracker helps users find companies that sponsor work visas. It lists companies that have confirmed visa sponsorship, along with the countries they sponsor for. Users can filter by industry, country, and job type. The tracker is updated regularly with new sponsors. Accessible at /jobs/sponsorship-tracker.`,
    category: "jobs",
    subcategory: "sponsorship",
    tags: ["visa", "sponsorship", "work visa", "companies", "employer"],
    metadata: {},
  },
  {
    title: "Resume Builder",
    content: `The Resume Builder tool helps users create professional resumes tailored for international job applications. It provides templates, section suggestions, and formatting optimized for different countries. Available at /jobs/resume-builder.`,
    category: "jobs",
    subcategory: "resume",
    tags: ["resume", "CV", "builder", "template", "job application"],
    metadata: {},
  },
  {
    title: "Salary Insights",
    content: `The Salary Insights page provides salary data for various positions across different countries. Data includes average salaries by role, industry, and location, cost of living adjustments, and salary negotiation tips. Useful for understanding compensation expectations when applying for jobs abroad. Available at /jobs/salary.`,
    category: "jobs",
    subcategory: "salary",
    tags: ["salary", "compensation", "insights", "average pay", "cost of living"],
    metadata: {},
  },
  {
    title: "Job Readiness Assessment",
    content: `The Job Readiness tool assesses a user's preparedness for the job market. It evaluates: resume quality, interview skills, networking, industry knowledge, and application strategy. Provides personalized recommendations for improvement. Available at /jobs/readiness.`,
    category: "jobs",
    subcategory: "readiness",
    tags: ["readiness", "assessment", "preparedness", "job market", "career"],
    metadata: {},
  },

  // ===================== HOUSING =====================
  {
    title: "Housing Marketplace",
    content: `The Housing Marketplace helps students find accommodation abroad. Listings include: apartments, shared houses, student dormitories, and homestays. Each listing shows: rent amount, currency, bedrooms, bathrooms, furnished status, photos, virtual tour URL, near-university information, landlord rating, and location on map. Listings go through a moderation process before being published. Users can contact landlords through the platform. Available at /housing.`,
    category: "housing",
    tags: ["housing", "accommodation", "rent", "apartment", "dormitory", "homestay"],
    metadata: {},
  },
  {
    title: "Creating a Housing Listing",
    content: `To create a housing listing: go to the Housing page, click 'Add Listing', fill in the property details including title, description, city, country, address, rent amount, currency, bedrooms, bathrooms, and upload photos. Listings start as 'pending_review' status until approved by an admin. Landlords can track the status of their listings from their dashboard.`,
    category: "housing",
    tags: ["create listing", "add listing", "landlord", "property", "rent out"],
    metadata: {},
  },
  {
    title: "Roommate Matching",
    content: `The Roommate Matching feature helps students find compatible roommates. Users can set preferences for: budget range, preferred city, lifestyle (e.g., quiet, social, study-focused), smoking preference, and pets. The system suggests potential roommates based on compatibility. Users can then message each other through the platform.`,
    category: "housing",
    tags: ["roommate", "matching", "compatibility", "share", "budget"],
    metadata: {},
  },

  // ===================== MESSAGING =====================
  {
    title: "Messaging System",
    content: `GlobalBridge has a built-in messaging system for direct communication between users. Features include: one-on-one conversations, real-time message delivery via WebSocket, read receipts, message history, and message flagging for moderation. Users can message mentors, employers, landlords, and other students. Conversations are private between participants. The messaging system uses PostgreSQL for persistence and Redis for real-time broadcast.`,
    category: "messaging",
    tags: ["messages", "chat", "conversations", "direct messages", "communication"],
    metadata: {},
  },
  {
    title: "WebSocket Connectivity",
    content: `Real-time messaging uses WebSocket connections at /ws. After connecting, clients authenticate by sending their Firebase ID token. Once authenticated, they can send and receive messages in real time. The server supports optional Redis pub/sub for multi-instance deployments.`,
    category: "messaging",
    tags: ["websocket", "real-time", "live", "ws", "connectivity"],
    metadata: {},
  },

  // ===================== FORUMS =====================
  {
    title: "Community Forums",
    content: `The Community Forums are a place for users to ask questions, share experiences, and help each other. Features include: categories (e.g., Visas, Housing, Academics, Jobs, Life Abroad), posts with upvotes and replies, verified mentor replies with special badges, accepted answers, tags for filtering, search functionality, and reporting for inappropriate content. Forum posts and replies are moderated. Available at /forums.`,
    category: "forums",
    tags: ["forum", "community", "questions", "answers", "discussion", "help"],
    metadata: {},
  },
  {
    title: "Creating Forum Posts",
    content: `To create a forum post: select a category, write a descriptive title, and add your question or content in the body. You can add tags to help others find your post. Posts can be upvoted by the community. If a verified mentor replies, their response is marked with a special badge. The post author can mark a reply as the accepted answer.`,
    category: "forums",
    tags: ["create post", "ask question", "forum post", "discussion"],
    metadata: {},
  },

  // ===================== SUCCESS STORIES =====================
  {
    title: "Success Stories",
    content: `Success Stories showcase real journeys of students who have successfully studied or immigrated abroad. Each story includes: the student's name, origin country, destination country, program they completed, outcome, a personal quote, detailed body text, and before/after descriptions. Stories can be filtered by origin, destination, and program type. Users can submit their own success stories to inspire others. Available at /stories.`,
    category: "success-stories",
    tags: ["stories", "success", "testimonials", "experiences", "journeys"],
    metadata: {},
  },

  // ===================== COMMUNITY =====================
  {
    title: "Country Communities",
    content: `Country-specific communities allow users to connect with others going to or living in the same country. Each community has: country-specific discussions, local tips and advice, housing and job recommendations, cultural adjustment support, and networking opportunities. Available at /community/[country].`,
    category: "community",
    tags: ["community", "country", "network", "local", "culture"],
    metadata: {},
  },
  {
    title: "Mentor Profiles",
    content: `Verified mentors have detailed profiles showing: their expertise areas, countries they've lived in, languages spoken, universities attended, years of international experience, availability for mentoring, student reviews, and a booking system. Students can search for mentors by expertise, country, or language. Mentor profiles are accessible at /community/mentors/[id].`,
    category: "community",
    tags: ["mentor", "profile", "expertise", "booking", "guidance"],
    metadata: {},
  },
  {
    title: "Safe Space",
    content: `The Safe Space is a moderated, supportive environment for users to discuss sensitive topics related to immigration, mental health, cultural adjustment, and personal challenges. All posts are strictly moderated. Crisis resources are prominently featured. Available at /community/safe-space.`,
    category: "community",
    tags: ["safe space", "mental health", "support", "crisis", "wellbeing"],
    metadata: {},
  },

  // ===================== SCAM ALERTS =====================
  {
    title: "Scam Alerts and Reporting",
    content: `GlobalBridge has a scam alert system to protect the community. Users can: report suspicious activity (scams, fraud, phishing), view active scam alerts, upvote alerts to increase visibility, and access resources on how to avoid common immigration scams. Reports are reviewed by moderators. Verified scam alerts are marked by admin. Available at /scam-alerts and /scam-alerts/report.`,
    category: "trust-safety",
    tags: ["scam", "alert", "report", "fraud", "safety", "phishing"],
    metadata: {},
  },

  // ===================== TOOLKIT =====================
  {
    title: "Life Toolkit",
    content: `The Life Toolkit is a comprehensive collection of resources for life abroad. It covers: banking (opening accounts, international transfers), cost of living (budgeting, expenses), student discounts (transport, software, entertainment), fund transfer (sending money home), healthcare (insurance, doctors, emergencies), SIM cards and connectivity, emergency SOS (crisis numbers, embassy contacts), tax guides (filing abroad), public transit (getting around), and more. Each tool provides country-specific information. Accessible from the navigation menu.`,
    category: "toolkit",
    tags: ["toolkit", "life", "banking", "healthcare", "tax", "transit", "SOS", "discounts"],
    metadata: {},
  },
  {
    title: "Emergency Resources (SOS)",
    content: `The SOS page provides emergency contact information for international students, including: local emergency numbers (police, ambulance, fire), embassy and consulate contacts, crisis hotlines, mental health support lines, and 24/7 assistance resources. Information is organized by country. Available at /toolkit/sos.`,
    category: "toolkit",
    subcategory: "emergency",
    tags: ["emergency", "SOS", "crisis", "embassy", "helpline", "police", "ambulance"],
    metadata: {},
  },
  {
    title: "Healthcare Guide",
    content: `The Healthcare guide provides information about: health insurance requirements for international students, how to register with a doctor/dentist, accessing medical care, mental health services, vaccination requirements, and health insurance providers. Information varies by country. Available at /toolkit/healthcare.`,
    category: "toolkit",
    subcategory: "healthcare",
    tags: ["healthcare", "insurance", "doctor", "hospital", "mental health", "vaccination"],
    metadata: {},
  },

  // ===================== NOTIFICATIONS =====================
  {
    title: "Notifications System",
    content: `The Notifications system keeps users informed about important activities. Types of notifications include: new messages, mentor session reminders, opportunity deadline reminders, application updates, verification status changes, forum replies, new scam alerts, and system announcements. Notifications are accessible from the bell icon in the navigation or at /notifications. Users can mark notifications as read individually or in bulk.`,
    category: "notifications",
    tags: ["notifications", "alerts", "reminders", "bell", "updates"],
    metadata: {},
  },

  // ===================== SETTINGS =====================
  {
    title: "Account Settings",
    content: `The Settings page allows users to manage their account. Sections include: Profile (edit name, bio, avatar, contact info), Security (change password, two-factor authentication), Preferences (language, theme, notification preferences), Privacy (who can contact you, profile visibility), and Account (delete account, download data). Available at /settings.`,
    category: "settings",
    tags: ["settings", "preferences", "profile", "security", "privacy", "account"],
    metadata: {},
  },

  // ===================== VISA ASSISTANCE =====================
  {
    title: "Visa Assistant",
    content: `The Visa Assistant helps users navigate visa applications for their destination country. It provides: country-specific visa requirements, document checklists, application step-by-step guides, processing times, fee information, biometrics instructions, and links to official government resources. The assistant covers student visas, work permits, permanent residence, exchange visas, and tourist visas for major destinations including Canada, UK, USA, Germany, Australia, France, Ireland, Netherlands, Sweden, and more.`,
    category: "visa",
    tags: ["visa", "immigration", "study permit", "work permit", "application", "requirements"],
    metadata: {},
  },
  {
    title: "Document Checklists",
    content: `The AI Assistant can generate personalized document checklists based on the user's origin country, destination country, and visa type. The checklist covers: Identity documents (passport, photos, national ID), Academic documents (acceptance letter, transcripts, degree certificates, English proficiency test), Financial documents (bank statements, proof of funds, scholarship letter, sponsor affidavit), Application documents (visa application form, fee receipt, biometrics receipt, statement of purpose), and Health & Travel documents (medical exam, police clearance, travel insurance). Country-specific items are added based on the destination.`,
    category: "visa",
    tags: ["checklist", "documents", "visa application", "requirements", "checklist"],
    metadata: {},
  },

  // ===================== ADMIN CONSOLE =====================
  {
    title: "Admin Console - Users Management",
    content: `The Admin Users page allows administrators to: view all users with search and filter, view user details and activity, update user roles, suspend or ban users, verify user accounts, view user reports, and manage mentor and employer profiles. Available at /admin/users.`,
    category: "admin",
    subcategory: "users",
    tags: ["admin", "users", "management", "moderation", "roles"],
    metadata: {},
  },
  {
    title: "Admin Console - Verifications",
    content: `The Admin Verifications page manages identity verification requests. Admins can: view pending verification requests, review submitted documents, approve or reject verification requests, and track verification history. Verification is required for mentors and recommended for all users. Available at /admin/verifications.`,
    category: "admin",
    subcategory: "verifications",
    tags: ["admin", "verification", "identity", "approve", "reject"],
    metadata: {},
  },
  {
    title: "Admin Console - Listings Moderation",
    content: `The Admin Listings page moderates housing and opportunity listings. Admins can: view pending listings, approve or reject listings, edit listing details, flag inappropriate content, and manage listing statuses (draft, pending_review, active, rented, archived). Available at /admin/listings.`,
    category: "admin",
    subcategory: "listings",
    tags: ["admin", "listings", "moderation", "housing", "opportunities", "approve"],
    metadata: {},
  },
  {
    title: "Admin Console - Reports Management",
    content: `The Admin Reports page handles user reports. Admins can: view all reports sorted by status (pending, reviewing, resolved, dismissed), review reported content, take action on reports (warn users, remove content, ban users), and track resolution history. Available at /admin/reports.`,
    category: "admin",
    subcategory: "reports",
    tags: ["admin", "reports", "moderation", "user reports", "content moderation"],
    metadata: {},
  },
  {
    title: "Admin Console - Audit Log",
    content: `The Admin Audit Log records all privileged admin actions for accountability. Each entry includes: admin name, action performed, target type and ID, metadata, and timestamp. Actions are immutable. The log is cursor-paginated and searchable. Available at /admin/audit.`,
    category: "admin",
    subcategory: "audit",
    tags: ["admin", "audit", "log", "accountability", "history"],
    metadata: {},
  },
  {
    title: "Admin Console - AI Configuration",
    content: `The Admin AI Configuration page allows administrators to manage the AI assistant. Settings include: Model selection (GPT-4o, GPT-4o-mini), temperature control (0-1), escalate-to-human confidence threshold, system prompt editing, feature flags (chat, doc check, scam detection, translation), knowledge base management, trusted source management, and AI analytics (conversations per day, response time, positive rate, escalation rate). Available at /admin/ai.`,
    category: "admin",
    subcategory: "ai",
    tags: ["admin", "ai", "configuration", "model", "settings", "analytics"],
    metadata: {},
  },

  // ===================== API ENDPOINTS =====================
  {
    title: "Backend API Overview",
    content: `GlobalBridge's backend API runs on Express at port 4000 (configurable). All domain routes are prefixed with /api/. Authentication uses Firebase ID tokens in the Authorization header. The API includes: /api/auth (registration, profile), /api/users (users, dashboards, mentors), /api/opportunities (CRUD), /api/jobs (CRUD, sponsors), /api/housing (CRUD, moderation), /api/forums (categories, posts, replies), /api/messages (conversations, send), /api/ai (chat proxy, checklists, doc-check), /api/knowledge (knowledge base CRUD), /api/rag (vector search, embeddings), /api/content (stories, saved, notifications, bookings), /api/moderation (reports, scam alerts), /api/uploads (file storage), /api/admin (health, audit). WebSocket at /ws for real-time messaging.`,
    category: "api",
    tags: ["api", "backend", "endpoints", "routes", "express", "rest"],
    metadata: {},
  },

  // ===================== SUPPORT & HELP =====================
  {
    title: "Getting Help",
    content: `Users can get help through: AI Assistant (ask questions in natural language), Community Forums (post questions for the community), Mentors (book one-on-one sessions), Help Center (/help with FAQs and guides), Contact page (/contact for direct support), and the Toolkit (/toolkit with life abroad resources). For emergencies, use the SOS page (/toolkit/sos) which has country-specific emergency numbers.`,
    category: "support",
    tags: ["help", "support", "contact", "FAQ", "guide", "assistance"],
    metadata: {},
  },
  {
    title: "Reporting Issues",
    content: `To report a problem: content violations can be reported through the report button on posts/listings, scam alerts can be reported at /scam-alerts/report, technical issues can be reported through the Help Center or Contact page, and urgent safety concerns should use the SOS page or local emergency services.`,
    category: "support",
    tags: ["report", "issue", "bug", "problem", "scam", "violation"],
    metadata: {},
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log(`Seeding ${entries.length} knowledge entries...`);

    for (const entry of entries) {
      await client.query(
        `INSERT INTO knowledge_base (title, content, category, subcategory, tags, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (title) DO UPDATE SET updated_at = NOW()`,
        [
          entry.title,
          entry.content,
          entry.category,
          entry.subcategory ?? null,
          entry.tags,
          JSON.stringify(entry.metadata),
        ],
      );
      console.log(`  ✓ ${entry.title}`);
    }

    console.log(`\nDone. ${entries.length} entries inserted.`);
    console.log('Run the re-embed endpoint to generate vector embeddings:');
    console.log('  POST /api/rag/reembed-all (requires admin auth + OPENAI_API_KEY)');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
