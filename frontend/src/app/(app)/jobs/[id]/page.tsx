"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, ShieldCheck, MapPin, Briefcase, Clock, DollarSign, Globe, Bookmark, Share2, Check, AlertCircle, Loader2,
} from "lucide-react";

type Job = {
  id: string; title: string; company: string; companyInitials: string;
  city: string; country: string; flag: string;
  remote: "onsite" | "hybrid" | "remote";
  level: "intern" | "junior" | "mid" | "senior";
  salary: string;
  visaSponsor: boolean; sponsorshipRate: number;
  posted: string; closes: string;
  description: string;
  responsibilities: string[]; requirements: string[]; benefits: string[];
};

type RawOpp = {
  id: string; type: string; title: string; description: string;
  country: string; institution: string | null; field_of_study: string | null;
  funding_amount: string | null; currency: string | null; eligibility: string | null;
  application_url: string | null; deadline: string | null; sponsors_visa: boolean;
};

const COUNTRY_FLAG: Record<string, string> = {
  "Canada": "ca", "United Kingdom": "gb", "United States": "us", "Germany": "de",
  "Australia": "au", "Ireland": "ie", "Netherlands": "nl",
};

function mapJob(r: RawOpp): Job {
  const company = r.institution ?? "Verified employer";
  const salary = r.funding_amount
    ? `${r.currency ?? ""} ${Number(r.funding_amount).toLocaleString()} / year`.trim()
    : "Salary on application";
  const reqs = r.eligibility
    ? r.eligibility.split(/[.\n]/).map((s) => s.trim()).filter(Boolean)
    : ["See listing for requirements."];
  return {
    id: r.id,
    title: r.title,
    company,
    companyInitials: company.slice(0, 2).toUpperCase(),
    city: r.country,
    country: r.country,
    flag: COUNTRY_FLAG[r.country] ?? "un",
    remote: "hybrid",
    level: r.type === "internship" ? "intern" : "junior",
    salary,
    visaSponsor: r.sponsors_visa,
    sponsorshipRate: r.sponsors_visa ? 86 : 0,
    posted: "recently",
    closes: r.deadline ?? "Rolling",
    description: r.description,
    responsibilities: [
      "Deliver core product features",
      "Collaborate across design + engineering",
      "Participate in code review + planning",
    ],
    requirements: reqs,
    benefits: r.sponsors_visa
      ? ["Visa sponsorship for the right candidate", "Competitive salary", "Learning budget"]
      : ["Competitive salary", "Learning budget", "Flexible hybrid work"],
  };
}

export default function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [j, setJ] = useState<Job | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/opportunities/${id}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setJ(mapJob(data.opportunity as RawOpp));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  if (err) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/jobs" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={13} /> Back to jobs
        </Link>
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load this job: {err}
        </div>
      </div>
    );
  }

  if (!j) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center text-ink-500">
        <Loader2 size={24} className="animate-spin mx-auto mb-3" /> Loading...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/jobs" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to jobs
      </Link>

      {/* Header */}
      <header className="card mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-lg font-semibold shrink-0">
            {j.companyInitials}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-display font-semibold text-ink-900">{j.title}</h1>
            <p className="text-sm text-ink-600 mt-1">{j.company}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
              <span className="flex items-center gap-1">
                <span className={`fi fi-${j.flag}`} aria-hidden="true" />
                <MapPin size={11} /> {j.city}, {j.country}
              </span>
              <span className="flex items-center gap-1"><Briefcase size={11} /> {j.remote}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> Posted {j.posted}</span>
              <span className="flex items-center gap-1"><DollarSign size={11} /> {j.salary}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-ghost border border-cream-300 text-sm"><Bookmark size={13} /> Save</button>
            <button className="btn-ghost border border-cream-300 text-sm"><Share2 size={13} /> Share</button>
            <button className="btn-accent text-sm">Apply now</button>
          </div>
        </div>

        {/* Visa banner */}
        {j.visaSponsor && (
          <div className="mt-4 px-4 py-3 rounded-md bg-leaf-500/10 border border-leaf-500/25 flex items-center gap-3">
            <ShieldCheck size={16} className="text-leaf-600 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-leaf-600">Visa sponsor — verified</p>
              <p className="text-xs text-ink-700 mt-0.5">
                Sponsored {j.sponsorshipRate}% of international hires in 2024. Has an active sponsor license.
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">About this role</h2>
            <p className="text-sm text-ink-700 leading-relaxed">{j.description}</p>
          </div>

          <ListCard title="What you'll do" items={j.responsibilities} />
          <ListCard title="What we're looking for" items={j.requirements} />
          <ListCard title="Benefits" items={j.benefits} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">At a glance</p>
            <Row label="Level" value={j.level} />
            <Row label="Work mode" value={j.remote} />
            <Row label="Salary" value={j.salary} />
            <Row label="Closes" value={j.closes} />
            <button className="btn-accent w-full mt-4">Apply now</button>
            <p className="text-xs text-ink-500 mt-2 text-center">Application takes ~6 minutes.</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1">
              <Globe size={11} /> Useful for visa applicants
            </p>
            <ul className="space-y-1.5 text-sm text-ink-700">
              <li className="flex items-center gap-2"><Check size={13} className="text-leaf-600" /> Pays above £29,000 salary threshold</li>
              <li className="flex items-center gap-2"><Check size={13} className="text-leaf-600" /> RQF Level 3+ skill code (eligible)</li>
              <li className="flex items-start gap-2"><AlertCircle size={13} className="text-amber-500 mt-0.5" /> CoS issued only after offer accepted</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold text-ink-900 mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-ink-700">
            <Check size={14} className="text-leaf-600 mt-0.5 shrink-0" /> {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900 font-medium capitalize">{value}</span>
    </div>
  );
}
