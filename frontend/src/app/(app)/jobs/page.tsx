"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Briefcase, MapPin, ShieldCheck, DollarSign, Search, Filter, Loader2 } from "lucide-react";
import { SaveButton } from "@/components/SaveButton";
import { useDebounce } from "@/lib/useDebounce";

type Job = {
  id: string;
  type: "scholarship" | "work_study" | "exchange" | "internship" | "job";
  title: string;
  description: string;
  country: string;
  institution: string | null;
  funding_amount: string | null;
  currency: string | null;
  sponsors_visa: boolean;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const [q, setQ]       = useState("");
  const [sponsorOnly, setSponsorOnly] = useState(true);
  const [type, setType] = useState<"job" | "internship" | "all">("all");
  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedQ) params.set("search", debouncedQ);
        // Backend filters one type at a time; for "all jobs+internships" we ask for both separately.
        const fetchType = async (t: "job" | "internship") => {
          const p = new URLSearchParams(params);
          p.set("type", t);
          const res = await fetch(`/api/opportunities?${p}`, { signal: ctrl.signal });
          const data = await res.json();
          return (data.opportunities ?? []) as Job[];
        };
        let list: Job[];
        if (type === "all") {
          const [a, b] = await Promise.all([fetchType("job"), fetchType("internship")]);
          list = [...a, ...b];
        } else {
          list = await fetchType(type);
        }
        if (sponsorOnly) list = list.filter((j) => j.sponsors_visa);
        setJobs(list);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, [debouncedQ, sponsorOnly, type]);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-sm font-medium text-clay-600">VISA-SPONSOR FRIENDLY</p>
        <h1 className="mt-1 text-4xl font-display font-semibold text-ink-900 tracking-tight">
          Jobs & internships
        </h1>
        <p className="mt-2 text-ink-600 max-w-2xl">
          Filter by employers who actually sponsor visas for international students.
        </p>
      </div>

      <div className="card !p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-10"
            placeholder="Role, company, skill..."
          />
        </div>
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-cream-300 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={sponsorOnly}
            onChange={(e) => setSponsorOnly(e.target.checked)}
            className="accent-clay-500"
          />
          Visa sponsors only
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="input w-auto"
        >
          <option value="all">All types</option>
          <option value="job">Full-time</option>
          <option value="internship">Internship</option>
        </select>
        <button className="btn-ghost border border-cream-300">
          <Filter size={14} /> Filters
        </button>
      </div>

      {err && (
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load jobs: {err}
        </div>
      )}

      {!jobs && !err && (
        <div className="card text-center py-12 text-ink-500">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading jobs...
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="card text-center py-12 text-ink-500">
          No jobs match these filters. {sponsorOnly && "Try unchecking 'Visa sponsors only'."}
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((j) => {
            const initials = (j.institution ?? j.title).slice(0, 2).toUpperCase();
            const salary = j.funding_amount
              ? `${j.currency ?? ""} ${Number(j.funding_amount).toLocaleString()}`.trim()
              : "Salary on application";
            return (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="card flex items-center gap-5 cursor-pointer block"
              >
                <div className="w-12 h-12 rounded-lg bg-cream-200 flex items-center justify-center text-ink-700 font-medium shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-ink-900">{j.title}</h3>
                    {j.sponsors_visa && (
                      <span className="badge badge-verified">
                        <ShieldCheck size={10} /> Sponsors visa
                      </span>
                    )}
                  </div>
                  {j.institution && <p className="text-sm text-ink-600">{j.institution}</p>}
                  <div className="mt-2 flex items-center gap-4 text-xs text-ink-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {j.country}</span>
                    <span className="flex items-center gap-1 capitalize"><Briefcase size={11} /> {j.type.replace("_", " ")}</span>
                    <span className="flex items-center gap-1 text-leaf-600 font-medium"><DollarSign size={11} /> {salary}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SaveButton type="job" id={j.id} />
                  <span className="btn-accent text-sm">Apply</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
