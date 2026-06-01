"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Award, Bot, Calendar, DollarSign, GraduationCap, Search, Sparkles, ShieldCheck, Globe } from "lucide-react";
import { FlagSelect } from "@/components/FlagSelect";

type Scholarship = {
  id: string; name: string; provider: string; country: string; flag: string;
  amount: string; deadline: string; level: string[]; fields: string[];
  origins: string[]; gpaMin: number; tags: string[];
};

const pool: Scholarship[] = [
  { id: "sc_1", name: "MasterCard Foundation Scholars Program", provider: "MasterCard Foundation", country: "Multi", flag: "ca", amount: "Full ride (~$50k/yr)", deadline: "2026-09-15", level: ["Undergraduate", "Masters"], fields: ["all"],                    origins: ["GH", "NG", "KE", "RW", "UG"], gpaMin: 3.5, tags: ["full", "africa"] },
  { id: "sc_2", name: "Chevening Scholarships",                 provider: "UK Government",        country: "UK",    flag: "gb", amount: "Full tuition + £18k",   deadline: "2026-11-01", level: ["Masters"],                fields: ["all"],                    origins: ["GH", "NG", "IN", "PK", "BD"], gpaMin: 3.3, tags: ["full", "prestigious"] },
  { id: "sc_3", name: "DAAD WISE Scholarship",                  provider: "DAAD",                 country: "DE",    flag: "de", amount: "€934/mo stipend",         deadline: "2026-12-15", level: ["Undergraduate"],          fields: ["STEM", "engineering"],  origins: ["GH", "NG", "IN", "EG"],       gpaMin: 3.0, tags: ["stem", "stipend"] },
  { id: "sc_4", name: "Fulbright Foreign Student Program",      provider: "US State Dept.",       country: "US",    flag: "us", amount: "Full ride",               deadline: "2026-10-15", level: ["Masters", "PhD"],         fields: ["all"],                    origins: ["GH", "NG", "IN", "BR", "MX"], gpaMin: 3.5, tags: ["full", "prestigious"] },
  { id: "sc_5", name: "Vanier Canada Graduate Scholarship",     provider: "Canadian Govt.",       country: "CA",    flag: "ca", amount: "CAD 50,000/yr × 3",       deadline: "2026-11-01", level: ["PhD"],                    fields: ["all"],                    origins: ["any"],                        gpaMin: 3.7, tags: ["phd", "research"] },
  { id: "sc_6", name: "Erasmus Mundus Joint Masters",           provider: "EU Commission",        country: "EU",    flag: "eu", amount: "€25k/yr",                 deadline: "2026-12-31", level: ["Masters"],                fields: ["all"],                    origins: ["any"],                        gpaMin: 3.2, tags: ["full", "europe"] },
  { id: "sc_7", name: "Commonwealth Scholarships",              provider: "Commonwealth Sec.",    country: "UK",    flag: "gb", amount: "Full tuition + stipend",  deadline: "2026-10-30", level: ["Masters", "PhD"],         fields: ["all"],                    origins: ["GH", "NG", "KE", "IN", "PK", "BD"], gpaMin: 3.3, tags: ["full", "commonwealth"] },
  { id: "sc_8", name: "Australia Awards",                       provider: "Australian Govt.",     country: "AU",    flag: "au", amount: "Full ride",               deadline: "2026-04-30", level: ["Undergraduate", "Masters"], fields: ["all"],                    origins: ["GH", "NG", "BD", "VN"],       gpaMin: 3.0, tags: ["full"] },
];

