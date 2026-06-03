#!/usr/bin/env python3
"""Generate the GlobalBridge final-year project report (Chapters 1-3) as a PDF.

Content is grounded in the actual GlobalBridge codebase:
  frontend/ (Next.js 15 + React 19 + Tailwind v4, Firebase Auth)
  backend/  (Node/Express + WebSocket, Firebase Admin, PostgreSQL, Redis)
  ai/       (Python/FastAPI + Anthropic Claude + Google Translate)
  db/       (PostgreSQL schema)
Deployment: Vercel (frontend), Render (backend), Neon (Postgres).
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    ListFlowable, ListItem, KeepTogether,
)
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Circle, Ellipse
import html

NAVY = colors.HexColor("#0A2540")
EMERALD = colors.HexColor("#0E9F6E")
LIGHT = colors.HexColor("#F1F5F9")
GREY = colors.HexColor("#475569")
BORDER = colors.HexColor("#CBD5E1")

# ---------------------------------------------------------------- styles
styles = getSampleStyleSheet()


def S(name, **kw):
    styles.add(ParagraphStyle(name, parent=styles["Normal"], **kw))


S("Body", fontName="Helvetica", fontSize=10.5, leading=15.5, alignment=TA_JUSTIFY, spaceAfter=8)
S("H1", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY, spaceBefore=6, spaceAfter=12)
S("H2", fontName="Helvetica-Bold", fontSize=13.5, leading=18, textColor=NAVY, spaceBefore=12, spaceAfter=6)
S("H3", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=EMERALD, spaceBefore=8, spaceAfter=4)
S("BodyBullet", fontName="Helvetica", fontSize=10.5, leading=15, alignment=TA_LEFT, spaceAfter=3)
S("Caption", fontName="Helvetica-Oblique", fontSize=9, leading=12, textColor=GREY, alignment=TA_CENTER, spaceBefore=4, spaceAfter=10)
S("TitleBig", fontName="Helvetica-Bold", fontSize=26, leading=32, textColor=NAVY, alignment=TA_CENTER)
S("TitleSub", fontName="Helvetica", fontSize=13, leading=18, textColor=GREY, alignment=TA_CENTER)
S("TOC", fontName="Helvetica", fontSize=10.5, leading=17, alignment=TA_LEFT)
S("TableCell", fontName="Helvetica", fontSize=9, leading=12)
S("TableHead", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=colors.white)


def esc(t):
    return html.escape(str(t))


def P(t, style="Body"):
    return Paragraph(t, styles[style])


def H1(t):
    return Paragraph(esc(t), styles["H1"])


def H2(t):
    return Paragraph(esc(t), styles["H2"])


def H3(t):
    return Paragraph(esc(t), styles["H3"])


def bullets(items, style="BodyBullet"):
    return ListFlowable(
        [ListItem(Paragraph(it, styles[style]), leftIndent=10, value="•") for it in items],
        bulletType="bullet", start="•", leftIndent=14,
    )


def numbered(items, style="BodyBullet"):
    return ListFlowable(
        [ListItem(Paragraph(it, styles[style]), leftIndent=10) for it in items],
        bulletType="1", leftIndent=18,
    )


def table(data, col_widths, header=True):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    cmds = [
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    t.setStyle(TableStyle(cmds))
    return t


def cellpars(rows, header):
    out = [[Paragraph(esc(c), styles["TableHead"]) for c in header]]
    for r in rows:
        out.append([Paragraph(esc(c), styles["TableCell"]) for c in r])
    return out


# ---------------------------------------------------------------- diagrams
def box(d, x, y, w, h, text, fill=colors.white, stroke=NAVY, tcolor=NAVY, fs=8.5, bold=True):
    d.add(Rect(x, y, w, h, fillColor=fill, strokeColor=stroke, strokeWidth=1, rx=4, ry=4))
    font = "Helvetica-Bold" if bold else "Helvetica"
    lines = text.split("\n")
    total = len(lines) * (fs + 2)
    sy = y + h / 2 + total / 2 - fs
    for i, ln in enumerate(lines):
        d.add(String(x + w / 2, sy - i * (fs + 2), ln, textAnchor="middle", fontName=font, fontSize=fs, fillColor=tcolor))


def arrow(d, x1, y1, x2, y2, color=GREY):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1))
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    s = 5
    d.add(Polygon([x2, y2,
                   x2 - s * math.cos(ang - 0.4), y2 - s * math.sin(ang - 0.4),
                   x2 - s * math.cos(ang + 0.4), y2 - s * math.sin(ang + 0.4)],
                  fillColor=color, strokeColor=color))


def architecture_diagram():
    d = Drawing(460, 330)
    # client
    box(d, 160, 290, 140, 30, "Web Browser (Client)", fill=LIGHT)
    # frontend
    box(d, 130, 235, 200, 34, "Presentation Tier\nNext.js 15 / React 19  -  Vercel", fill=colors.HexColor("#E6F4EA"), stroke=EMERALD, tcolor=NAVY)
    # backend + ai
    box(d, 40, 165, 180, 40, "Application Tier\nExpress REST API + WebSocket\n(Render)", fill=colors.HexColor("#E8EEF6"))
    box(d, 250, 165, 170, 40, "AI Microservice\nFastAPI + Anthropic Claude\n(Render)")
    # data
    box(d, 40, 90, 110, 34, "PostgreSQL\n(Neon)", fill=colors.HexColor("#FDF2E9"))
    box(d, 165, 90, 90, 34, "Redis\n(Upstash)", fill=colors.HexColor("#FDF2E9"))
    # external
    box(d, 270, 90, 150, 34, "External Services\nFirebase Auth, Google Translate")
    # arrows
    arrow(d, 230, 290, 230, 270)
    arrow(d, 230, 235, 150, 206)
    arrow(d, 230, 235, 320, 206)
    arrow(d, 130, 165, 95, 125)
    arrow(d, 150, 165, 205, 125)
    arrow(d, 200, 165, 330, 125)
    arrow(d, 335, 165, 345, 125)
    d.add(String(230, 6, "Figure 2.1  -  Three-tier architecture with an AI microservice",
                 textAnchor="middle", fontName="Helvetica-Oblique", fontSize=8, fillColor=GREY))
    return d


def usecase_diagram():
    d = Drawing(460, 360)
    # system boundary
    d.add(Rect(150, 20, 200, 320, fillColor=None, strokeColor=NAVY, strokeWidth=1, rx=8, ry=8))
    d.add(String(250, 325, "GlobalBridge System", textAnchor="middle", fontName="Helvetica-Bold", fontSize=9, fillColor=NAVY))
    use_cases = ["Register / Authenticate", "Get AI visa guidance", "Search opportunities",
                 "Browse / list housing", "Book a mentor", "Post / apply to jobs",
                 "Participate in community", "Moderate & verify"]
    for i, uc in enumerate(use_cases):
        cy = 300 - i * 36
        d.add(Ellipse(250, cy, 88, 15, fillColor=LIGHT, strokeColor=EMERALD, strokeWidth=0.8))
        d.add(String(250, cy - 3, uc, textAnchor="middle", fontName="Helvetica", fontSize=7.5, fillColor=NAVY))

    def actor(x, y, label):
        d.add(Circle(x, y + 22, 6, fillColor=colors.white, strokeColor=NAVY))
        d.add(Line(x, y + 16, x, y + 2, strokeColor=NAVY))
        d.add(Line(x - 8, y + 12, x + 8, y + 12, strokeColor=NAVY))
        d.add(Line(x, y + 2, x - 7, y - 8, strokeColor=NAVY))
        d.add(Line(x, y + 2, x + 7, y - 8, strokeColor=NAVY))
        d.add(String(x, y - 18, label, textAnchor="middle", fontName="Helvetica-Bold", fontSize=7.5, fillColor=NAVY))

    actor(40, 250, "Student")
    actor(40, 160, "Mentor")
    actor(40, 70, "Employer")
    actor(420, 250, "Admin")
    actor(420, 90, "AI Engine")
    for y in (256, 166, 76):
        d.add(Line(58, y, 160, 200, strokeColor=BORDER, strokeWidth=0.6))
    d.add(Line(402, 256, 340, 200, strokeColor=BORDER, strokeWidth=0.6))
    d.add(Line(402, 96, 340, 140, strokeColor=BORDER, strokeWidth=0.6))
    return d


def er_diagram():
    d = Drawing(460, 300)
    box(d, 180, 250, 100, 34, "USERS\n(id, role, email)", fill=colors.HexColor("#E6F4EA"), stroke=EMERALD)
    box(d, 30, 175, 110, 30, "OPPORTUNITIES", fill=LIGHT)
    box(d, 175, 175, 110, 30, "MENTOR_BOOKINGS", fill=LIGHT)
    box(d, 320, 175, 110, 30, "HOUSING_LISTINGS", fill=LIGHT)
    box(d, 30, 105, 110, 30, "SAVED_ITEMS", fill=LIGHT)
    box(d, 175, 105, 110, 30, "VISA_CHECKLISTS", fill=LIGHT)
    box(d, 320, 105, 110, 30, "FORUM_POSTS", fill=LIGHT)
    box(d, 100, 40, 110, 30, "MESSAGES", fill=LIGHT)
    box(d, 260, 40, 110, 30, "SUCCESS_STORIES", fill=LIGHT)
    links = [(200, 250, 90, 205), (215, 250, 215, 205), (255, 250, 360, 205),
             (200, 250, 95, 135), (220, 250, 220, 135), (250, 250, 360, 135),
             (210, 250, 150, 70), (250, 250, 300, 70)]
    for x1, y1, x2, y2 in links:
        d.add(Line(x1, y1, x2, y2, strokeColor=BORDER, strokeWidth=0.7))
    d.add(String(230, 6, "Figure 3.4  -  Simplified entity-relationship overview (core entities)",
                 textAnchor="middle", fontName="Helvetica-Oblique", fontSize=8, fillColor=GREY))
    return d


def sequence_diagram():
    d = Drawing(460, 300)
    actors = [("Student", 60), ("Next.js\nFrontend", 175), ("Express\nAPI", 290), ("Firebase\n+ Postgres", 405)]
    for name, x in actors:
        box(d, x - 45, 268, 90, 26, name, fill=LIGHT, fs=8)
        d.add(Line(x, 268, x, 40, strokeColor=BORDER, strokeWidth=0.8, strokeDashArray=[2, 2]))
    steps = [
        (60, 175, "1. Submit sign-up form", 250),
        (175, 405, "2. createUser + getIdToken", 220),
        (175, 290, "3. POST /register-profile (Bearer)", 190),
        (290, 405, "4. verifyIdToken + upsert user", 160),
        (405, 290, "5. user row + role claim", 130),
        (290, 175, "6. 201 Created", 100),
        (175, 60, "7. Redirect to role dashboard", 70),
    ]
    for x1, x2, label, y in steps:
        arrow(d, x1, y, x2, y, color=GREY)
        midx = (x1 + x2) / 2
        d.add(String(midx, y + 3, label, textAnchor="middle", fontName="Helvetica", fontSize=7, fillColor=NAVY))
    d.add(String(230, 6, "Figure 3.3  -  Sequence diagram: student registration and authentication",
                 textAnchor="middle", fontName="Helvetica-Oblique", fontSize=8, fillColor=GREY))
    return d


# ---------------------------------------------------------------- page chrome
def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GREY)
    canvas.drawString(20 * mm, 12 * mm, "GlobalBridge  -  Final Year Project Report")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, "Page %d" % doc.page)
    canvas.setStrokeColor(BORDER)
    canvas.line(20 * mm, 15 * mm, A4[0] - 20 * mm, 15 * mm)
    canvas.restoreState()


# ---------------------------------------------------------------- build story
story = []


def caption(t):
    story.append(Paragraph(esc(t), styles["Caption"]))


# ===== Title page
story += [
    Spacer(1, 60),
    Paragraph("GlobalBridge", styles["TitleBig"]),
    Spacer(1, 10),
    Paragraph("An Integrated, AI-Assisted Web Platform for International Student and Immigrant Support", styles["TitleSub"]),
    Spacer(1, 40),
    Paragraph("Final Year Project Report", styles["TitleSub"]),
    Paragraph("Chapters 1 - 3", styles["TitleSub"]),
    Spacer(1, 50),
]
team = table(cellpars([
    ["Eric Asante", "3376122", "Backend, Database & Deployment"],
    ["Baddoo Jeremiah Nii Adotei", "3381622", "Frontend & UI/UX Design"],
], ["Name", "Index Number", "Responsibility"]), [150, 90, 180])
story += [team, Spacer(1, 30),
          Paragraph("Group 8  -  Academic Year 2025/2026", styles["TitleSub"]),
          PageBreak()]

# ===== Table of contents (manual)
story += [H1("Table of Contents")]
toc_rows = [
    "Chapter 1: Introduction",
    "   1.1 Problem Statement", "   1.2 Aim of the Project", "   1.3 Specific Objectives",
    "   1.4 Justification", "   1.5 Motivation", "   1.6 Scope", "   1.7 Project Limitations",
    "   1.8 Beneficiaries", "   1.9 Academic and Practical Relevance",
    "   1.10 Activity Planning and Schedule", "   1.11 Structure of Report", "   1.12 Project Deliverables",
    "Chapter 2: Review of Related Works",
    "   2.1 Existing Systems (Features, Pros and Cons)", "   2.2 The Proposed System",
    "   2.3 Conceptual Design", "   2.4 Architecture of the Proposed System",
    "   2.5 Component Designs and Descriptions", "   2.6 Proposed System Features",
    "   2.7 Development Tools and Environment", "   2.8 Benefits of the Proposed System",
    "Chapter 3: Methodology",
    "   3.1 Chapter Overview", "   3.2 Requirement Specification", "   3.3 Stakeholders",
    "   3.4 Requirement Gathering Process", "   3.5 Functional Requirements", "   3.6 UML Diagrams",
    "   3.7 Non-Functional Requirements", "   3.8 Security Concepts", "   3.9 Project Methods",
    "   3.10 Software Process Models", "   3.11 Chosen Model and Justification",
    "   3.12 Design Considerations (UI & Database)", "   3.13 Development Tools",
    "References",
]
for r in toc_rows:
    story.append(Paragraph(esc(r), styles["TOC"]))
story.append(PageBreak())

# ============================================================ CHAPTER 1
story += [H1("Chapter 1: Introduction")]

story += [H2("1.1 Problem Statement"), P(
    "Every year millions of students and professionals relocate across borders to study, work, or settle. "
    "Yet the information and services they depend on remain fragmented, unreliable, and often predatory. "
    "Prospective migrants must navigate constantly changing visa rules scattered across government portals, "
    "locate trustworthy accommodation from afar while exposed to rental scams, find mentors and employers who "
    "understand visa sponsorship, and overcome language and cultural barriers, all while managing day-to-day "
    "logistics such as banking, healthcare and transport in an unfamiliar country. "
    "Existing solutions are siloed: official immigration websites are authoritative but hard to interpret, "
    "social-media groups are informal and unverified, and paid agents are expensive and inconsistent. "
    "There is no single trustworthy platform that unifies visa guidance, verified housing, mentorship, "
    "opportunities and practical settlement support for international students and immigrants.")]

story += [H2("1.2 Aim of the Project"), P(
    "The aim of this project is to design and implement <b>GlobalBridge</b>, an integrated, secure and "
    "AI-assisted web platform that consolidates visa guidance, a verified housing marketplace, mentorship, "
    "scholarship and job opportunities, community support and a life-support toolkit into a single, "
    "role-aware experience for international students, immigrants, mentors and employers.")]

story += [H2("1.3 Specific Objectives of the Project"), P("The specific objectives are:"), numbered([
    "To develop a role-based authentication system supporting students, mentors, employers and administrators using Firebase Authentication with custom role claims.",
    "To implement an AI-powered visa assistant that provides contextual guidance, generates document checklists and performs document checks using a large language model.",
    "To build a verified opportunities board (scholarships, internships, work-study and jobs) with visa-sponsorship awareness.",
    "To provide a housing marketplace with listing management and safeguards against fraudulent listings.",
    "To enable structured mentorship through mentor profiles, availability and session bookings.",
    "To create community features (forums, success stories and real-time messaging) that reduce isolation.",
    "To deliver an administrative control centre for verification, moderation, content management and platform analytics.",
    "To deploy the system on managed cloud infrastructure and evaluate it against functional and non-functional requirements.",
])]

story += [H2("1.4 Justification of Project"), P(
    "A unified platform is justified because the cost of fragmentation falls hardest on a vulnerable population. "
    "Rental and admission scams cause real financial loss; misinterpreted visa rules lead to rejected applications; "
    "and isolation harms wellbeing and retention. By consolidating verified information and trustworthy services, "
    "GlobalBridge reduces risk, lowers reliance on costly intermediaries, and shortens the time it takes a newcomer "
    "to become settled and productive. The use of AI further democratises access to guidance that would otherwise "
    "require expensive professional consultation.")]

story += [H2("1.5 Motivation for Undertaking the Project"), P(
    "The project is motivated by the team's first-hand exposure to the difficulties faced by international students, "
    "and by the observation that modern web and AI technologies are now mature enough to deliver, at low cost, the kind "
    "of personalised guidance that was previously unavailable. The opportunity to apply full-stack engineering, cloud "
    "deployment and applied AI to a problem with clear social value provided strong motivation to undertake the project.")]

story += [H2("1.6 Scope of Project"), P(
    "GlobalBridge is a responsive web application comprising a Next.js frontend, an Express REST and WebSocket API, "
    "a FastAPI AI microservice and a PostgreSQL database. Within scope are: account management and role-based access; "
    "the AI visa assistant, checklist generator and document checker; the opportunities, housing, mentorship, jobs and "
    "community modules; the life-support toolkit; and the administrative dashboard. "
    "Out of scope are native mobile applications, real payment settlement, and automated submission of applications to "
    "third-party immigration authorities; these are identified as future work.")]

story += [H2("1.7 Project Limitations"), bullets([
    "The AI assistant provides guidance for informational purposes and is not a substitute for licensed legal advice.",
    "Free-tier cloud hosting introduces cold-start latency on the backend after periods of inactivity.",
    "Payment and document storage are abstracted but not connected to live commercial providers in this version.",
    "Listing verification combines automated checks with manual review and therefore depends on administrator availability.",
    "External data (visa rules, exchange rates) reflects the state captured at the time of use and may change.",
])]

story += [H2("1.8 Beneficiaries of the Project"), bullets([
    "<b>International students and immigrants</b> - the primary users, who gain consolidated, trustworthy guidance and services.",
    "<b>Mentors</b> - experienced migrants and professionals who guide newcomers and build community impact.",
    "<b>Employers</b> - organisations seeking international talent and offering visa sponsorship.",
    "<b>Educational institutions and support offices</b> - which can direct students to a reliable resource.",
    "<b>Administrators and moderators</b> - who maintain platform integrity and safety.",
])]

story += [H2("1.9 Academic and Practical Relevance of the Project"), P(
    "<b>Academically</b>, the project demonstrates the application of software-engineering principles - requirements "
    "engineering, architectural design, UML modelling, agile delivery and testing - to a non-trivial, multi-service "
    "system, and the integration of large-language-model technology into a production web application. "
    "<b>Practically</b>, it produces a deployable product that addresses a genuine social need, exercising modern "
    "industry tools (Next.js, Express, FastAPI, PostgreSQL, Firebase) and cloud platforms (Vercel, Render, Neon).")]

story += [H2("1.10 Project Activity Planning and Schedules"), P(
    "The project followed an iterative, agile schedule across the academic year. The major activities and their "
    "indicative timeline are summarised below.")]
story += [table(cellpars([
    ["1", "Problem definition & requirements gathering", "Weeks 1-3"],
    ["2", "System & database design (UML, ER, wireframes)", "Weeks 3-5"],
    ["3", "Authentication & role-based access control", "Weeks 5-7"],
    ["4", "AI service (visa assistant, checklist, doc-check)", "Weeks 7-9"],
    ["5", "Core modules (opportunities, housing, mentorship, jobs)", "Weeks 9-13"],
    ["6", "Community, messaging & toolkit", "Weeks 13-15"],
    ["7", "Admin dashboard, moderation & analytics", "Weeks 15-17"],
    ["8", "Testing, deployment & documentation", "Weeks 17-20"],
], ["#", "Activity", "Timeline"]), [25, 290, 95])]
caption("Table 1.1 - Project activity plan and schedule")

story += [H2("1.11 Structure of Report"), P(
    "<b>Chapter 1</b> introduces the problem, aim, objectives and scope. "
    "<b>Chapter 2</b> reviews existing systems, presents the proposed system, its conceptual and architectural design, "
    "components, features and tooling. "
    "<b>Chapter 3</b> details the methodology: requirements, stakeholders, UML models, non-functional and security "
    "requirements, the chosen process model and the logical (UI and database) design.")]

story += [H2("1.12 Project Deliverables"), bullets([
    "A deployed, responsive web application with role-based dashboards for students, mentors, employers and administrators.",
    "An Express REST + WebSocket API and a FastAPI AI microservice.",
    "A normalised PostgreSQL database with schema and seed data.",
    "An AI visa assistant, checklist generator, document checker and translation service.",
    "Project documentation including requirements, UML models, design artefacts and a user/setup guide.",
    "Automated tests and continuous deployment to Vercel and Render.",
])]
story.append(PageBreak())

# ============================================================ CHAPTER 2
story += [H1("Chapter 2: Review of Related Works")]

story += [H2("2.1 Processes of the Existing Systems"), P(
    "Newcomers currently assemble support from several disconnected sources. Each addresses one slice of the problem "
    "and exhibits characteristic strengths and weaknesses, summarised below.")]
story += [table(cellpars([
    ["Government immigration portals", "Authoritative, official, free", "Hard to interpret; no personalisation; no housing/mentorship"],
    ["University international offices", "Trusted; institution-specific help", "Limited hours; scope confined to enrolled students"],
    ["Social media groups (Facebook/WhatsApp)", "Active, community-driven, free", "Unverified, scam-prone, unstructured, no privacy controls"],
    ["Immigration agents/consultants", "Personalised expert help", "Expensive; inconsistent quality; not scalable"],
    ["Generic housing sites (e.g. classifieds)", "Large inventory", "No newcomer focus; high fraud risk; no verification"],
    ["Generic job boards", "Wide reach", "No visa-sponsorship filter; not tailored to migrants"],
], ["Existing System", "Pros", "Cons"]), [120, 130, 160])]
caption("Table 2.1 - Comparison of existing related systems")

story += [H2("2.2 The Proposed System"), P(
    "The proposed system, GlobalBridge, unifies these fragmented services into a single, trustworthy, role-aware web "
    "platform. It augments human and community support with an AI visa assistant, enforces verification and moderation "
    "to combat fraud, and presents each user with a dashboard tailored to their role. The platform is built as a set of "
    "loosely-coupled modules sharing one identity and data layer, allowing each capability to evolve independently while "
    "delivering a coherent experience.")]

story += [H2("2.3 Conceptual Design"), P(
    "Conceptually, GlobalBridge is organised around four actors (student, mentor, employer, administrator) interacting "
    "with eight functional domains: identity, AI guidance, opportunities, housing, mentorship, jobs, community and "
    "administration. A single sign-on identity (Firebase) issues a verifiable token carrying a role claim; this claim "
    "drives both client-side navigation and server-side authorisation, ensuring each actor sees and can act only on the "
    "capabilities relevant to them. All modules read from and write to a shared relational store, with an AI microservice "
    "providing language intelligence on demand.")]

story += [H2("2.4 Architecture of the Proposed System"), P(
    "GlobalBridge adopts a three-tier architecture augmented by a dedicated AI microservice. The presentation tier is a "
    "server-rendered Next.js application [4]; the application tier is an Express REST and WebSocket API [8], [17]; the data tier is a "
    "managed PostgreSQL database [14] with an optional Redis cache [15]. Language intelligence is isolated in a FastAPI "
    "microservice [10] so that AI workloads scale and fail independently of the core API.")]
story += [architecture_diagram()]

story += [H2("2.5 Components Designs and Component Descriptions"), P(
    "The system is composed of the following principal components. Each exposes a well-defined interface and can be "
    "understood and tested independently.")]

story += [H3("Authentication & Authorisation Component"), P(
    "Handles registration, sign-in and session continuity. The frontend uses the Firebase client SDK [12] to create accounts "
    "and obtain a short-lived ID token; the backend verifies this token with the Firebase Admin SDK, resolves the user to "
    "a PostgreSQL record and attaches a role claim. A guard mechanism on the client routes each role to its dashboard and "
    "blocks cross-role access, while every API route re-verifies the token and role on the server. This dual enforcement "
    "ensures that navigation convenience never weakens real security.")]

story += [H3("AI Guidance Component"), P(
    "A FastAPI microservice exposes endpoints for conversational visa guidance, checklist generation, document checking "
    "and translation. It composes a structured prompt from the user's origin and destination countries and visa type, "
    "sends it to the Anthropic Claude model [11] with prompt caching to control cost, and returns a structured reply with "
    "source hints. The checklist generator derives an ordered list of required documents, and the document checker "
    "evaluates submitted text against expected criteria. Translation is delegated to the Google Translate API [13].")]

story += [H3("Opportunities & Jobs Component"), P(
    "Manages scholarships, internships, work-study placements and jobs as records of a single 'opportunities' entity "
    "typed by category. Employers post roles, optionally flagged as visa-sponsoring; students search, filter and save "
    "opportunities. View counts and saved-item signals feed analytics and recommendations.")]

story += [H3("Housing Component"), P(
    "Provides creation, browsing and detail views of accommodation listings, including roommate preferences. Listings carry "
    "a status (draft, pending review, active, rented, archived) so that administrators can verify them before they go live, "
    "directly mitigating the rental-scam risk identified in Chapter 1.")]

story += [H3("Mentorship Component"), P(
    "Maintains mentor profiles (expertise, languages, availability) and student-mentor bookings with date, time, duration and "
    "goal. Aggregated metrics - active mentees, sessions and community contributions - power the mentor dashboard.")]

story += [H3("Community & Messaging Component"), P(
    "Implements forums (categories, posts, replies, accepted answers), success stories and real-time direct messaging over "
    "WebSocket. When Redis is configured it provides pub/sub fan-out; otherwise the system degrades gracefully to a single "
    "instance, preserving functionality in constrained deployments.")]

story += [H3("Administration & Moderation Component"), P(
    "Offers a control centre for user management, verification of mentors, employers and listings, handling of reported "
    "content and scam alerts, and platform analytics (user counts by role, daily sign-ups, content and AI usage). Access is "
    "restricted to the administrator role at both the route and API levels.")]

story += [H2("2.6 Proposed System / Software Features"), bullets([
    "Role-based authentication and dashboards for students, mentors, employers and administrators.",
    "AI visa assistant with checklist generation and document checking.",
    "Verified opportunities board with visa-sponsorship awareness.",
    "Housing marketplace with listing verification and roommate matching.",
    "Structured mentorship with profiles and session booking.",
    "Community forums, success stories and real-time messaging.",
    "Life-support toolkit (banking, healthcare, SIM, transit, tax, emergency SOS and more).",
    "Administrative verification, moderation and analytics.",
    "Multilingual support through on-demand translation; responsive, dark-mode-aware UI.",
])]

story += [H2("2.7 Development Tools and Environment"), P(
    "The system is implemented with the following tools and environment, described in greater operational detail in "
    "Chapter 3.")]
story += [table(cellpars([
    ["Frontend", "Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4"],
    ["Backend API", "Node.js, Express, WebSocket (ws), TypeScript, Zod"],
    ["AI Service", "Python, FastAPI, Anthropic Claude SDK, Google Cloud Translate"],
    ["Database & Cache", "PostgreSQL (Neon), Redis (Upstash, optional)"],
    ["Authentication", "Firebase Authentication & Firebase Admin SDK"],
    ["Hosting & CI/CD", "Vercel (frontend), Render (backend & AI), GitHub"],
    ["Tooling", "Git/GitHub, Vitest, Docker, ESLint/TypeScript compiler"],
], ["Layer", "Tools / Technologies"]), [110, 300])]
caption("Table 2.2 - Development tools and environment")

story += [H2("2.8 Benefits of Implementation of the Proposed System"), bullets([
    "Consolidation of fragmented services into one trustworthy platform, saving time and reducing risk.",
    "Lower cost of guidance through AI, reducing dependence on expensive agents.",
    "Reduced exposure to housing and admission fraud through verification and moderation.",
    "Reduced isolation through mentorship and community features.",
    "Scalable, independently deployable services with graceful degradation.",
    "A foundation that institutions and employers can adopt to reach international audiences.",
])]
story.append(PageBreak())

# ============================================================ CHAPTER 3
story += [H1("Chapter 3: Methodology")]

story += [H2("3.1 Chapter Overview"), P(
    "This chapter describes how the system was engineered. It presents the requirement-specification process, the "
    "stakeholders and how their needs were gathered, the functional and non-functional requirements, the UML models that "
    "capture system behaviour and structure, the security concepts, the chosen software-process model and its "
    "justification, and the logical (user-interface and database) design.")]

story += [H2("3.2 Requirement Specification"), P(
    "Requirements were elicited and specified iteratively. Each requirement was recorded, classified as functional or "
    "non-functional, prioritised, and validated against the project aim. The specification was refined at the end of each "
    "iteration as understanding deepened and as working software exposed implicit needs.")]

story += [H2("3.3 Stakeholders of the System"), P("The principal stakeholders are:"), bullets([
    "<b>Students / immigrants</b> - primary end users seeking guidance and services.",
    "<b>Mentors</b> - provide guidance and answer community questions.",
    "<b>Employers</b> - post jobs and seek international talent.",
    "<b>Administrators</b> - verify, moderate and monitor the platform.",
    "<b>Project supervisor and academic assessors</b> - evaluate the work.",
    "<b>The development team</b> - design, build, test and maintain the system.",
])]

story += [H2("3.4 Requirement Gathering Process"), P(
    "Requirements were gathered through a combination of techniques: review of existing systems and official immigration "
    "resources to understand current processes and gaps; informal interviews and conversations with international students "
    "about their pain points; analysis of comparable platforms to identify desirable features; and iterative prototyping, "
    "in which working increments were demonstrated and feedback fed back into the next iteration.")]

story += [H2("3.5 Functional Requirements"), P("The system shall provide the following functional capabilities:"), numbered([
    "The system shall allow users to register and authenticate, selecting a role of student, mentor or employer.",
    "The system shall route each authenticated user to a role-specific dashboard and prevent access to other roles' areas.",
    "The system shall let students obtain AI visa guidance and generate document checklists.",
    "The system shall allow users to search, filter, view and save opportunities (scholarships, internships, jobs).",
    "The system shall allow employers to post jobs and flag visa sponsorship.",
    "The system shall allow users to browse and list housing, subject to verification.",
    "The system shall allow students to view mentor profiles and book mentorship sessions.",
    "The system shall provide forums, success stories and real-time messaging.",
    "The system shall allow users to report content and shall surface scam alerts.",
    "The system shall allow administrators to verify users and listings, moderate content and view platform analytics.",
])]

story += [H2("3.6 UML Diagrams"), P(
    "The following UML models capture the behaviour and structure of GlobalBridge.")]

story += [H3("3.6.1 Use Case Diagram"), P(
    "The use case diagram below shows the principal actors and the use cases they participate in. The frontend (client) "
    "use cases are those initiated by human actors, while the back-end use cases (token verification, persistence, AI "
    "inference) are realised by the API and the AI engine in support of them.")]
story += [usecase_diagram(), caption("Figure 3.1 - Use case diagram (front-end and back-end actors)")]

story += [H3("3.6.2 Use Case Descriptions"), P(
    "The roles of the actors are: the <b>Student</b> seeks guidance, opportunities, housing, mentorship and community; "
    "the <b>Mentor</b> offers guidance and answers questions; the <b>Employer</b> posts jobs and reviews interested "
    "candidates; the <b>Administrator</b> verifies, moderates and monitors; and the <b>AI Engine</b> is a supporting actor "
    "that performs language inference. Representative use cases are described below.")]
story += [table(cellpars([
    ["Register / Authenticate", "Student/Mentor/Employer", "User creates an account or signs in; the system verifies the identity token, provisions a user record and assigns a role claim."],
    ["Get AI visa guidance", "Student, AI Engine", "Student asks a visa question; the system builds a prompt and returns AI guidance with a generated document checklist."],
    ["Search opportunities", "Student", "Student searches and filters scholarships and jobs and saves items of interest."],
    ["Book a mentor", "Student, Mentor", "Student selects a mentor and books a session; the mentor reviews and confirms the request."],
    ["List / verify housing", "Mentor/Employer, Administrator", "A listing is created in a pending state and becomes active only after administrator verification."],
    ["Moderate & verify", "Administrator", "Administrator reviews reports, verifies users and listings, and monitors analytics."],
], ["Use Case", "Actor(s)", "Description"]), [105, 110, 195])]
caption("Table 3.1 - Use case descriptions")

story += [H3("3.6.3 Activity Diagram (Registration & Routing)"), P(
    "The activity flow for registration is: the user submits the sign-up form; the system creates a Firebase account and "
    "obtains an ID token; the backend verifies the token and upserts the user record with a role claim; on success the "
    "user is redirected to the dashboard for their role; on failure an error is shown and the user may retry. Decision "
    "points handle duplicate accounts and invalid credentials.")]

story += [H3("3.6.4 Sequence Diagram (Registration & Authentication)"), sequence_diagram()]

story += [H3("3.6.5 Class Diagram (Core Domain)"), P(
    "The core domain classes and their principal relationships are summarised below. A User has one role and may own "
    "many Opportunities, Bookings, SavedItems, ForumPosts and Messages; Opportunities are saved by many Users; Bookings "
    "associate a student User with a mentor User.")]
story += [table(cellpars([
    ["User", "id, email, role, fullName, countryOfOrigin, verificationStatus", "owns Opportunities, Bookings, SavedItems, Posts"],
    ["Opportunity", "id, type, title, country, deadline, sponsorsVisa, viewCount", "posted by User; saved by Users"],
    ["MentorBooking", "id, mentorId, studentId, slotDate, slotTime, status", "links student User and mentor User"],
    ["HousingListing", "id, title, status, rating, location", "posted by User; verified by Admin"],
    ["VisaChecklist", "id, userId, destination, items, completedItems", "belongs to User"],
    ["ForumPost", "id, authorId, title, body, answerCount", "has many ForumReplies"],
], ["Class", "Key Attributes", "Relationships"]), [85, 200, 125])]
caption("Table 3.2 - Core domain classes (class diagram in tabular form)")

story += [H2("3.7 Non-Functional Requirements"), P(
    "The non-functional requirements, with justifications, are as follows.")]
story += [table(cellpars([
    ["Security", "User data and credentials must be protected and access must be role-appropriate.", "The platform handles personal and verification data for a vulnerable population."],
    ["Usability", "The interface must be clear, responsive and accessible, with dark-mode support.", "Users vary in device, language and digital literacy."],
    ["Performance", "Common interactions should respond within a few seconds under normal load.", "Slow responses deter use and harm trust."],
    ["Reliability", "The system should degrade gracefully and tolerate backend cold starts.", "Free-tier hosting and optional services must not cause failures."],
    ["Scalability", "Components must scale independently.", "AI and core workloads have different load profiles."],
    ["Maintainability", "Code must be modular, typed and tested.", "The system will evolve across iterations and contributors."],
    ["Portability", "The system must run on managed cloud platforms via standard runtimes/containers.", "Avoids vendor lock-in and eases deployment."],
], ["Requirement", "Statement", "Justification"]), [80, 175, 155])]
caption("Table 3.3 - Non-functional requirements with justifications")

story += [H2("3.8 Security Concepts"), P(
    "Because GlobalBridge stores personal and verification data, security is a first-class concern addressed at several "
    "layers, in line with established OWASP guidance [18]:")]
story += [bullets([
    "<b>Authentication</b> - identities are managed by Firebase Authentication; the backend verifies each request's ID token with the Firebase Admin SDK before any protected action.",
    "<b>Authorisation</b> - a role claim (student, mentor, employer, admin) is enforced both by client-side route guards and by server-side checks on every API route, so privilege cannot be escalated by manipulating the client.",
    "<b>Transport security</b> - all traffic is served over HTTPS by the hosting platforms.",
    "<b>Input validation</b> - request payloads are validated with Zod schemas [16] and user-supplied strings are sanitised to prevent injection and cross-site scripting.",
    "<b>HTTP hardening</b> - the API applies Helmet security headers, Cross-Origin Resource Sharing restricted to the known frontend origin, and CSRF protection.",
    "<b>Rate limiting</b> - request rate limiting protects against brute-force and abuse.",
    "<b>Secret management</b> - service-account keys and credentials are held in environment variables, never in source control.",
    "<b>Content integrity</b> - listing verification, content moderation and scam alerts protect users from fraud.",
])]

story += [H2("3.9 Project Methods (Agile or Plan-Driven)"), P(
    "Two broad families of method were considered: plan-driven (predictive) approaches, which fix requirements early and "
    "proceed sequentially, and agile (adaptive) approaches, which embrace changing requirements through short, iterative "
    "cycles. Given that the team's understanding of user needs was expected to deepen over time and that working software "
    "was the best way to validate the concept, an agile method was adopted.")]

story += [H2("3.10 The Various Software Process Models"), P("The following models were considered [1], [2]:"), bullets([
    "<b>Waterfall</b> - sequential phases; simple to manage but inflexible to change and risky for evolving requirements.",
    "<b>Incremental</b> - delivers the system in increments; balances structure with partial early delivery.",
    "<b>Spiral</b> - risk-driven and iterative; powerful but heavyweight for a student project.",
    "<b>Prototyping</b> - builds throwaway or evolutionary prototypes to clarify requirements.",
    "<b>Agile / Scrum</b> - short iterations (sprints) with continuous feedback, suited to changing requirements and small teams.",
])]

story += [H2("3.11 Chosen Model and Justification"), P(
    "An <b>agile, iterative model in the spirit of Scrum</b> [3] was chosen. Work proceeded in short iterations, each producing "
    "a working, deployable increment (for example: authentication, then the AI service, then each functional module, then "
    "the dashboards and admin tools). This choice is justified because: requirements evolved as the team learned more about "
    "user needs; continuous deployment to Vercel and Render allowed each increment to be validated quickly; the small, "
    "two-person team benefited from lightweight process and frequent integration; and risk was reduced by delivering and "
    "testing functionality early rather than deferring integration to the end.")]

story += [H2("3.12 Project Design Consideration (Logical Designs)")]
story += [H3("3.12.1 User-Interface Design (Wireframes)"), P(
    "The interface follows a modern, trustworthy SaaS aesthetic with a deep-blue and emerald palette, clear typography, "
    "responsive layouts and dark-mode support. The principal screens were wireframed before implementation:")]
story += [bullets([
    "<b>Authentication screen</b> - a split-screen layout pairing a branded trust panel (statistics, testimonial, security badges) with an accessible sign-in / multi-step sign-up form.",
    "<b>Student dashboard</b> - a welcome header, profile-completion indicator, key statistics, status trackers (visa, applications, housing), quick actions and recommendation widgets.",
    "<b>Mentor dashboard</b> - mentee and request counts, upcoming sessions, community-impact metrics and management actions.",
    "<b>Employer dashboard</b> - active listings, interested candidates, job views and a visa-sponsorship indicator.",
    "<b>Admin dashboard</b> - platform analytics, verification and moderation queues, and content management.",
])]

story += [H3("3.12.2 Database Design (ER Diagram & Schema)"), P(
    "The database is a normalised PostgreSQL schema. The simplified entity-relationship overview below shows the core "
    "entities and their relationships; the principal tables and their purpose follow.")]
story += [er_diagram()]
story += [table(cellpars([
    ["users", "Accounts, roles, profile and verification status (identity bridge to Firebase)."],
    ["mentor_profiles / employer_profiles", "Role-specific extended profiles."],
    ["opportunities", "Scholarships, internships, work-study and jobs (typed), with visa-sponsorship flag."],
    ["housing_listings / roommate_preferences", "Accommodation listings and roommate matching."],
    ["mentor_bookings", "Student-mentor session bookings."],
    ["saved_items", "User-saved opportunities and housing (interest signal)."],
    ["visa_checklists", "Per-user visa document checklists and completion state."],
    ["forum_categories / forum_posts / forum_replies", "Community discussion structures."],
    ["conversations / messages", "Real-time direct messaging."],
    ["success_stories", "Verified migrant success stories."],
    ["notifications", "Per-user notifications."],
    ["reports / scam_alerts", "Moderation reports and fraud alerts."],
    ["ai_conversations / ai_messages", "Persisted AI assistant conversations."],
], ["Table", "Purpose"]), [180, 230])]
caption("Table 3.4 - Principal database tables and their purpose")

story += [H2("3.13 Developmental Tools"), P(
    "The development tools introduced in Chapter 2 were used as follows during implementation:")]
story += [bullets([
    "<b>Next.js 15 & React 19 (TypeScript, Tailwind CSS v4)</b> [4], [5], [6], [7] - used to build the server-rendered, responsive frontend, with the App Router providing role-segmented routes and layouts, and client guards enforcing role-based navigation.",
    "<b>Node.js & Express (TypeScript)</b> [9], [8] - used to implement the REST API and route handlers, with middleware for authentication, CSRF, Helmet, CORS and rate limiting; <b>ws</b> provides WebSocket messaging [17].",
    "<b>Zod</b> [16] - used to validate and type-check all request payloads and environment configuration at runtime.",
    "<b>FastAPI (Python)</b> [10] - used to implement the AI microservice endpoints; the <b>Anthropic Claude SDK</b> [11] performs inference with prompt caching, and <b>Google Cloud Translate</b> [13] performs translation.",
    "<b>PostgreSQL (Neon)</b> [14], [21] - used as the primary relational store via the node-postgres driver and parameterised queries; <b>Redis (Upstash)</b> [15] optionally provides caching and pub/sub.",
    "<b>Firebase Authentication & Admin SDK</b> [12] - used for identity management and server-side token verification.",
    "<b>Git & GitHub</b> - used for version control and as the trigger for continuous deployment.",
    "<b>Vercel & Render</b> [19], [20] - used to host the frontend and the backend/AI services respectively, with automatic deployment on each push.",
    "<b>Vitest</b> [23] - used for automated unit testing of core logic; the <b>TypeScript compiler</b> [6] enforces type safety across the codebase.",
    "<b>Docker</b> [22] - used to containerise the backend for reproducible deployment.",
])]

# ============================================================ REFERENCES
S("Ref", fontName="Helvetica", fontSize=9.5, leading=13.5, leftIndent=20, firstLineIndent=-20, spaceAfter=6, alignment=TA_LEFT)

story.append(PageBreak())
story += [H1("References"), P(
    "The following sources, comprising official technical documentation, standards and software-engineering "
    "literature, informed the design and implementation of the GlobalBridge platform.")]

references = [
    "I. Sommerville, <i>Software Engineering</i>, 10th ed. Harlow, England: Pearson Education, 2015.",
    "R. S. Pressman and B. R. Maxim, <i>Software Engineering: A Practitioner's Approach</i>, 8th ed. New York, NY, USA: McGraw-Hill Education, 2015.",
    "K. Schwaber and J. Sutherland, &ldquo;The Scrum Guide,&rdquo; Scrum.org, 2020. [Online]. Available: https://scrumguides.org. [Accessed: 2026].",
    "Vercel Inc., &ldquo;Next.js Documentation (App Router),&rdquo; 2025. [Online]. Available: https://nextjs.org/docs. [Accessed: 2026].",
    "Meta Platforms Inc., &ldquo;React Documentation,&rdquo; 2025. [Online]. Available: https://react.dev. [Accessed: 2026].",
    "Microsoft Corporation, &ldquo;TypeScript Documentation,&rdquo; 2025. [Online]. Available: https://www.typescriptlang.org/docs. [Accessed: 2026].",
    "Tailwind Labs, &ldquo;Tailwind CSS Documentation,&rdquo; 2025. [Online]. Available: https://tailwindcss.com/docs. [Accessed: 2026].",
    "OpenJS Foundation, &ldquo;Express - Node.js Web Application Framework,&rdquo; 2025. [Online]. Available: https://expressjs.com. [Accessed: 2026].",
    "OpenJS Foundation, &ldquo;Node.js Documentation,&rdquo; 2025. [Online]. Available: https://nodejs.org/docs. [Accessed: 2026].",
    "S. Ramirez, &ldquo;FastAPI Documentation,&rdquo; 2025. [Online]. Available: https://fastapi.tiangolo.com. [Accessed: 2026].",
    "Anthropic PBC, &ldquo;Claude API Documentation,&rdquo; 2025. [Online]. Available: https://docs.anthropic.com. [Accessed: 2026].",
    "Google LLC, &ldquo;Firebase Authentication Documentation,&rdquo; 2025. [Online]. Available: https://firebase.google.com/docs/auth. [Accessed: 2026].",
    "Google LLC, &ldquo;Cloud Translation API Documentation,&rdquo; 2025. [Online]. Available: https://cloud.google.com/translate/docs. [Accessed: 2026].",
    "The PostgreSQL Global Development Group, &ldquo;PostgreSQL 16 Documentation,&rdquo; 2024. [Online]. Available: https://www.postgresql.org/docs. [Accessed: 2026].",
    "Redis Ltd., &ldquo;Redis Documentation,&rdquo; 2025. [Online]. Available: https://redis.io/docs. [Accessed: 2026].",
    "Colin McDonnell, &ldquo;Zod: TypeScript-first Schema Validation,&rdquo; 2025. [Online]. Available: https://zod.dev. [Accessed: 2026].",
    "I. Fette and A. Melnikov, &ldquo;The WebSocket Protocol,&rdquo; RFC 6455, Internet Engineering Task Force, Dec. 2011. [Online]. Available: https://www.rfc-editor.org/rfc/rfc6455.",
    "OWASP Foundation, &ldquo;OWASP Top 10:2021,&rdquo; 2021. [Online]. Available: https://owasp.org/Top10. [Accessed: 2026].",
    "Vercel Inc., &ldquo;Vercel Platform Documentation,&rdquo; 2025. [Online]. Available: https://vercel.com/docs. [Accessed: 2026].",
    "Render Services Inc., &ldquo;Render Documentation,&rdquo; 2025. [Online]. Available: https://render.com/docs. [Accessed: 2026].",
    "Neon Inc., &ldquo;Neon Serverless Postgres Documentation,&rdquo; 2025. [Online]. Available: https://neon.tech/docs. [Accessed: 2026].",
    "Docker Inc., &ldquo;Docker Documentation,&rdquo; 2025. [Online]. Available: https://docs.docker.com. [Accessed: 2026].",
    "Vitest, &ldquo;Vitest - Next Generation Testing Framework,&rdquo; 2025. [Online]. Available: https://vitest.dev. [Accessed: 2026].",
]
for i, ref in enumerate(references, 1):
    story.append(Paragraph(f"[{i}]&nbsp;&nbsp;{ref}", styles["Ref"]))

# ---------------------------------------------------------------- build
doc = SimpleDocTemplate(
    "GlobalBridge_Project_Report.pdf", pagesize=A4,
    leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm,
    title="GlobalBridge - Final Year Project Report (Chapters 1-3)",
    author="Eric Asante; Baddoo Jeremiah Nii Adotei",
)
doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=header_footer)
print("OK: GlobalBridge_Project_Report.pdf")
