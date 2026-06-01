import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Home as HomeIcon,
  Users,
  Briefcase,
  ShieldCheck,
  Globe,
  FileCheck,
  Award,
  HeartHandshake,
  PhoneCall,
  Languages,
  Bot,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <TrustBar />
      <FivePillars />
      <AIAssistantShowcase />
      <ComparisonTable />
      <BonusFeatures />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-clay-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-leaf-500/8 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-32">
        <div className="max-w-3xl animate-fade-up">
          <div className="badge badge-clay mb-6">
            <Sparkles size={12} /> AI-powered guidance · Verified mentors
          </div>

          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-ink-900 leading-[1.05]">
            Your trusted bridge to <span className="text-clay-600 italic">studying abroad.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-ink-600 max-w-2xl leading-relaxed">
            One platform for visa guidance, verified housing, mentorship, jobs, and life support — before, during, and after you arrive.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/register" className="btn-accent text-base px-6 py-3">
              Start your journey <ArrowRight size={18} />
            </Link>
            <Link href="/assistant" className="btn-ghost text-base px-6 py-3 border border-cream-300">
              Try AI Assistant
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-sm text-ink-500">
            <Stat value="50+" label="Countries supported" />
            <Stat value="200+" label="Verified mentors" />
            <Stat value="50+" label="Languages" />
            <Stat value="24/7" label="AI assistance" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-2xl font-semibold text-ink-900">{value}</span>
      <span className="text-ink-500">{label}</span>
    </div>
  );
}

