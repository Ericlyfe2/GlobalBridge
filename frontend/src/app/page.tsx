"use client";

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
  Quote,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "@/i18n/hooks/useTranslation";

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
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-clay-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-leaf-500/8 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-32 relative">
        <div className="lg:w-3/4 animate-fade-up">
          <div className="badge badge-clay mb-6">
            <Sparkles size={12} /> {t("landing.badge")}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight text-ink-900 leading-[1.05]"
            dangerouslySetInnerHTML={{ __html: t("landing.heroTitle") }}
          />

          <p className="mt-6 text-lg md:text-xl text-ink-600 max-w-2xl leading-relaxed">
            {t("landing.heroSubtitle")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/auth?mode=signup" className="btn-accent text-base px-6 py-3">
              {t("landing.ctaStart")} <ArrowRight size={18} />
            </Link>
            <Link href="/auth?mode=signup" className="btn-ghost text-base px-6 py-3 border border-cream-300">
              {t("landing.ctaAssistant")}
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-sm text-ink-500">
            <Stat value="50+" label={t("landing.statCountries")} />
            <Stat value="200+" label={t("landing.statMentors")} />
            <Stat value="50+" label={t("landing.statLanguages")} />
            <Stat value="24/7" label={t("landing.statAssistance")} />
          </div>
        </div>

        <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 text-[12rem] font-display font-bold text-clay-500/5 select-none leading-none pointer-events-none">
          GB
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
  const { t } = useTranslation();
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
        <p className="text-sm font-medium text-ink-500">{t("landing.trustBar")}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-ink-700">
          {countries.map((c) => (
            <span key={c.code} className="inline-flex items-center gap-2">
              <span className={`fi fi-${c.code}`} aria-hidden="true" />
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FivePillars() {
  const { t } = useTranslation();
  const pillars = [
    {
      icon: Bot,
      title: t("landing.pillarAiTitle"),
      desc: t("landing.pillarAiDesc"),
      tone: "clay",
    },
    {
      icon: HomeIcon,
      title: t("landing.pillarHousingTitle"),
      desc: t("landing.pillarHousingDesc"),
      tone: "sky",
    },
    {
      icon: Users,
      title: t("landing.pillarMentorTitle"),
      desc: t("landing.pillarMentorDesc"),
      tone: "leaf",
    },
    {
      icon: Briefcase,
      title: t("landing.pillarJobsTitle"),
      desc: t("landing.pillarJobsDesc"),
      tone: "clay",
    },
    {
      icon: ShieldCheck,
      title: t("landing.pillarToolkitTitle"),
      desc: t("landing.pillarToolkitDesc"),
      tone: "sky",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
      <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div className="mb-12 lg:mb-0 lg:sticky lg:top-32 lg:self-start">
          <p className="text-sm font-medium text-clay-600 mb-3">{t("landing.pillarsLabel")}</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
            {t("landing.pillarsTitle")}
          </h2>
          <p className="mt-4 text-base text-ink-600 leading-relaxed">
            {t("landing.pillarsSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {pillars.map((p, i) => (
            <div key={p.title} className={`card ${i === pillars.length - 1 ? "sm:col-span-2" : ""}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                p.tone === "clay" ? "bg-clay-500/12 text-clay-600" :
                p.tone === "sky" ? "bg-sky-500/12 text-sky-600" :
                "bg-leaf-500/12 text-leaf-600"
              }`}>
                <p.icon size={20} />
              </div>
              <h3 className="font-display text-lg font-medium text-ink-900 mb-1.5">{p.title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AIAssistantShowcase() {
  const { t } = useTranslation();
  return (
    <section className="bg-slate-900 text-slate-100 py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-clay-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3">
            <p className="text-sm font-medium text-clay-500 mb-3">{t("landing.assistantLabel")}</p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
              {t("landing.assistantTitle")}
            </h2>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed">
              {t("landing.assistantSubtitle")}
            </p>

            <ul className="mt-8 space-y-3">
              {[
                t("landing.assistantFeature1"),
                t("landing.assistantFeature2"),
                t("landing.assistantFeature3"),
                t("landing.assistantFeature4"),
                t("landing.assistantFeature5"),
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-slate-200">
                  <FileCheck size={18} className="text-clay-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/assistant" className="btn-accent mt-10">
              {t("landing.assistantCta")} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="lg:col-span-2">
            <div className="card !bg-slate-800 !border-slate-700 !text-slate-100">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700">
                <div className="w-2.5 h-2.5 rounded-full bg-clay-500 animate-pulse-glow" />
                <span className="text-xs text-slate-400 font-mono">globalbridge-ai &middot; live</span>
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
                    &rarr; {t("assistant.generateChecklist")}
                  </button>
                </ChatBubble>
              </div>
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
        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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
    <section className="py-24 bg-cream-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-clay-600 mb-3">{t("landing.comparisonLabel")}</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
            {t("landing.comparisonTitle")}
          </h2>
        </div>
      </div>

      <div className="card !p-0 overflow-x-auto !rounded-none !border-x-0 max-w-7xl mx-auto px-6 lg:px-8">
        <table className="w-full">
          <thead>
            <tr className="bg-cream-100 border-b border-cream-200">
              <th className="text-left px-6 py-4 text-sm font-semibold text-ink-700">{t("landing.comparisonFeature")}</th>
              <th className="px-6 py-4 text-sm font-semibold text-ink-700">{t("landing.comparisonCommonApp")}</th>
              <th className="px-6 py-4 text-sm font-semibold text-ink-700">{t("landing.comparisonLinkedIn")}</th>
              <th className="px-6 py-4 text-sm font-semibold text-clay-600">{t("landing.comparisonGlobalBridge")}</th>
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
  if (value === true) content = <span className="text-leaf-600 font-medium">&check; Yes</span>;
  else if (value === false) content = <span className="text-ink-400">&mdash;</span>;
  else content = <span className="text-amber-500 capitalize text-xs">{value}</span>;

  return (
    <td className={`px-6 py-4 text-center text-sm ${highlight ? "bg-clay-500/5" : ""}`}>
      {content}
    </td>
  );
}

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
    <section className="py-24">
      <div className="pl-6 lg:pl-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 !pl-0">
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-clay-600 mb-3">{t("landing.bonusLabel")}</p>
            <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
              {t("landing.bonusTitle")}
            </h2>
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="flex gap-5 pb-4 overflow-x-auto snap-x snap-mandatory scrollbar-none px-6 lg:px-8">
          {bonus.map((b, i) => (
            <div
              key={b.title}
              className="card min-w-[280px] sm:min-w-[300px] snap-start shrink-0"
              style={{ marginTop: i % 2 === 0 ? "0" : "2rem" }}
            >
              <div className="w-10 h-10 rounded-lg bg-clay-500 text-white flex items-center justify-center mb-4">
                <b.icon size={18} />
              </div>
              <h3 className="font-display text-lg font-medium text-ink-900 mb-1.5">{b.title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const { t } = useTranslation();
  const stories = [
    {
      quote: t("landing.testimonial1Quote"),
      name: t("landing.testimonial1Name"),
      meta: t("landing.testimonial1Meta"),
    },
    {
      quote: t("landing.testimonial2Quote"),
      name: t("landing.testimonial2Name"),
      meta: t("landing.testimonial2Meta"),
    },
    {
      quote: t("landing.testimonial3Quote"),
      name: t("landing.testimonial3Name"),
      meta: t("landing.testimonial3Meta"),
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute -left-40 top-0 w-[500px] h-[500px] bg-clay-500/8 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-medium text-clay-600 mb-3">{t("landing.testimonialsLabel")}</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink-900 tracking-tight">
            {t("landing.testimonialsTitle")}
          </h2>
        </div>

        <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-6 md:items-start">
          {stories.map((s, i) => (
            <blockquote
              key={s.name}
              className="card relative"
              style={{ marginTop: i === 1 ? "0" : i === 0 ? "0" : "2rem" }}
            >
              <Quote size={18} className="text-clay-500/40 mb-3" />
              <p className="text-base text-ink-800 leading-relaxed">&ldquo;{s.quote}&rdquo;</p>
              <footer className="mt-6 pt-4 border-t border-cream-200">
                <p className="font-medium text-sm text-ink-900">{s.name}</p>
                <p className="text-xs text-ink-500 mt-0.5">{s.meta}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useTranslation();
  return (
    <section className="px-6 lg:px-8 pb-24">
      <div className="relative card !p-10 md:!p-16 !border-0 bg-gradient-to-br from-clay-500 to-clay-700 text-white overflow-hidden max-w-7xl mx-auto">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        <div className="relative md:max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight">
            {t("landing.ctaTitle")}
          </h2>
          <p className="mt-4 text-base md:text-lg text-white/85">
            {t("landing.ctaSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth?mode=signup" className="btn-primary !bg-white !text-slate-900 hover:!bg-slate-100">
              {t("landing.ctaButton")} <ArrowRight size={16} />
            </Link>
            <Link href="/auth?mode=signup" className="btn-ghost !text-white border border-white/30 hover:!bg-white/10">
              {t("landing.ctaAssistantButton")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
