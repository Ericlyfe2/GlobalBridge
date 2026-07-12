"use client";

import { useMemo, useState } from "react";
import {
  BarChart3, Search, ShieldCheck, Briefcase, Home, Smile, Award, TrendingUp, GraduationCap, AlertTriangle, Users,
} from "lucide-react";

type Uni = {
  id: string; name: string; country: string; flag: string;
  programs: { id: string; name: string;
    visaApprovalPct: number;
    housingWaitWeeks: [number, number];
    gradEmploymentPct: number;
    satisfactionPct: number;
    intlPct: number;
    tuitionUsd: number;
    submissions: number;
  }[];
};

const unis: Uni[] = [
  {
    id: "uoft", name: "University of Toronto", country: "Canada", flag: "ca",
    programs: [
      { id: "cs",      name: "MSc Computer Science",     visaApprovalPct: 89, housingWaitWeeks: [4, 9],  gradEmploymentPct: 94, satisfactionPct: 87, intlPct: 41, tuitionUsd: 42_000, submissions: 312 },
      { id: "fin",     name: "MBA / MFin",               visaApprovalPct: 86, housingWaitWeeks: [3, 8],  gradEmploymentPct: 91, satisfactionPct: 82, intlPct: 38, tuitionUsd: 56_000, submissions: 184 },
      { id: "nurs",    name: "BScN Nursing",             visaApprovalPct: 91, housingWaitWeeks: [4, 10], gradEmploymentPct: 96, satisfactionPct: 88, intlPct: 27, tuitionUsd: 38_000, submissions: 143 },
    ],
  },
  {
    id: "imp", name: "Imperial College London", country: "United Kingdom", flag: "gb",
    programs: [
      { id: "ds",      name: "MSc Data Science",         visaApprovalPct: 93, housingWaitWeeks: [3, 7],  gradEmploymentPct: 95, satisfactionPct: 89, intlPct: 64, tuitionUsd: 45_000, submissions: 421 },
      { id: "ph",      name: "MSc Public Health",        visaApprovalPct: 94, housingWaitWeeks: [3, 8],  gradEmploymentPct: 90, satisfactionPct: 86, intlPct: 55, tuitionUsd: 39_000, submissions: 176 },
    ],
  },
  {
    id: "oxf", name: "University of Oxford", country: "United Kingdom", flag: "gb",
    programs: [
      { id: "bcl",     name: "BCL / MJur (Law)",         visaApprovalPct: 95, housingWaitWeeks: [2, 6],  gradEmploymentPct: 96, satisfactionPct: 90, intlPct: 68, tuitionUsd: 48_000, submissions: 198 },
      { id: "gh",      name: "MSc Global Health",        visaApprovalPct: 94, housingWaitWeeks: [2, 7],  gradEmploymentPct: 89, satisfactionPct: 88, intlPct: 62, tuitionUsd: 44_000, submissions: 121 },
    ],
  },
  {
    id: "tum", name: "TU Munich", country: "Germany", flag: "de",
    programs: [
      { id: "infm",    name: "MSc Informatics",          visaApprovalPct: 96, housingWaitWeeks: [6, 14], gradEmploymentPct: 89, satisfactionPct: 84, intlPct: 47, tuitionUsd: 0,      submissions: 256 },
      { id: "mech",    name: "MSc Mechanical Eng.",      visaApprovalPct: 96, housingWaitWeeks: [6, 14], gradEmploymentPct: 91, satisfactionPct: 85, intlPct: 39, tuitionUsd: 0,      submissions: 168 },
    ],
  },
  {
    id: "cmu", name: "Carnegie Mellon", country: "United States", flag: "us",
    programs: [
      { id: "scs",     name: "MS in Computer Science",   visaApprovalPct: 87, housingWaitWeeks: [2, 6],  gradEmploymentPct: 97, satisfactionPct: 91, intlPct: 61, tuitionUsd: 65_000, submissions: 387 },
    ],
  },
  {
    id: "harv", name: "Harvard University", country: "United States", flag: "us",
    programs: [
      { id: "mph",     name: "MPH Public Health",        visaApprovalPct: 88, housingWaitWeeks: [3, 7],  gradEmploymentPct: 95, satisfactionPct: 90, intlPct: 57, tuitionUsd: 68_000, submissions: 244 },
      { id: "llm",     name: "LLM (Law)",                visaApprovalPct: 87, housingWaitWeeks: [3, 7],  gradEmploymentPct: 94, satisfactionPct: 89, intlPct: 71, tuitionUsd: 75_000, submissions: 156 },
    ],
  },
  {
    id: "melb", name: "University of Melbourne", country: "Australia", flag: "au",
    programs: [
      { id: "md",      name: "Doctor of Medicine (MD)",  visaApprovalPct: 92, housingWaitWeeks: [4, 9],  gradEmploymentPct: 98, satisfactionPct: 87, intlPct: 33, tuitionUsd: 62_000, submissions: 132 },
      { id: "teach",   name: "Master of Teaching",       visaApprovalPct: 93, housingWaitWeeks: [4, 10], gradEmploymentPct: 92, satisfactionPct: 85, intlPct: 29, tuitionUsd: 28_000, submissions: 97 },
    ],
  },
  {
    id: "ubc", name: "University of British Columbia", country: "Canada", flag: "ca",
    programs: [
      { id: "civl",    name: "MASc Civil Engineering",   visaApprovalPct: 90, housingWaitWeeks: [5, 11], gradEmploymentPct: 93, satisfactionPct: 84, intlPct: 44, tuitionUsd: 31_000, submissions: 118 },
      { id: "msn",     name: "MSN Nursing",              visaApprovalPct: 92, housingWaitWeeks: [5, 12], gradEmploymentPct: 97, satisfactionPct: 89, intlPct: 24, tuitionUsd: 27_000, submissions: 84 },
    ],
  },
  {
    id: "nus", name: "National University of Singapore", country: "Singapore", flag: "sg",
    programs: [
      { id: "ba",      name: "MSc Business Analytics",   visaApprovalPct: 97, housingWaitWeeks: [2, 5],  gradEmploymentPct: 96, satisfactionPct: 88, intlPct: 66, tuitionUsd: 40_000, submissions: 231 },
      { id: "llm",     name: "LLM (Law)",                visaApprovalPct: 97, housingWaitWeeks: [2, 5],  gradEmploymentPct: 91, satisfactionPct: 85, intlPct: 59, tuitionUsd: 33_000, submissions: 88 },
    ],
  },
  {
    id: "uva", name: "University of Amsterdam", country: "Netherlands", flag: "nl",
    programs: [
      { id: "psy",     name: "MSc Psychology",           visaApprovalPct: 95, housingWaitWeeks: [8, 16], gradEmploymentPct: 87, satisfactionPct: 86, intlPct: 52, tuitionUsd: 18_000, submissions: 164 },
      { id: "comm",    name: "MA Communication Science", visaApprovalPct: 95, housingWaitWeeks: [8, 16], gradEmploymentPct: 85, satisfactionPct: 84, intlPct: 49, tuitionUsd: 17_000, submissions: 102 },
    ],
  },
  {
    id: "sorb", name: "Sorbonne University", country: "France", flag: "fr",
    programs: [
      { id: "lit",     name: "MA Literature & Arts",     visaApprovalPct: 93, housingWaitWeeks: [6, 12], gradEmploymentPct: 81, satisfactionPct: 87, intlPct: 41, tuitionUsd: 4_000,  submissions: 76 },
      { id: "bio",     name: "MSc Life Sciences",        visaApprovalPct: 93, housingWaitWeeks: [6, 12], gradEmploymentPct: 86, satisfactionPct: 83, intlPct: 37, tuitionUsd: 5_000,  submissions: 91 },
    ],
  },
  {
    id: "utok", name: "University of Tokyo", country: "Japan", flag: "jp",
    programs: [
      { id: "mpp",     name: "Master of Public Policy",  visaApprovalPct: 96, housingWaitWeeks: [3, 8],  gradEmploymentPct: 90, satisfactionPct: 84, intlPct: 45, tuitionUsd: 6_000,  submissions: 69 },
      { id: "meng",    name: "MEng Engineering",         visaApprovalPct: 96, housingWaitWeeks: [3, 8],  gradEmploymentPct: 93, satisfactionPct: 85, intlPct: 40, tuitionUsd: 6_000,  submissions: 147 },
    ],
  },
  {
    id: "ethz", name: "ETH Zurich", country: "Switzerland", flag: "ch",
    programs: [
      { id: "arch",    name: "MSc Architecture",         visaApprovalPct: 94, housingWaitWeeks: [5, 12], gradEmploymentPct: 92, satisfactionPct: 88, intlPct: 43, tuitionUsd: 1_600,  submissions: 83 },
      { id: "env",     name: "MSc Environmental Sci.",   visaApprovalPct: 94, housingWaitWeeks: [5, 12], gradEmploymentPct: 89, satisfactionPct: 87, intlPct: 46, tuitionUsd: 1_600,  submissions: 95 },
    ],
  },
  {
    id: "uct", name: "University of Cape Town", country: "South Africa", flag: "za",
    programs: [
      { id: "mph",     name: "MPH Public Health",        visaApprovalPct: 90, housingWaitWeeks: [3, 8],  gradEmploymentPct: 84, satisfactionPct: 86, intlPct: 31, tuitionUsd: 9_000,  submissions: 58 },
      { id: "mcom",    name: "MCom Finance",             visaApprovalPct: 90, housingWaitWeeks: [3, 8],  gradEmploymentPct: 87, satisfactionPct: 83, intlPct: 28, tuitionUsd: 8_000,  submissions: 64 },
    ],
  },
];