function TrustBar() {
  const countries = [
    { code: "gh", name: "Ghana" },
    { code: "ng", name: "Nigeria" },
    { code: "ke", name: "Kenya" },
    { code: "in", name: "India" },
    { code: "pk", name: "Pakistan" },
    { code: "bd", name: "Bangladesh" },
    { code: "mx", name: "Mexico" },
    { code: "ph", name: "Philippines" },
  ];

  return (
    <section className="border-y border-cream-200 bg-cream-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-6">
        <p className="text-sm font-medium text-ink-500">Built for students from:</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-ink-700">
          {countries.map((c) => (
            <span key={c.code} className="inline-flex items-center gap-2">
              <span className={`fi-${c.code}`} aria-hidden="true" />
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FivePillars() {
  const pillars = [
    {
      icon: Bot,
      title: "AI Visa Assistant",
      desc: "Conversational guidance for any visa, any country. Step-by-step document checklists.",
      tone: "clay",
    },
    {
      icon: HomeIcon,
      title: "Verified Housing",
      desc: "Identity-checked landlords. Roommate matching. Bookings before you board your flight.",
      tone: "sky",
    },
    {
      icon: Users,
      title: "Mentorship Network",
      desc: "Connect with people who lived your destination for years. Cultural hubs and events.",
      tone: "leaf",
    },
    {
      icon: Briefcase,
      title: "Jobs & Internships",
      desc: "Filter by visa sponsors. AI resume builder. Sponsorship-history tracker.",
      tone: "clay",
    },
    {
      icon: ShieldCheck,
      title: "Life Support Toolkit",
      desc: "Cost calculators, healthcare guides, banking setup, emergency SOS — all in one place.",
      tone: "sky",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
      <div className="max-w-2xl mb-16">
        <p className="text-sm font-medium text-clay-600 mb-3">FIVE PILLARS</p>
        <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
          Everything you need, end to end.
        </h2>
        <p className="mt-4 text-lg text-ink-600">
          Common App stops at admission. LinkedIn stops at job search. GlobalBridge supports you through the entire journey.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pillars.map((p, i) => (
          <div key={p.title} className="card group" style={{ animationDelay: `${i * 60}ms` }}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
              p.tone === "clay" ? "bg-clay-500/12 text-clay-600" :
              p.tone === "sky" ? "bg-sky-500/12 text-sky-600" :
              "bg-leaf-500/12 text-leaf-600"
            }`}>
              <p.icon size={22} />
            </div>
            <h3 className="font-display text-xl font-semibold text-ink-900 mb-2">{p.title}</h3>
            <p className="text-sm text-ink-600 leading-relaxed">{p.desc}</p>
            <div className="mt-4 text-sm font-medium text-clay-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
              Learn more <ArrowRight size={14} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AIAssistantShowcase() {
  return (
    <section className="bg-slate-900 text-slate-100 py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 w-[800px] h-[800px] bg-clay-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-medium text-clay-500 mb-3">AI ASSISTANT</p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Visa navigation, as simple as a conversation.
            </h2>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed">
              No more expensive immigration consultants for basic questions. Get country-specific, step-by-step guidance with personalized document checklists.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Dynamic question flows for any visa type",
                "Plain-language explanations of immigration docs",
                "Personalized downloadable checklists",
                "Deadline reminders for renewals & extensions",
                "Escalation to verified human mentors",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-slate-200">
                  <FileCheck size={18} className="text-clay-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/assistant" className="btn-accent mt-10">
              Try it free <ArrowRight size={16} />
            </Link>
          </div>

          <div className="card !bg-slate-800 !border-slate-700 !text-slate-100">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700">
              <div className="w-2.5 h-2.5 rounded-full bg-clay-500 animate-pulse-glow" />
              <span className="text-xs text-slate-400 font-mono">globalbridge-ai · live</span>
            </div>

            <div className="space-y-4">
              <ChatBubble role="user">
                Do I need a student visa for Canada and what documents are required? I&apos;m from Nigeria.
              </ChatBubble>

              <ChatBubble role="assistant">
                <p className="mb-3">Yes — as a Nigerian citizen, you&apos;ll need a <strong className="text-clay-500">Canadian Study Permit</strong>. Here are the steps:</p>
                <ol className="space-y-1.5 text-sm text-slate-200">
                  <li>1. Receive Letter of Acceptance from a DLI</li>
                  <li>2. Gather proof of funds (CAD 10,000+)</li>
                  <li>3. Submit biometrics at VAC</li>
                  <li>4. Apply online via IRCC portal</li>
                  <li>5. Wait 8–12 weeks for processing</li>
                </ol>
                <button className="mt-4 text-xs text-clay-500 font-medium hover:text-clay-400 transition">
                  → Generate my checklist
                </button>
              </ChatBubble>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-clay-500 text-white rounded-br-sm"
            : "bg-slate-700 text-slate-100 rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ComparisonTable() {
  const features = [
    ["University Applications", true, false, true],
    ["AI Visa & Immigration Guidance", false, false, true],
    ["Verified Housing Marketplace", false, false, true],
    ["Structured Mentorship Network", "limited", "limited", true],
    ["Visa-Sponsor Job Filter", false, true, true],
    ["Life Support Toolkit", false, false, true],
    ["AI Document Checker", false, false, true],
    ["50+ Languages", false, "partial", true],
    ["Verified Scholarships", "limited", false, true],
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
      <div className="max-w-2xl mb-12">
        <p className="text-sm font-medium text-clay-600 mb-3">WHY GLOBALBRIDGE</p>
        <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
          We don&apos;t compete. We transcend.
        </h2>
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-cream-100 border-b border-cream-200">
              <th className="text-left px-6 py-4 text-sm font-semibold text-ink-700">Feature</th>
              <th className="px-6 py-4 text-sm font-semibold text-ink-700">Common App</th>
              <th className="px-6 py-4 text-sm font-semibold text-ink-700">LinkedIn</th>
              <th className="px-6 py-4 text-sm font-semibold text-clay-600">GlobalBridge</th>
            </tr>
          </thead>
          <tbody>
            {features.map(([label, common, linkedin, gb], i) => (
              <tr key={i} className="border-b border-cream-200 last:border-0 hover:bg-cream-50">
                <td className="px-6 py-4 text-sm text-ink-800 font-medium">{label}</td>
                <Cell value={common} />
                <Cell value={linkedin} />
                <Cell value={gb} highlight />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  let content: React.ReactNode;
  if (value === true) content = <span className="text-leaf-600 font-medium">✓ Yes</span>;
  else if (value === false) content = <span className="text-ink-400">—</span>;
  else content = <span className="text-amber-500 capitalize text-xs">{value}</span>;

  return (
    <td className={`px-6 py-4 text-center text-sm ${highlight ? "bg-clay-500/5" : ""}`}>
      {content}
    </td>
  );
}

function BonusFeatures() {
  const bonus = [
    { icon: Bot, title: "AI Application Coach", desc: "Reviews your essays, scores against history, suggests improvements." },
    { icon: Languages, title: "50+ Languages", desc: "Every page translated. Auto-detect your language." },
    { icon: Award, title: "Scholarship Matcher", desc: "Profile once. AI scans verified database continuously." },
    { icon: FileCheck, title: "Document Validity Check", desc: "Upload passport, bank statement. AI flags rejection triggers." },
    { icon: HeartHandshake, title: "Peer Review Essays", desc: "Anonymous feedback from verified mentors with structured rubrics." },
    { icon: PhoneCall, title: "Emergency SOS", desc: "One-tap alert to contacts, embassy, and student union." },
  ];

  return (
    <section className="bg-cream-100 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-medium text-clay-600 mb-3">BEYOND THE BRIEF</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
            The features that make us the best in the world.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bonus.map((b) => (
            <div key={b.title} className="card">
              <div className="w-10 h-10 rounded-lg bg-clay-500 text-white flex items-center justify-center mb-4">
                <b.icon size={18} />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-900 mb-1.5">{b.title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const stories = [
    {
      quote: "The AI assistant walked me through my Canada study permit in 20 minutes. Saved me $400 on a consultant.",
      name: "Amara O.",
      meta: "Lagos → Toronto · Computer Science",
    },
    {
      quote: "I found verified housing two weeks before flying out. No scams, no surprises. Met my roommate via the matching tool.",
      name: "Kwame A.",
      meta: "Accra → Manchester · MSc Finance",
    },
    {
      quote: "Connected with three Ghanaian alumni from my target university before I even applied. Game changer.",
      name: "Adaeze N.",
      meta: "Abuja → Berlin · Engineering",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
      <div className="max-w-2xl mb-16">
        <p className="text-sm font-medium text-clay-600 mb-3">SUCCESS STORIES</p>
        <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
          Real students. Real outcomes.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {stories.map((s) => (
          <blockquote key={s.name} className="card">
            <Globe size={20} className="text-clay-500 mb-4" />
            <p className="text-base text-ink-800 leading-relaxed italic">&ldquo;{s.quote}&rdquo;</p>
            <footer className="mt-6 pt-4 border-t border-cream-200">
              <p className="font-medium text-sm text-ink-900">{s.name}</p>
              <p className="text-xs text-ink-500 mt-0.5">{s.meta}</p>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
      <div className="relative card !p-12 md:!p-16 !border-0 bg-gradient-to-br from-clay-500 to-clay-700 text-white overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            Start your journey today.
          </h2>
          <p className="mt-4 text-lg text-white/85">
            Join thousands of students using GlobalBridge to navigate their international education with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary !bg-white !text-slate-900 hover:!bg-slate-100">
              Create free account <ArrowRight size={16} />
            </Link>
            <Link href="/assistant" className="btn-ghost !text-white border border-white/30 hover:!bg-white/10">
              Talk to AI Assistant
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
