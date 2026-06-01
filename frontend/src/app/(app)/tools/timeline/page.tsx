"use client";

import { useMemo, useState } from "react";
import {
  Calendar, FileText, GraduationCap, Plane, Home, Banknote, Stethoscope, Sparkles, CheckCircle2, AlertTriangle,
} from "lucide-react";

type Milestone = {
  id: string; label: string; daysBefore: number; icon: React.ReactNode; tone: string;
  detail: string;
};

const milestones: Milestone[] = [
  { id: "m1", label: "Standardized tests (IELTS / GRE)",      daysBefore: 180, icon: <GraduationCap size={14} />, tone: "clay",  detail: "Book test 8+ weeks before. Results stay valid for 2 years." },
  { id: "m2", label: "University applications",                daysBefore: 150, icon: <FileText size={14} />,      tone: "clay",  detail: "Most deadlines fall 6 months before intake. Apply to 5-8 schools." },
  { id: "m3", label: "Letters of recommendation",              daysBefore: 140, icon: <FileText size={14} />,      tone: "clay",  detail: "Give referees 4+ weeks. Send polite follow-ups." },
  { id: "m4", label: "Receive admission decisions",            daysBefore: 100, icon: <CheckCircle2 size={14} />,  tone: "leaf",  detail: "Compare offers. Reply to your top choice within their deadline (often 30 days)." },
  { id: "m5", label: "Proof of funds / financial guarantee",   daysBefore: 90,  icon: <Banknote size={14} />,      tone: "amber", detail: "GIC for Canada, blocked account for Germany, bank letter for UK/US." },
  { id: "m6", label: "Visa application",                       daysBefore: 75,  icon: <FileText size={14} />,      tone: "amber", detail: "Submit ASAP after admission letter. Processing: 4-12 weeks." },
  { id: "m7", label: "Biometrics appointment",                 daysBefore: 70,  icon: <FileText size={14} />,      tone: "amber", detail: "Book at VAC / VFS. Bring passport + receipt." },
  { id: "m8", label: "Health insurance enrolment",             daysBefore: 60,  icon: <Stethoscope size={14} />,   tone: "sky",   detail: "Mandatory before arrival in DE, UK (IHS paid w/ visa), AU (OSHC)." },
  { id: "m9", label: "Housing secured",                        daysBefore: 45,  icon: <Home size={14} />,          tone: "sky",   detail: "Use the verified marketplace. Aim for 6 weeks before arrival." },
  { id: "m10", label: "Flight + travel insurance",             daysBefore: 30,  icon: <Plane size={14} />,         tone: "sky",   detail: "Book once visa is approved. Travel insurance covers gap before local health enrols." },
  { id: "m11", label: "Currency & opening bank account",       daysBefore: 21,  icon: <Banknote size={14} />,      tone: "sky",   detail: "Bring 2-4 weeks of cash. Open account online from origin if possible." },
  { id: "m12", label: "Pre-departure orientation",             daysBefore: 14,  icon: <Sparkles size={14} />,      tone: "leaf",  detail: "University usually hosts virtual session. Join the country WhatsApp group." },
  { id: "m13", label: "Arrival + local registration",          daysBefore: 0,   icon: <Plane size={14} />,         tone: "leaf",  detail: "Anmeldung (DE), GP registration (UK), SIN (CA), SSN (US) — first 2 weeks." },
];

const toneClasses: Record<string, string> = {
  clay:  "bg-clay-500/15 text-clay-600",
  amber: "bg-amber-500/15 text-amber-500",
  leaf:  "bg-leaf-500/15 text-leaf-600",
  sky:   "bg-sky-500/15 text-sky-600",
};

export default function TimelinePage() {
  const [arrival, setArrival] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 8); // ~8 months from now
    return d.toISOString().slice(0, 10);
  });
  const [done, setDone] = useState<Set<string>>(new Set(["m1"]));

  function toggle(id: string) {
    setDone((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const items = useMemo(() => {
    const arrivalMs = new Date(arrival).getTime();
    return milestones.map((m) => {
      const target = new Date(arrivalMs - m.daysBefore * 86400000);
      const targetDate = target.toISOString().slice(0, 10);
      const daysLeft = Math.ceil((target.getTime() - Date.now()) / 86400000);
      return { ...m, targetDate, daysLeft };
    });
  }, [arrival]);

  const completed = done.size;
  const progress = Math.round((completed / milestones.length) * 100);

  const next = items.find((i) => !done.has(i.id) && i.daysLeft >= 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <Calendar size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Application Timeline Planner</h1>
          <p className="text-sm text-ink-600 mt-1">
            Pick your arrival date. We work backwards through every milestone — from tests to Anmeldung.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar — date picker + progress */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="card">
            <label className="block mb-3">
              <span className="block text-xs font-medium text-ink-600 mb-1.5">Target arrival date</span>
              <input type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} className="input" />
            </label>
            <p className="text-xs text-ink-500">
              Most students arrive 7-14 days before classes start.
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-ink-700">Progress</p>
              <span className="text-sm font-semibold text-clay-600">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
              <div className="h-full bg-clay-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-ink-500 mt-2">{completed} of {milestones.length} milestones done</p>
          </div>

          {next && (
            <div className="card border-clay-300">
              <p className="text-xs font-semibold uppercase tracking-wider text-clay-600 mb-2 flex items-center gap-1">
                <AlertTriangle size={11} /> Up next
              </p>
              <p className="text-sm font-medium text-ink-900">{next.label}</p>
              <p className="text-xs text-ink-500 mt-1">By {next.targetDate} ({next.daysLeft} days)</p>
            </div>
          )}
        </aside>

        {/* Timeline */}
        <div className="lg:col-span-2 relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-cream-200" />

          <ul className="space-y-3">
            {items.map((m) => {
              const isDone = done.has(m.id);
              const isPast = m.daysLeft < 0;
              return (
                <li key={m.id} className="relative pl-12">
                  <button
                    onClick={() => toggle(m.id)}
                    aria-label={`Mark ${m.label} as done`}
                    className={`absolute left-0 top-2 w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 ${
                      isDone ? "bg-leaf-500 text-white" : isPast ? "bg-red-500/15 text-red-600" : toneClasses[m.tone]
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={16} /> : m.icon}
                  </button>

                  <div className={`card ${isDone ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className={`font-medium text-ink-900 ${isDone ? "line-through" : ""}`}>{m.label}</p>
                        <p className="text-xs text-ink-500 mt-0.5">{m.detail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-clay-600">{m.targetDate}</p>
                        <p className={`text-[10px] ${m.daysLeft < 0 ? "text-red-600" : "text-ink-500"}`}>
                          {m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d ago` : `in ${m.daysLeft}d`}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-ink-500 mt-6 text-center">
            We&apos;ll email you reminders 7 days + 24 hours before each milestone. Toggle in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