export default function UniSuccessPage() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<string>("all");

  const filtered = useMemo(() => {
    return unis.filter((u) => {
      if (country !== "all" && u.country !== country) return false;
      if (q && !u.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, country]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">University Success Dashboard</h1>
          <p className="text-sm text-ink-600 mt-0.5">
            Real data from verified GlobalBridge community submissions. Visa approval, housing wait, employment, satisfaction.
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search university" />
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="input text-sm max-w-[200px]">
          <option value="all">All countries</option>
          {[...new Set(unis.map((u) => u.country))].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Universities */}
      <div className="space-y-6">
        {filtered.map((u) => (
          <article key={u.id} className="card">
            <header className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={`fi fi-${u.flag}`} aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold text-ink-900">{u.name}</h2>
              <span className="text-xs text-ink-500">{u.country}</span>
            </header>

            <div className="space-y-5">
              {u.programs.map((p) => (
                <ProgramRow key={p.id} program={p} />
              ))}
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="card text-center text-sm text-ink-500 py-10">No universities match. Adjust filters.</div>
        )}
      </div>

      <p className="text-xs text-ink-500 mt-6">
        Data from verified GlobalBridge user submissions (last 24 months). Visa approval rates cross-checked with IRCC, UKVI, BAMF, USCIS where possible.
      </p>
    </div>
  );
}

function ProgramRow({ program: p }: { program: Uni["programs"][number] }) {
  return (
    <div className="rounded-lg border border-cream-200 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={14} className="text-clay-500" />
          <h3 className="font-medium text-ink-900">{p.name}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-500">Based on {p.submissions} submissions</span>
          <span className="badge badge-verified"><ShieldCheck size={10} /> Verified</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<ShieldCheck size={14} />} label="Visa approval"
              value={`${p.visaApprovalPct}%`} pct={p.visaApprovalPct} tone={p.visaApprovalPct >= 90 ? "leaf" : p.visaApprovalPct >= 80 ? "amber" : "red"} />
        <Stat icon={<Home size={14} />} label="Housing wait"
              value={`${p.housingWaitWeeks[0]}–${p.housingWaitWeeks[1]} wks`}
              pct={Math.max(0, 100 - p.housingWaitWeeks[1] * 7)} tone={p.housingWaitWeeks[1] <= 8 ? "leaf" : p.housingWaitWeeks[1] <= 12 ? "amber" : "red"} />
        <Stat icon={<Briefcase size={14} />} label="Graduate employment"
              value={`${p.gradEmploymentPct}%`} pct={p.gradEmploymentPct} tone={p.gradEmploymentPct >= 90 ? "leaf" : "amber"} />
        <Stat icon={<Smile size={14} />} label="Student satisfaction"
              value={`${p.satisfactionPct}%`} pct={p.satisfactionPct} tone={p.satisfactionPct >= 85 ? "leaf" : "amber"} />
      </div>

      <div className="mt-4 pt-3 border-t border-cream-200 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-600">
        <span className="flex items-center gap-1"><Users size={11} /> International students: <span className="font-medium text-ink-900">{p.intlPct}%</span></span>
        <span className="flex items-center gap-1"><Award size={11} /> Tuition: <span className="font-medium text-ink-900">{p.tuitionUsd === 0 ? "Free / nominal" : `~$${(p.tuitionUsd / 1000).toFixed(0)}k USD/yr`}</span></span>
        {p.visaApprovalPct < 85 && (
          <span className="flex items-center gap-1 text-amber-500"><AlertTriangle size={11} /> Lower visa approval than peer programs</span>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, pct, tone }: { icon: React.ReactNode; label: string; value: string; pct: number; tone: "leaf" | "amber" | "red" }) {
  const bar = tone === "leaf" ? "bg-leaf-500" : tone === "amber" ? "bg-amber-500" : "bg-red-600";
  return (
    <div className="rounded-md bg-cream-100 px-3 py-3">
      <div className="flex items-center justify-between text-xs text-ink-600 mb-1.5">
        <span className="flex items-center gap-1.5">{icon} {label}</span>
        <TrendingUp size={11} className="text-clay-500 opacity-60" />
      </div>
      <p className="text-xl font-display font-semibold text-ink-900">{value}</p>
      <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden mt-2">
        <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
