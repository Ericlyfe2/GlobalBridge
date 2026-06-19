"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight, Sparkles, Home as HomeIcon, Users, Briefcase, ShieldCheck,
  Globe, FileCheck, Award, HeartHandshake, PhoneCall, Languages, Bot, Quote,
  GraduationCap, Building2, MapPin, ChevronRight, Star, Play, ExternalLink,
  TrendingUp, BookOpen, Search, Filter, Network,
} from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { GlobeCanvas } from "@/components/globe/GlobeScene";
import {
  Reveal, StaggerContainer, StaggerItem, AnimatedCounter,
  AuroraBackground, ParallaxSection, MagneticButton, FloatingCard,
} from "@/components/animations";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <Hero />
      <TrustBar />
      <FivePillars />
      <GlobalOpportunityMap />
      <SuccessStoryWall />
      <AIAssistantShowcase />
      <LiveGlobalStats />
      <DestinationExplorer />
      <UniversityDiscovery />
      <ComparisonTable />
      <VisaEmployers />
      <MentorNetwork />
      <BonusFeatures />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════════
function Hero() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-violet-500/3 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
      </div>

      <motion.div style={{ opacity, scale, y }} className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="relative z-20">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-6">
                  <Sparkles size={12} />
                  {t("landing.badge")}
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight text-white leading-[1.05]"
                dangerouslySetInnerHTML={{ __html: t("landing.heroTitle") }}
              />

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-lg md:text-xl text-slate-300 max-w-xl leading-relaxed"
              >
                {t("landing.heroSubtitle")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-10 flex flex-col sm:flex-row gap-3"
              >
                <Link href="/auth?mode=signup" className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-6 py-3 text-sm transition-all hover:shadow-lg hover:shadow-emerald-500/25">
                  {t("landing.ctaStart")}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 px-6 py-3 text-sm transition-all">
                  {t("landing.ctaAssistant")}
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-12 flex flex-wrap gap-8"
              >
                <StatItem value="50+" label={t("landing.statCountries")} />
                <StatItem value="200+" label={t("landing.statMentors")} />
                <StatItem value="50+" label={t("landing.statLanguages")} />
                <StatItem value="24/7" label={t("landing.statAssistance")} />
              </motion.div>
            </div>

            {/* Right: 3D Globe */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative h-[500px] md:h-[600px] lg:h-[650px]"
            >
              <GlobeCanvas className="w-full h-full" autoRotate />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-2xl font-bold text-emerald-400">{value}</span>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRUST BAR
// ═══════════════════════════════════════════════════════════════════
function TrustBar() {
  const { t } = useTranslation();
  const countries = [
    { code: "gh", name: "Ghana" }, { code: "ng", name: "Nigeria" },
    { code: "ke", name: "Kenya" }, { code: "in", name: "India" },
    { code: "pk", name: "Pakistan" }, { code: "bd", name: "Bangladesh" },
    { code: "mx", name: "Mexico" }, { code: "ph", name: "Philippines" },
  ];

  return (
    <Reveal>
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-400">{t("landing.trustBar")}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-300">
            {countries.map((c) => (
              <span key={c.code} className="inline-flex items-center gap-2">
                <span className={`fi fi-${c.code} shadow-sm`} aria-hidden="true" />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FIVE PILLARS
// ═══════════════════════════════════════════════════════════════════
function FivePillars() {
  const { t } = useTranslation();
  const pillars = [
    { icon: Bot, title: t("landing.pillarAiTitle"), desc: t("landing.pillarAiDesc"), color: "emerald" },
    { icon: HomeIcon, title: t("landing.pillarHousingTitle"), desc: t("landing.pillarHousingDesc"), color: "blue" },
    { icon: Users, title: t("landing.pillarMentorTitle"), desc: t("landing.pillarMentorDesc"), color: "violet" },
    { icon: Briefcase, title: t("landing.pillarJobsTitle"), desc: t("landing.pillarJobsDesc"), color: "amber" },
    { icon: ShieldCheck, title: t("landing.pillarToolkitTitle"), desc: t("landing.pillarToolkitDesc"), color: "rose" },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  };

  return (
    <section className="py-24 bg-slate-900 relative overflow-hidden">
      <AuroraBackground />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <Reveal>
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-emerald-400 mb-3">{t("landing.pillarsLabel")}</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              {t("landing.pillarsTitle")}
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              {t("landing.pillarsSubtitle")}
            </p>
          </div>
        </Reveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((p, i) => {
            const c = colorMap[p.color];
            return (
              <StaggerItem key={p.title} className={i === pillars.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}>
                <FloatingCard className="group relative rounded-2xl border border-slate-800 bg-slate-800/50 p-6 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur-sm h-full">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-4`}>
                    <p.icon size={22} />
                  </div>
                  <h3 className="font-display text-lg font-medium text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
                </FloatingCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL OPPORTUNITY MAP
// ═══════════════════════════════════════════════════════════════════
function GlobalOpportunityMap() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = [
    { id: "scholarship", label: "Scholarships", icon: Award },
    { id: "university", label: "Universities", icon: GraduationCap },
    { id: "job", label: "Jobs", icon: Briefcase },
    { id: "mentor", label: "Mentors", icon: Users },
    { id: "housing", label: "Housing", icon: HomeIcon },
  ];

  return (
    <ParallaxSection className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-emerald-400 mb-3">{t("landing.pillarsLabel")}</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Global Opportunities Map
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              Explore opportunities across the world. Scholarships, jobs, housing, and mentors — all in one interactive globe.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="flex flex-wrap gap-2 mb-8">
            {filters.map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(active ? null : f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <f.icon size={14} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="relative h-[500px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
            <GlobeCanvas className="w-full h-full" autoRotate />
          </div>
        </Reveal>
      </div>
    </ParallaxSection>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUCCESS STORY WALL
// ═══════════════════════════════════════════════════════════════════
function SuccessStoryWall() {
  const stories = [
    { name: "Ama O.", from: "Ghana", to: "Canada", type: "Student Visa", quote: "GlobalBridge walked me through my entire student visa and helped me find safe housing before I even landed.", badge: "Visa Approved", color: "emerald" },
    { name: "Raj P.", from: "India", to: "UK", type: "Scholarship", quote: "I secured a full-ride scholarship to study at Imperial College London. The AI assistant was incredible.", badge: "Full Scholarship", color: "blue" },
    { name: "Fatima M.", from: "Nigeria", to: "Germany", type: "Job", quote: "Found my dream job in Berlin through GlobalBridge's visa-sponsor employer network.", badge: "Job Placed", color: "violet" },
    { name: "Carlos S.", from: "Mexico", to: "USA", type: "Mentorship", quote: "My mentor helped me navigate the entire OPT and H1-B process. Couldn't have done it alone.", badge: "Visa Approved", color: "amber" },
    { name: "Priya K.", from: "India", to: "Australia", type: "Housing", quote: "Found verified housing in Sydney within a week. The platform made relocating so much easier.", badge: "Housing Found", color: "rose" },
    { name: "James O.", from: "Kenya", to: "Netherlands", type: "Student Visa", quote: "The visa timeline tracker kept me organized through the entire Dutch student visa process.", badge: "Visa Approved", color: "emerald" },
  ];

  return (
    <section className="py-24 bg-slate-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-12">
        <Reveal>
          <p className="text-sm font-medium text-emerald-400 mb-3">Success Stories</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Real stories from real students
          </h2>
          <p className="mt-4 text-base text-slate-400 max-w-xl">
            Thousands of students have successfully navigated their journey abroad with GlobalBridge.
          </p>
        </Reveal>
      </div>

      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-6 px-6 lg:px-8 snap-x snap-mandatory scrollbar-none">
          {stories.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="min-w-[380px] md:min-w-[420px] snap-start shrink-0"
            >
              <FloatingCard className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6 backdrop-blur-sm h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.from} → {s.to}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium px-2.5 py-1 border border-emerald-500/20">
                    {s.badge}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{s.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="ml-1">{s.type}</span>
                </div>
              </FloatingCard>
            </motion.div>
          ))}
        </div>
        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-6 w-16 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-6 w-16 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI ASSISTANT SHOWCASE
// ═══════════════════════════════════════════════════════════════════
function AIAssistantShowcase() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    // Simulate AI response
    const responses: Record<string, string> = {
      canada: "To study in Canada you need: 1) Letter of Acceptance from a DLI, 2) Proof of funds (CAD 10,000+), 3) Valid passport, 4) Biometrics at a VAC, 5) Apply via IRCC portal. Processing takes 8-12 weeks.",
      uk: "For UK student visa: 1) CAS from your university, 2) Proof of funds (tuition + £1,334/month), 3) SELT test results, 4) TB test (if applicable), 5) Apply online. Decision in 3-4 weeks.",
      usa: "US F-1 visa: 1) I-20 from SEVP-approved school, 2) SEVIS fee payment, 3) DS-160 form, 4) Visa interview at embassy, 5) Proof of ties to home country. Apply 120 days before.",
      germany: "German student visa: 1) University admission, 2) Blocked account (€11,208), 3) Health insurance, 4) APS certificate (for some countries), 5) Visa application at embassy.",
      default: "I can help with visas for Canada, UK, USA, Germany, Australia, France, and more. Ask me about a specific country or document requirement!",
    };

    const lower = q.toLowerCase();
    const matched = Object.entries(responses).find(([key]) => lower.includes(key));
    const answer = matched ? matched[1] : responses.default;

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", text: answer, html: true } as any]);
      setLoading(false);
    }, 800);
  };

  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-medium text-emerald-400 mb-3">{t("landing.assistantLabel")}</p>
              <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
                {t("landing.assistantTitle")}
              </h2>
              <p className="mt-6 text-lg text-slate-400 leading-relaxed">
                {t("landing.assistantSubtitle")}
              </p>

              <div className="mt-8 space-y-3">
                {[t("landing.assistantFeature1"), t("landing.assistantFeature2"), t("landing.assistantFeature3"), t("landing.assistantFeature4"), t("landing.assistantFeature5")].map((f) => (
                  <div key={f} className="flex items-start gap-3 text-slate-300">
                    <FileCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/assistant" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-6 py-3 text-sm transition-all">
                {t("landing.assistantCta")} <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.2} direction="right">
            <FloatingCard className="rounded-2xl border border-slate-800 bg-slate-900 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-500 font-mono">globalbridge-ai · live</span>
              </div>

              {/* Demo chat */}
              <div className="space-y-4 min-h-[280px] max-h-[320px] overflow-y-auto scrollbar-none mb-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot size={32} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-sm text-slate-500">Ask me about any country or visa type</p>
                    <p className="text-xs text-slate-600 mt-1">e.g. "How do I study in Canada?"</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <ChatBubble key={i} role={msg.role as any}>
                    {msg.text}
                  </ChatBubble>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about any country..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-all"
                >
                  Ask
                </button>
              </form>
            </FloatingCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          role === "user" ? "bg-emerald-500 text-slate-900 rounded-br-sm" : "bg-slate-800 text-slate-200 rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LIVE GLOBAL STATS
// ═══════════════════════════════════════════════════════════════════
function LiveGlobalStats() {
  const stats = [
    { value: 50000, suffix: "+", label: "Students Guided", prefix: "" },
    { value: 120, suffix: "+", label: "Countries", prefix: "" },
    { value: 24000, suffix: "+", label: "Scholarships", prefix: "$" },
    { value: 5000, suffix: "+", label: "Housing Listings", prefix: "" },
    { value: 2000, suffix: "+", label: "Mentors", prefix: "" },
    { value: 98, suffix: "%", label: "Visa Success Rate", prefix: "" },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-emerald-400 mb-3">Global Impact</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Trusted by students worldwide
            </h2>
          </div>
        </Reveal>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">
                  {s.prefix}
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm text-slate-400">{s.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DESTINATION EXPLORER
// ═══════════════════════════════════════════════════════════════════
function DestinationExplorer() {
  const [selected, setSelected] = useState(0);

  const destinations = [
    { flag: "🇨🇦", name: "Canada", tag: "Most Popular", cost: "CAD 20K/yr", scholarships: 45, jobs: 120 },
    { flag: "🇬🇧", name: "United Kingdom", tag: "Top Ranked", cost: "GBP 25K/yr", scholarships: 60, jobs: 90 },
    { flag: "🇺🇸", name: "United States", tag: "Most Universities", cost: "USD 35K/yr", scholarships: 80, jobs: 200 },
    { flag: "🇩🇪", name: "Germany", tag: "Low Tuition", cost: "EUR 12K/yr", scholarships: 35, jobs: 75 },
    { flag: "🇦🇺", name: "Australia", tag: "High Success", cost: "AUD 30K/yr", scholarships: 30, jobs: 60 },
    { flag: "🇫🇷", name: "France", tag: "Affordable", cost: "EUR 15K/yr", scholarships: 25, jobs: 45 },
  ];

  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-emerald-400 mb-3">Destinations</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Explore top study destinations
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="grid lg:grid-cols-3 gap-6">
            {destinations.map((d, i) => (
              <motion.button
                key={d.name}
                onClick={() => setSelected(i)}
                whileHover={{ y: -4 }}
                className={`text-left rounded-2xl border p-6 transition-all ${
                  selected === i
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{d.flag}</span>
                  {d.tag && (
                    <span className="rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium px-2.5 py-1 border border-emerald-500/20">
                      {d.tag}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{d.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{d.cost}</p>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>{d.scholarships}+ scholarships</span>
                  <span>{d.jobs}+ jobs</span>
                </div>
              </motion.button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UNIVERSITY DISCOVERY
// ═══════════════════════════════════════════════════════════════════
function UniversityDiscovery() {
  const unis = [
    { name: "University of Toronto", country: "Canada", ranking: "#21", tuition: "CAD 45K", scholarships: "Available" },
    { name: "Imperial College London", country: "UK", ranking: "#6", tuition: "GBP 35K", scholarships: "Limited" },
    { name: "Harvard University", country: "USA", ranking: "#1", tuition: "USD 55K", scholarships: "Full Need" },
    { name: "LMU Munich", country: "Germany", ranking: "#59", tuition: "EUR 3K", scholarships: "Generous" },
    { name: "University of Melbourne", country: "Australia", ranking: "#33", tuition: "AUD 40K", scholarships: "Available" },
    { name: "Sorbonne University", country: "France", ranking: "#60", tuition: "EUR 4K", scholarships: "Available" },
  ];

  return (
    <section className="py-24 bg-slate-900 relative overflow-hidden">
      <AuroraBackground />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <Reveal>
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-emerald-400 mb-3">Universities</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Discover top universities
            </h2>
          </div>
        </Reveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {unis.map((u) => (
            <StaggerItem key={u.name}>
              <FloatingCard className="rounded-2xl border border-slate-800 bg-slate-800/50 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-[11px] text-slate-500">{u.country} · {u.ranking}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{u.tuition}/yr</span>
                  <span className="text-emerald-400">{u.scholarships}</span>
                </div>
              </FloatingCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════════
function ComparisonTable() {
  const { t } = useTranslation();
  const features: [string, boolean | string, boolean | string, boolean | string][] = [
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
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-emerald-400 mb-3">{t("landing.comparisonLabel")}</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              {t("landing.comparisonTitle")}
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">{t("landing.comparisonFeature")}</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-400">{t("landing.comparisonCommonApp")}</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-400">{t("landing.comparisonLinkedIn")}</th>
                  <th className="px-6 py-4 text-sm font-semibold text-emerald-400">{t("landing.comparisonGlobalBridge")}</th>
                </tr>
              </thead>
              <tbody>
                {features.map(([label, common, linkedin, gb], i) => (
                  <tr key={i} className="border-b border-slate-800 last:border-0 hover:bg-slate-900/50">
                    <td className="px-6 py-4 text-sm text-slate-200 font-medium">{label}</td>
                    <Cell value={common} />
                    <Cell value={linkedin} />
                    <Cell value={gb} highlight />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Cell({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  let content: React.ReactNode;
  if (value === true) content = <span className="text-emerald-400 font-medium">✓ Yes</span>;
  else if (value === false) content = <span className="text-slate-600">—</span>;
  else content = <span className="text-amber-400 capitalize text-xs">{String(value)}</span>;

  return (
    <td className={`px-6 py-4 text-center text-sm ${highlight ? "bg-emerald-500/5" : ""}`}>
      {content}
    </td>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VISA EMPLOYERS
// ═══════════════════════════════════════════════════════════════════
function VisaEmployers() {
  const employers = [
    { name: "Google", positions: 45, rate: "92%", salary: "$150K+" },
    { name: "Microsoft", positions: 38, rate: "88%", salary: "$140K+" },
    { name: "Amazon", positions: 52, rate: "85%", salary: "$135K+" },
    { name: "Meta", positions: 30, rate: "90%", salary: "$160K+" },
    { name: "Deloitte", positions: 25, rate: "80%", salary: "$85K+" },
    { name: "JPMorgan", positions: 20, rate: "78%", salary: "$100K+" },
  ];

  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-emerald-400 mb-3">Visa Sponsors</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Companies hiring international talent
            </h2>
          </div>
        </Reveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employers.map((e) => (
            <StaggerItem key={e.name}>
              <FloatingCard className="rounded-2xl border border-slate-800 bg-slate-800/50 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {e.name.charAt(0)}
                  </div>
                  <p className="text-sm font-medium text-white">{e.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-white">{e.positions}</p>
                    <p className="text-[10px] text-slate-500">Open Positions</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">{e.rate}</p>
                    <p className="text-[10px] text-slate-500">Sponsor Rate</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{e.salary}</p>
                    <p className="text-[10px] text-slate-500">Avg Salary</p>
                  </div>
                </div>
              </FloatingCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MENTOR NETWORK
// ═══════════════════════════════════════════════════════════════════
function MentorNetwork() {
  const mentors = [
    { name: "Dr. Kwame A.", role: "Professor", country: "Canada", students: 45, rating: 4.9 },
    { name: "Sarah J.", role: "Software Engineer", country: "UK", students: 28, rating: 4.8 },
    { name: "Michael O.", role: "Immigration Lawyer", country: "USA", students: 62, rating: 4.9 },
    { name: "Lisa M.", role: "Career Coach", country: "Germany", students: 35, rating: 4.7 },
    { name: "David K.", role: "Entrepreneur", country: "Australia", students: 20, rating: 4.8 },
    { name: "Amina S.", role: "HR Director", country: "Netherlands", students: 30, rating: 4.6 },
  ];

  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-emerald-400 mb-3">Mentors</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Learn from those who made it
            </h2>
          </div>
        </Reveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.map((m) => (
            <StaggerItem key={m.name}>
              <FloatingCard className="rounded-2xl border border-slate-800 bg-slate-800/50 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {m.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-[11px] text-slate-500">{m.role} · {m.country}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{m.students} students mentored</span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star size={12} className="fill-amber-400" /> {m.rating}
                  </span>
                </div>
              </FloatingCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BONUS FEATURES
// ═══════════════════════════════════════════════════════════════════
function BonusFeatures() {
  const { t } = useTranslation();
  const bonus = [
    { icon: Bot, title: t("landing.bonusCoachTitle"), desc: t("landing.bonusCoachDesc") },
    { icon: Languages, title: t("landing.bonusLangTitle"), desc: t("landing.bonusLangDesc") },
    { icon: Award, title: t("landing.bonusScholarshipTitle"), desc: t("landing.bonusScholarshipDesc") },
    { icon: FileCheck, title: t("landing.bonusDocTitle"), desc: t("landing.bonusDocDesc") },
    { icon: HeartHandshake, title: t("landing.bonusPeerTitle"), desc: t("landing.bonusPeerDesc") },
    { icon: PhoneCall, title: t("landing.bonusSOSTitle"), desc: t("landing.bonusSOSDesc") },
  ];

  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-emerald-400 mb-3">{t("landing.bonusLabel")}</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              {t("landing.bonusTitle")}
            </h2>
          </div>
        </Reveal>

        <div className="overflow-hidden">
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
            {bonus.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="min-w-[280px] snap-start shrink-0"
                style={{ marginTop: i % 2 === 0 ? "0" : "2rem" }}
              >
                <FloatingCard className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6 backdrop-blur-sm h-full">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                    <b.icon size={18} />
                  </div>
                  <h3 className="font-display text-lg font-medium text-white mb-1.5">{b.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{b.desc}</p>
                </FloatingCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════
function Testimonials() {
  const { t } = useTranslation();
  const stories = [
    { quote: t("landing.testimonial1Quote"), name: t("landing.testimonial1Name"), meta: t("landing.testimonial1Meta") },
    { quote: t("landing.testimonial2Quote"), name: t("landing.testimonial2Name"), meta: t("landing.testimonial2Meta") },
    { quote: t("landing.testimonial3Quote"), name: t("landing.testimonial3Name"), meta: t("landing.testimonial3Meta") },
  ];

  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute -left-40 top-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        <Reveal>
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-emerald-400 mb-3">{t("landing.testimonialsLabel")}</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              {t("landing.testimonialsTitle")}
            </h2>
          </div>
        </Reveal>

        <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-6 md:items-start">
          {stories.map((s, i) => (
            <motion.blockquote
              key={s.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 backdrop-blur-sm"
              style={{ marginTop: i === 1 ? "0" : i === 2 ? "2rem" : "0" }}
            >
              <Quote size={18} className="text-emerald-500/40 mb-3" />
              <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{s.quote}&rdquo;</p>
              <footer className="mt-6 pt-4 border-t border-slate-800">
                <p className="font-medium text-sm text-white">{s.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.meta}</p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════════════════════════════
function CTA() {
  const { t } = useTranslation();
  return (
    <section className="px-6 lg:px-8 pb-24 bg-slate-950">
      <Reveal>
        <div className="relative rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-10 md:p-16 overflow-hidden max-w-7xl mx-auto">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
          <div className="relative md:max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">
              {t("landing.ctaTitle")}
            </h2>
            <p className="mt-4 text-base md:text-lg text-white/85">
              {t("landing.ctaSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth?mode=signup" className="group inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 font-semibold px-6 py-3 text-sm hover:bg-slate-100 transition-all shadow-lg">
                {t("landing.ctaButton")} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-xl border border-white/30 text-white px-6 py-3 text-sm hover:bg-white/10 transition-all">
                {t("landing.ctaAssistantButton")}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
