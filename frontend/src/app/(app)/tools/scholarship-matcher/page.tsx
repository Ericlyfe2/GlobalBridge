"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, Bot, Calendar, DollarSign, Search, Sparkles, ShieldCheck, Globe, Loader2 } from "lucide-react";
import { FlagSelect } from "@/components/FlagSelect";

type Scholarship = {
  id: string; title: string; institution: string | null; country: string;
  funding_amount: string | null; currency: string | null; deadline: string | null;
  field_of_study: string | null; eligibility: string | null;
};

const COUNTRY_NAME: Record<string, string> = {
  CA: "Canada", GB: "United Kingdom", US: "United States", DE: "Germany", AU: "Australia",
};

export default function ScholarshipMatcher() {
  const [field, setField] = useState("all");
  const [destination, setDest] = useState<"any" | "CA" | "GB" | "US" | "DE" | "AU">("any");
  const [q, setQ] = useState("");
  const [pool, setPool] = useState<Scholarship[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/opportunities?type=scholarship&limit=100", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setPool(data.opportunities as Scholarship[]);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setPool([]);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const matches = useMemo(() => {
    return (pool ?? []).filter((s) => {
      if (destination !== "any" && s.country !== COUNTRY_NAME[destination]) return false;
      if (field !== "all" && !(s.field_of_study ?? "").toLowerCase().includes(field)) return false;
      if (q && !`${s.title} ${s.institution ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [pool, field, destination, q]);

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
            Filter live scholarships from the opportunities board by field and destination.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <aside className="card space-y-4 lg:sticky lg:top-20 self-start">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-clay-500" />
            <p className="text-sm font-medium text-ink-900">Filters</p>
          </div>

          <Field label="Field of study">
            <select value={field} onChange={(e) => setField(e.target.value)} className="input">
              <option value="all">Any</option>
              <option value="stem">STEM</option>
              <option value="engineering">Engineering</option>
              <option value="business">Business</option>
              <option value="arts">Arts &amp; Humanities</option>
            </select>
          </Field>

          <Field label="Destination">
            <FlagSelect
              value={destination}
              onChange={(v) => setDest(v as typeof destination)}
              options={[
                { value: "any", label: "Any" },
                { value: "CA",  label: "Canada",         flag: "ca" },
                { value: "GB",  label: "United Kingdom", flag: "gb" },
                { value: "US",  label: "United States",  flag: "us" },
                { value: "DE",  label: "Germany",        flag: "de" },
                { value: "AU",  label: "Australia",      flag: "au" },
              ]}
            />
          </Field>

          <div className="pt-3 border-t border-cream-200 text-xs text-ink-500">
            {matches.length} scholarship{matches.length === 1 ? "" : "s"} match{matches.length === 1 ? "es" : ""}.
          </div>
        </aside>

        {/* Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Filter by name or institution" />
          </div>

          {err && (
            <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
              Couldn&apos;t load scholarships: {err}
            </div>
          )}

          {pool === null && !err && (
            <div className="card text-center py-10 text-ink-500">
              <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading scholarships...
            </div>
          )}

          {pool !== null && matches.length === 0 && (
            <div className="card text-center py-10 text-sm text-ink-500">
              <Globe size={20} className="mx-auto mb-2 opacity-50" /> No matches. Loosen your filters.
            </div>
          )}

          {matches.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <Award size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-ink-900 flex items-center gap-1.5">{s.title} <ShieldCheck size={12} className="text-leaf-600" /></h3>
                    {s.institution && <p className="text-xs text-ink-500 mt-0.5">{s.institution}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600 mb-3">
                <span className="flex items-center gap-1">{s.country}</span>
                {s.funding_amount && (
                  <span className="flex items-center gap-1"><DollarSign size={11} /> {s.currency ?? ""} {Number(s.funding_amount).toLocaleString()}</span>
                )}
                {s.deadline && <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(s.deadline).toLocaleDateString()}</span>}
              </div>

              <div className="flex items-center justify-end">
                <Link href={`/opportunities/${s.id}`} className="text-sm text-clay-600 font-medium hover:underline">
                  View details →
                </Link>
              </div>
            </div>
          ))}
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
