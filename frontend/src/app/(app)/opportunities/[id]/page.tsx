"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, ShieldCheck, Calendar, Globe, DollarSign, GraduationCap, ExternalLink, Bookmark, Share2, Check, AlertTriangle, Award, Loader2,
} from "lucide-react";

type OppType = "scholarship" | "exchange" | "fellowship" | "internship" | "work_study" | "job";

type Opportunity = {
  id: string; title: string; type: OppType;
  provider: string; country: string; flag: string;
  amount: string; deadline: string; level: string;
  verified: boolean; matchPct: number;
  description: string;
  eligibility: string[]; docs: string[];
  fields: string[]; benefits: string[];
  applyUrl: string;
};

type RawOpp = {
  id: string; type: OppType; title: string; description: string;
  country: string; institution: string | null; field_of_study: string | null;
  funding_amount: string | null; currency: string | null; eligibility: string | null;
  application_url: string | null; deadline: string | null; sponsors_visa: boolean; is_verified: boolean;
};

const COUNTRY_FLAG: Record<string, string> = {
  "Canada": "ca", "United Kingdom": "gb", "United States": "us", "Germany": "de",
  "Australia": "au", "Multi": "un", "EU": "eu", "Ireland": "ie", "Netherlands": "nl",
};

function mapOpp(r: RawOpp): Opportunity {
  const amount = r.funding_amount
    ? `${r.currency ?? ""} ${Number(r.funding_amount).toLocaleString()}`.trim()
    : "Funding details on application";
  const eligibility = r.eligibility
    ? r.eligibility.split(/[.\n]/).map((s) => s.trim()).filter(Boolean)
    : ["See provider site for full eligibility criteria."];
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    provider: r.institution ?? "GlobalBridge verified",
    country: r.country,
    flag: COUNTRY_FLAG[r.country] ?? "un",
    amount,
    deadline: r.deadline ?? "Rolling",
    level: r.field_of_study ?? "All levels",
    verified: r.is_verified,
    matchPct: 85,
    description: r.description,
    eligibility,
    docs: [
      "Completed online application",
      "Academic transcripts",
      "Valid passport",
      "Statement of purpose / motivation letter",
    ],
    fields: r.field_of_study ? [r.field_of_study] : ["All fields"],
    benefits: r.sponsors_visa
      ? ["Visa sponsorship available", "Funding as listed", "Mentorship via GlobalBridge"]
      : ["Funding as listed", "Mentorship via GlobalBridge"],
    applyUrl: r.application_url ?? "#",
  };
}

const typeLabels: Record<OppType, string> = {
  scholarship: "Scholarship",
  exchange: "Exchange program",
  fellowship: "Fellowship",
  internship: "Internship",
  work_study: "Work-Study",
  job: "Job",
};

export default function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [o, setO] = useState<Opportunity | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/opportunities/${id}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setO(mapOpp(data.opportunity as RawOpp));
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
        <Link href="/opportunities" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={13} /> Back to opportunities
        </Link>
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load this opportunity: {err}
        </div>
      </div>
    );
  }

  if (!o) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center text-ink-500">
        <Loader2 size={24} className="animate-spin mx-auto mb-3" /> Loading...
      </div>
    );
  }

  // Days till deadline
  const daysLeft = o.deadline === "Rolling"
    ? 999
    : Math.max(0, Math.ceil((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const urgent = daysLeft <= 30;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/opportunities" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to opportunities
      </Link>

      {/* Header */}
      <header className="card mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Award size={28} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-display font-semibold text-ink-900">{o.title}</h1>
              {o.verified && <span className="badge badge-verified"><ShieldCheck size={11} /> Verified</span>}
            </div>
            <p className="text-sm text-ink-600 mt-1">{o.provider}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
              <span className="badge badge-clay">{typeLabels[o.type]}</span>
              <span className="flex items-center gap-1">
                <span className={`fi fi-${o.flag}`} aria-hidden="true" /> {o.country}
              </span>
              <span className="flex items-center gap-1"><GraduationCap size={11} /> {o.level}</span>
              <span className="flex items-center gap-1"><DollarSign size={11} /> {o.amount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-ghost border border-cream-300 text-sm"><Bookmark size={13} /> Save</button>
            <button className="btn-ghost border border-cream-300 text-sm"><Share2 size={13} /> Share</button>
            <a href={o.applyUrl} target="_blank" rel="noreferrer" className="btn-accent text-sm">
              Apply <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Match + deadline banner */}
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="px-4 py-3 rounded-md bg-leaf-500/10 border border-leaf-500/25 flex items-center gap-3">
            <ShieldCheck size={16} className="text-leaf-600 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-leaf-600">{o.matchPct}% profile match</p>
              <p className="text-xs text-ink-700 mt-0.5">Based on your country, level, and field of study.</p>
            </div>
          </div>
          <div className={`px-4 py-3 rounded-md flex items-center gap-3 ${
            urgent ? "bg-red-500/10 border border-red-500/25" : "bg-cream-100 border border-cream-200"
          }`}>
            {urgent ? <AlertTriangle size={16} className="text-red-600 shrink-0" /> : <Calendar size={16} className="text-ink-500 shrink-0" />}
            <div className="flex-1 text-sm">
              <p className={`font-medium ${urgent ? "text-red-600" : "text-ink-900"}`}>
                {daysLeft} days left
              </p>
              <p className="text-xs text-ink-700 mt-0.5">Deadline: {o.deadline}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">About this opportunity</h2>
            <p className="text-sm text-ink-700 leading-relaxed">{o.description}</p>
          </div>

          <ListCard title="Eligibility" items={o.eligibility} />
          <ListCard title="What's included" items={o.benefits} />
          <ListCard title="Required documents" items={o.docs} />

          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">Eligible fields of study</h2>
            <div className="flex flex-wrap gap-2">
              {o.fields.map((f) => (
                <span key={f} className="badge badge-clay">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">At a glance</p>
            <Row label="Type" value={typeLabels[o.type]} />
            <Row label="Provider" value={o.provider} />
            <Row label="Funding" value={o.amount} />
            <Row label="Level" value={o.level} />
            <Row label="Deadline" value={o.deadline} />
            <a href={o.applyUrl} target="_blank" rel="noreferrer" className="btn-accent w-full mt-4">
              Apply on provider site <ExternalLink size={13} />
            </a>
            <p className="text-xs text-ink-500 mt-2 text-center">Opens in a new tab.</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1">
              <Globe size={11} /> Pro tips
            </p>
            <ul className="space-y-1.5 text-sm text-ink-700">
              <li className="flex items-start gap-2"><Check size={13} className="text-leaf-600 mt-0.5" /> Start references 6+ weeks early — they take longest</li>
              <li className="flex items-start gap-2"><Check size={13} className="text-leaf-600 mt-0.5" /> Use AI Assistant to draft your personal statement</li>
              <li className="flex items-start gap-2"><Check size={13} className="text-leaf-600 mt-0.5" /> Submit 2 weeks early — servers slow down at deadline</li>
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
    <div className="flex items-start justify-between py-1.5 text-sm gap-3">
      <span className="text-ink-500 shrink-0">{label}</span>
      <span className="text-ink-900 font-medium text-right">{value}</span>
    </div>
  );
}
