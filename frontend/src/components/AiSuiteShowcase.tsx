"use client";

import Link from "next/link";
import { ShieldAlert, Route, Gauge, ArrowRight, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldAlert,
    tag: "Fraud protection",
    title: "AI Scam Shield",
    body: "Paste a rental listing, job offer, or message. In seconds we score the risk and highlight the exact red flags newcomers get caught by.",
    href: "/auth?mode=signup",
    visual: "shield" as const,
  },
  {
    icon: Route,
    tag: "Guided journey",
    title: "AI Visa Roadmap",
    body: "Tell us where you're coming from and where you're headed. We map every phase, deadline, cost, and document into one clear timeline.",
    href: "/auth?mode=signup",
    visual: "roadmap" as const,
  },
  {
    icon: Gauge,
    tag: "Personalized plan",
    title: "Readiness Score",
    body: "Rate five pillars of your move and get an instant readiness score — plus the top three actions that move the needle most.",
    href: "/auth?mode=signup",
    visual: "readiness" as const,
  },
];

export default function AiSuiteShowcase() {
  return (
    <section id="ai-suite" className="relative w-full bg-cream-50 py-24 md:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10">
        {/* Heading */}
        <div className="max-w-2xl">
          <div className="mb-6 flex items-center gap-4">
            <span className="facet-label text-clay-500">AI Intelligence Suite</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-clay-500/12 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-clay-600">
              <Sparkles size={10} /> New
            </span>
            <div className="h-px w-12 bg-clay-500/30" />
          </div>
          <h2 className="font-display text-4xl leading-tight text-ink-900 md:text-5xl lg:text-6xl">
            Your AI copilot for every step abroad
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
            Three new AI tools that protect you from scams, map your visa journey, and tell you
            exactly how ready you are — built for international students and immigrants.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-6 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Link
              key={f.title}
              href={f.href}
              className="ai-card group relative flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-clay-500/40 hover:shadow-[0_24px_60px_-30px_rgba(13,148,136,0.45)]"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600">
                  <f.icon size={22} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                  {f.tag}
                </span>
              </div>

              <Visual kind={f.visual} />

              <h3 className="mt-6 font-display text-2xl text-ink-900">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">{f.body}</p>

              <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-clay-600 transition-all group-hover:gap-2.5">
                Try it free <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 md:mt-16">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center gap-2 rounded-full bg-clay-500 px-7 py-3.5 font-mono text-xs uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-clay-600"
          >
            Start with the AI suite
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .ai-card {
          opacity: 0;
          transform: translateY(18px);
          animation: aiReveal 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-card {
            opacity: 1;
            transform: none;
            animation: none;
          }
        }
        @keyframes aiReveal {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

/* ---------- mini visuals (static SVG previews) ---------- */

function Visual({ kind }: { kind: "shield" | "roadmap" | "readiness" }) {
  if (kind === "shield") return <ShieldVisual />;
  if (kind === "roadmap") return <RoadmapVisual />;
  return <ReadinessVisual />;
}

function ShieldVisual() {
  // Half-circle risk gauge pinned to high risk.
  const r = 46;
  const c = Math.PI * r; // half circumference
  const pct = 0.94;
  return (
    <div className="rounded-xl bg-cream-50 p-4">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 110 62" className="h-14 w-24 shrink-0">
          <path d="M 9 55 A 46 46 0 0 1 101 55" fill="none" stroke="var(--color-cream-200)" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M 9 55 A 46 46 0 0 1 101 55"
            fill="none" stroke="#dc2626" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
          />
          <text x="55" y="50" textAnchor="middle" className="fill-red-600 font-display" fontSize="20" fontWeight="600">94</text>
        </svg>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-600">Western Union</span>
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-600">no viewing</span>
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">act today</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium text-red-600">High scam risk detected</p>
    </div>
  );
}

function RoadmapVisual() {
  const steps = ["Admission", "Proof of funds", "Study permit", "Arrival"];
  return (
    <div className="rounded-xl bg-cream-50 p-4">
      <ol className="relative ml-1 space-y-2 border-l-2 border-clay-500/30 pl-4">
        {steps.map((s, i) => (
          <li key={s} className="relative">
            <span className="absolute -left-[21px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-clay-500 ring-2 ring-cream-50" />
            <span className="text-[11px] font-medium text-ink-700">{s}</span>
            <span className="ml-2 text-[10px] text-ink-400">Wk {i * 5 + 1}–{i * 5 + 4}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReadinessVisual() {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = 0.72;
  const pillars = [
    { label: "Docs", w: "80%", tone: "bg-leaf-500" },
    { label: "Funds", w: "45%", tone: "bg-amber-500" },
    { label: "Housing", w: "30%", tone: "bg-red-500" },
  ];
  return (
    <div className="rounded-xl bg-cream-50 p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 56 56" className="h-16 w-16 -rotate-90">
            <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-cream-200)" strokeWidth="6" />
            <circle cx="28" cy="28" r={r} fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-base font-semibold text-amber-600">72</span>
        </div>
        <div className="flex-1 space-y-1.5">
          {pillars.map((p) => (
            <div key={p.label}>
              <span className="text-[10px] text-ink-500">{p.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-cream-200">
                <div className={`h-full rounded-full ${p.tone}`} style={{ width: p.w }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
