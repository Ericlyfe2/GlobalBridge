"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar, MapPin, TrendingUp, Filter, Search, BookmarkPlus, ShieldCheck, Loader2,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";
import { useDebounce } from "@/lib/useDebounce";

type Opp = {
  id: string;
  type: "scholarship" | "work_study" | "exchange" | "internship" | "job";
  title: string;
  description: string;
  country: string;
  institution: string | null;
  field_of_study: string | null;
  funding_amount: string | null;
  currency: string | null;
  deadline: string | null;
  sponsors_visa: boolean;
  is_verified: boolean;
};

const typeLabels: Record<Opp["type"], string> = {
  scholarship: "Scholarship",
  work_study:  "Work-Study",
  exchange:    "Exchange",
  internship:  "Internship",
  job:         "Job",
};

const typeColors: Record<Opp["type"], string> = {
  scholarship: "badge-clay",
  work_study:  "badge-sky",
  exchange:    "badge-verified",
  internship:  "badge-sky",
  job:         "badge-clay",
};

export default function OpportunitiesPage() {
  const [opps, setOpps]   = useState<Opp[] | null>(null);
  const [err, setErr]     = useState<string | null>(null);
  const [q, setQ]         = useState("");
  const [type, setType]   = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const debouncedQ = useDebounce(q, 300);

  // Load saved opportunity ids (if signed in)
  useEffect(() => {
    if (!getToken()) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/content/saved", { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok) {
          const ids = (data.saved as { item_type: string; item_id: string }[])
            .filter((s) => s.item_type === "opportunity")
            .map((s) => s.item_id);
          setSaved(new Set(ids));
        }
      } catch { /* ignore */ }
    })();
    return () => ctrl.abort();
  }, []);

  function toggleSave(id: string) {
    const isSaved = saved.has(id);
    setSaved((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(id) : next.add(id);
      return next;
    });
    if (getToken()) {
      authFetch("/api/content/saved", {
        method: isSaved ? "DELETE" : "POST",
        body: JSON.stringify({ item_type: "opportunity", item_id: id }),
      }).catch(() => {});
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (type)    params.set("type", type);
        if (country) params.set("country", country);
        if (debouncedQ) params.set("search", debouncedQ);
        const res = await fetch(`/api/opportunities?${params}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setOpps(data.opportunities);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, [debouncedQ, type, country]);

  const fmtFunding = useMemo(() => (o: Opp) => {
    if (!o.funding_amount) return "Funding details on application";
    const amt = Number(o.funding_amount).toLocaleString();
    return `${o.currency ?? ""} ${amt}`.trim();
  }, []);

  const fmtDeadline = useMemo(() => (deadline: string | null) => {
    if (!deadline) return "Rolling";
    const date = new Date(deadline);
    return Number.isNaN(date.getTime()) ? "Rolling" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-sm font-medium text-clay-600">VERIFIED OPPORTUNITIES</p>
        <h1 className="mt-1 text-4xl font-display font-semibold text-ink-900 tracking-tight">
          Scholarships, work-study & exchanges
        </h1>
        <p className="mt-2 text-ink-600">
          AI-matched to your profile. Every listing verified against official source.
        </p>
      </div>

      <div className="card !p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-10"
            placeholder="Search by title, country, field..."
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input w-auto">
          <option value="">All types</option>
          <option value="scholarship">Scholarship</option>
          <option value="internship">Internship</option>
          <option value="exchange">Exchange</option>
          <option value="work_study">Work-Study</option>
          <option value="job">Job</option>
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="input w-auto">
          <option value="">Any country</option>
          <option>Canada</option>
          <option>United Kingdom</option>
          <option>United States</option>
          <option>Germany</option>
          <option>Australia</option>
        </select>
        <button className="btn-ghost border border-cream-300">
          <Filter size={14} /> Filters
        </button>
      </div>

      {err && (
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load opportunities: {err}
        </div>
      )}

      {!opps && !err && (
        <div className="card text-center py-12 text-ink-500">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading opportunities...
        </div>
      )}

      {opps && opps.length === 0 && (
        <div className="card text-center py-12 text-ink-500">
          No opportunities match these filters. Try loosening them.
        </div>
      )}

      {opps && opps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {opps.map((o) => (
            <Link
              key={o.id}
              href={`/opportunities/${o.id}`}
              className="card group cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${typeColors[o.type] || "badge-clay"}`}>{typeLabels[o.type]}</span>
                  {o.is_verified && (
                    <span className="badge badge-verified">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  )}
                  {o.sponsors_visa && (
                    <span className="badge badge-sky">Visa sponsor</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); toggleSave(o.id); }}
                  className={`transition shrink-0 ${saved.has(o.id) ? "text-clay-600" : "text-ink-500 hover:text-clay-600"}`}
                  aria-label={saved.has(o.id) ? "Saved" : "Save"}
                >
                  <BookmarkPlus size={16} className={saved.has(o.id) ? "fill-clay-500" : ""} />
                </button>
              </div>

              <h3 className="font-display text-lg font-semibold text-ink-900 leading-tight group-hover:text-clay-700 transition">
                {o.title}
              </h3>
              {o.institution && <p className="mt-1 text-sm text-ink-600">{o.institution}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-ink-700">
                  <MapPin size={13} className="text-ink-500" /> {o.country}
                </div>
                <div className="flex items-center gap-1.5 text-ink-700">
                  <Calendar size={13} className="text-ink-500" /> {fmtDeadline(o.deadline)}
                </div>
                <div className="flex items-center gap-1.5 text-leaf-600 font-medium col-span-2">
                  <TrendingUp size={13} /> {fmtFunding(o)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-cream-200 flex justify-between items-center">
                <span className="text-xs text-ink-500">{o.field_of_study ?? "All fields"}</span>
                <span className="text-sm font-medium text-clay-600 group-hover:text-clay-700">
                  View details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