export default function ScholarshipMatcher() {
  const [origin, setOrigin]   = useState("GH");
  const [level, setLevel]     = useState("Masters");
  const [field, setField]     = useState("all");
  const [gpa, setGpa]         = useState(3.6);
  const [destination, setDest] = useState<"any" | "CA" | "UK" | "US" | "DE" | "AU" | "EU">("any");
  const [q, setQ]             = useState("");

  const matches = useMemo(() => {
    return pool
      .map((s) => {
        let score = 0;
        if (s.origins.includes(origin) || s.origins.includes("any")) score += 35;
        if (s.level.includes(level)) score += 25;
        if (s.fields.includes("all") || s.fields.includes(field.toLowerCase())) score += 15;
        if (gpa >= s.gpaMin) score += 15;
        if (destination === "any" || s.country === destination || s.country === "Multi" || s.country === "EU") score += 10;
        if (q && !`${s.name} ${s.provider} ${s.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())) score = 0;
        return { s, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [origin, level, field, gpa, destination, q]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
          <Award size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            Scholarship Matcher
            <span className="badge badge-clay text-[10px]"><Bot size={10} /> AI</span>
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Fill your profile once. Get ranked matches across {pool.length}+ verified scholarships with live deadlines.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile inputs */}
        <aside className="card space-y-4 lg:sticky lg:top-20 self-start">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-clay-500" />
            <p className="text-sm font-medium text-ink-900">Your profile</p>
          </div>

          <Field label="Country of origin">
            <FlagSelect
              value={origin}
              onChange={setOrigin}
              options={[
                { value: "GH",  label: "Ghana",      flag: "gh" },
                { value: "NG",  label: "Nigeria",    flag: "ng" },
                { value: "KE",  label: "Kenya",      flag: "ke" },
                { value: "IN",  label: "India",      flag: "in" },
                { value: "PK",  label: "Pakistan",   flag: "pk" },
                { value: "BD",  label: "Bangladesh", flag: "bd" },
                { value: "any", label: "Other" },
              ]}
            />
          </Field>

          <Field label="Target level">
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="input">
              <option>Undergraduate</option>
              <option>Masters</option>
              <option>PhD</option>
            </select>
          </Field>

          <Field label="Field of study">
            <select value={field} onChange={(e) => setField(e.target.value)} className="input">
              <option value="all">Any</option>
              <option value="stem">STEM</option>
              <option value="engineering">Engineering</option>
              <option value="business">Business</option>
              <option value="arts">Arts &amp; Humanities</option>
            </select>
          </Field>

          <Field label={`GPA (4.0 scale) — ${gpa.toFixed(1)}`}>
            <input type="range" min={2.5} max={4.0} step={0.1} value={gpa} onChange={(e) => setGpa(parseFloat(e.target.value))} className="w-full accent-clay-500" />
          </Field>

          <Field label="Destination">
            <FlagSelect
              value={destination}
              onChange={(v) => setDest(v as typeof destination)}
              options={[
                { value: "any", label: "Any" },
                { value: "CA",  label: "Canada",         flag: "ca" },
                { value: "UK",  label: "United Kingdom", flag: "gb" },
                { value: "US",  label: "United States",  flag: "us" },
                { value: "DE",  label: "Germany",        flag: "de" },
                { value: "AU",  label: "Australia",      flag: "au" },
                { value: "EU",  label: "Europe (EU)",    flag: "eu" },
              ]}
            />
          </Field>

          <div className="pt-3 border-t border-cream-200 text-xs text-ink-500">
            {matches.length} scholarships match. Save your profile to get email alerts on new matches.
          </div>
        </aside>

        {/* Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Filter by name, provider, tag" />
          </div>

          {matches.length === 0 ? (
            <div className="card text-center py-10 text-sm text-ink-500">
              <Globe size={20} className="mx-auto mb-2 opacity-50" /> No matches. Loosen your filters.
            </div>
          ) : (
            matches.map(({ s, score }) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                      <Award size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-ink-900 flex items-center gap-1.5">{s.name} <ShieldCheck size={12} className="text-leaf-600" /></h3>
                      <p className="text-xs text-ink-500 mt-0.5">{s.provider}</p>
                    </div>
                  </div>
                  <MatchPill score={score} />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600 mb-3">
                  <span className="flex items-center gap-1"><span className={`fi fi-${s.flag}`} aria-hidden="true" /> {s.country}</span>
                  <span className="flex items-center gap-1"><DollarSign size={11} /> {s.amount}</span>
                  <span className="flex items-center gap-1"><Calendar size={11} /> {s.deadline}</span>
                  <span className="flex items-center gap-1"><GraduationCap size={11} /> {s.level.join(" / ")}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map((t) => <span key={t} className="badge badge-clay capitalize text-[10px]">{t}</span>)}
                  </div>
                  <Link href={`/opportunities/o_001`} className="text-sm text-clay-600 font-medium hover:underline">
                    View details →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function MatchPill({ score }: { score: number }) {
  const tone = score >= 80 ? "leaf" : score >= 50 ? "amber" : "ink";
  const cls =
    tone === "leaf"  ? "!bg-leaf-500/15 !text-leaf-600" :
    tone === "amber" ? "!bg-amber-500/15 !text-amber-500" :
                       "!bg-cream-200 !text-ink-700";
  return <span className={`badge ${cls} text-[11px] font-semibold shrink-0`}>{score}% match</span>;
}
