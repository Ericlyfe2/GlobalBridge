"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  GraduationCap, ArrowLeft, Clock, Play, BookOpen, Briefcase, Mic, Scale, ShieldCheck, CheckCircle2, Sparkles,
} from "lucide-react";

type Category = "all" | "culture" | "interview" | "rights" | "comms" | "negotiation";

const categories: { key: Category; label: string; icon: React.ReactNode }[] = [
  { key: "all",          label: "All courses",       icon: <Sparkles size={13} /> },
  { key: "culture",      label: "Workplace culture", icon: <Briefcase size={13} /> },
  { key: "interview",    label: "Interview prep",    icon: <Mic size={13} /> },
  { key: "rights",       label: "Employee rights",   icon: <Scale size={13} /> },
  { key: "comms",        label: "Communication",     icon: <BookOpen size={13} /> },
  { key: "negotiation",  label: "Negotiation",       icon: <ShieldCheck size={13} /> },
];

type Course = {
  id: string; title: string; cat: Exclude<Category, "all">;
  duration: string; lessons: number; level: "intro" | "intermediate" | "advanced";
  blurb: string; covers: string[];
};

const courses: Course[] = [
  {
    id: "c1", title: "UK workplace culture — what they don't tell you",
    cat: "culture", duration: "1h 20m", lessons: 8, level: "intro",
    blurb: "Hierarchies, pub culture, how to push back politely, what 'right then' actually means.",
    covers: ["Indirect communication norms", "Pub etiquette + after-work expectations", "Email + Slack tone", "Handling disagreement without burning bridges"],
  },
  {
    id: "c2", title: "Ace the technical interview — US tech edition",
    cat: "interview", duration: "3h 10m", lessons: 14, level: "intermediate",
    blurb: "From LeetCode warm-ups to system design, with behavioral STAR-method framing tailored for international candidates.",
    covers: ["Coding round prep", "System design fundamentals", "Behavioral STAR + 'Why this country' answer", "Visa-status disclosure timing"],
  },
  {
    id: "c3", title: "Your rights as a Tier 4 / Skilled Worker employee",
    cat: "rights", duration: "55m", lessons: 6, level: "intro",
    blurb: "What your employer can and can't ask. How to switch jobs without losing your visa. Cooling-off periods.",
    covers: ["Job changes + sponsor switching", "What 'at-will' means in the US", "Unpaid wages — who to call", "Termination during sponsorship"],
  },
  {
    id: "c4", title: "Negotiating your first offer (international students)",
    cat: "negotiation", duration: "1h 45m", lessons: 9, level: "intermediate",
    blurb: "Beyond salary — relocation, sign-on, stock, visa fee coverage. How to ask without losing the offer.",
    covers: ["What to anchor on", "Visa fee + immigration lawyer coverage", "Stock vs cash trade-offs", "When to walk"],
  },
  {
    id: "c5", title: "German workplace 101 (for non-Germans)",
    cat: "culture", duration: "1h 10m", lessons: 7, level: "intro",
    blurb: "Du vs Sie, punctuality, Feierabend, why your colleagues won't ask 'how was your weekend'.",
    covers: ["Formal + informal address", "Probezeit (probation) survival", "Krankschreibung (sick note) workflow", "Holiday + Sabbatical norms"],
  },
  {
    id: "c6", title: "Mastering async communication (remote-first teams)",
    cat: "comms", duration: "1h 30m", lessons: 8, level: "intermediate",
    blurb: "Slack, Loom, async stand-ups. How to be effective when your team is in 4 timezones.",
    covers: ["Writing TL;DRs that get read", "Loom video etiquette", "Stand-up updates that don't waste people's time", "When to escalate vs wait"],
  },
  {
    id: "c7", title: "Salary negotiation Q&A drills (with playbook)",
    cat: "negotiation", duration: "2h 0m", lessons: 12, level: "advanced",
    blurb: "Live drills with common objections — 'we don't negotiate', 'budget is fixed', 'we need a yes today'.",
    covers: ["Handling 'budget is fixed'", "Multi-offer leverage", "Levelling negotiation", "Closing the conversation"],
  },
  {
    id: "c8", title: "Behavioral interview prep — STAR for international talent",
    cat: "interview", duration: "1h 25m", lessons: 7, level: "intro",
    blurb: "How to translate your home-country wins into stories that land with US/UK interviewers.",
    covers: ["What 'leadership' means abroad", "Quantifying impact when metrics weren't tracked", "Handling 'tell me about a failure' culturally", "Storytelling cadence"],
  },
];

const levelTone = {
  intro:        "!bg-leaf-500/15 !text-leaf-600",
  intermediate: "!bg-clay-500/15 !text-clay-600",
  advanced:     "!bg-amber-500/15 !text-amber-500",
};

export default function ReadinessPage() {
  const [cat, setCat] = useState<Category>("all");
  const [progress] = useState<Record<string, number>>({ c1: 100, c2: 35, c6: 60 });

  const filtered = useMemo(() => {
    return cat === "all" ? courses : courses.filter((c) => c.cat === cat);
  }, [cat]);

  const completed = Object.entries(progress).filter(([, v]) => v === 100).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/jobs" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to jobs
      </Link>

      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-ink-900">Job Readiness Courses</h1>
            <p className="text-sm text-ink-600 mt-0.5">Workplace culture, interview prep, rights, communication, negotiation.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Your progress</p>
          <p className="text-2xl font-display font-semibold text-clay-600">{completed} / {courses.length}</p>
          <p className="text-xs text-ink-500">courses completed</p>
        </div>
      </header>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              cat === c.key ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Courses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => {
          const pct = progress[c.id] ?? 0;
          return (
            <div key={c.id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className={`badge ${levelTone[c.level]} capitalize text-[10px]`}>{c.level}</span>
                {pct === 100 && <CheckCircle2 size={16} className="text-leaf-600 shrink-0" />}
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-900 mt-3 leading-snug">{c.title}</h3>
              <p className="text-sm text-ink-600 mt-2">{c.blurb}</p>

              <ul className="mt-3 space-y-1 text-xs text-ink-700">
                {c.covers.map((s) => (
                  <li key={s} className="flex items-start gap-1.5">
                    <CheckCircle2 size={11} className="text-leaf-600 mt-0.5 shrink-0" /> {s}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-ink-500">
                <span className="flex items-center gap-1"><Clock size={11} /> {c.duration}</span>
                <span>·</span>
                <span>{c.lessons} lessons</span>
              </div>

              {/* Progress */}
              {pct > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
                    <div className="h-full bg-clay-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-ink-500 mt-1">{pct}% complete</p>
                </div>
              )}

              <button className="btn-accent text-sm mt-4">
                <Play size={13} /> {pct === 0 ? "Start" : pct === 100 ? "Review" : "Resume"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-500 mt-6">
        Courses produced w/ verified mentors from McKinsey, Google, Siemens, and Imperial College.
        Free for verified students.
      </p>
    </div>
  );
}
