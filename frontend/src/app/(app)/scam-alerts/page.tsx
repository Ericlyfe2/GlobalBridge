"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, Shield, Flag, Search, ArrowUp, ShieldCheck, Bot, Loader2, X,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type Severity = "high" | "med" | "low";
type Kind = "visa" | "housing" | "job" | "scholarship" | "phishing";

const kindLabels: Record<Kind, string> = {
  visa: "Visa / immigration",
  housing: "Housing rental",
  job: "Job / internship",
  scholarship: "Scholarship",
  phishing: "Phishing / link",
};

type Alert = {
  id: string; title: string; kind: Kind; severity: Severity;
  countries: string[]; flags: string[];
  posted: string; reporters: number; upvotes: number; verified: boolean; aiFlagged: boolean;
  body: string; signals: string[]; what_to_do: string[];
};

const sevTone: Record<Severity, string> = {
  high: "border-red-300 dark:border-red-900/40",
  med:  "border-amber-300 dark:border-amber-900/40",
  low:  "",
};

const sevBadge: Record<Severity, string> = {
  high: "!bg-red-500/15 !text-red-600",
  med:  "!bg-amber-500/15 !text-amber-500",
  low:  "!bg-cream-200 !text-ink-700",
};

type RawAlert = {
  id: string;
  title: string;
  description: string;
  scam_type: string | null;
  affected_countries: string[] | null;
  upvotes: number;
  verified_by_admin: boolean;
  created_at: string;
};

function relativeTime(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const KIND_MAP: Record<string, Kind> = {
  visa: "visa",
  housing: "housing",
  job: "job",
  scholarship: "scholarship",
  phishing: "phishing",
};

const COUNTRY_FLAG: Record<string, string> = {
  "Ghana": "gh", "Nigeria": "ng", "Kenya": "ke",
  "United Kingdom": "gb", "Canada": "ca", "United States": "us",
  "Germany": "de", "India": "in", "Pakistan": "pk",
  "Bangladesh": "bd", "Mexico": "mx", "Philippines": "ph",
  "Australia": "au",
};

function mapAlert(raw: RawAlert): Alert {
  const kind: Kind = KIND_MAP[(raw.scam_type ?? "").toLowerCase()] ?? "phishing";
  const sev: Severity = raw.upvotes >= 50 ? "high" : raw.upvotes >= 15 ? "med" : "low";
  const countries = raw.affected_countries ?? [];
  return {
    id: raw.id,
    title: raw.title,
    body: raw.description,
    kind,
    severity: sev,
    countries,
    flags: countries.map((c) => COUNTRY_FLAG[c] ?? "un").filter(Boolean),
    posted: relativeTime(raw.created_at),
    reporters: 1,
    upvotes: raw.upvotes,
    verified: raw.verified_by_admin,
    aiFlagged: false,
    signals: [],
    what_to_do: [],
  };
}

export default function ScamAlertsPage() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/moderation/scam-alerts", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setAlerts((data.alerts as RawAlert[]).map(mapAlert));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setAlerts([]);
      }
    })();
    return () => ctrl.abort();
  }, [refreshKey]);

  const list = alerts ?? [];
  const filtered = list.filter((a) => {
    if (kind !== "all" && a.kind !== kind) return false;
    if (q && !`${a.title} ${a.body}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="badge !bg-red-500/15 !text-red-600 mb-3 inline-flex items-center gap-1">
            <AlertTriangle size={11} /> Live feed
          </span>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Scam & Fraud Alerts</h1>
          <p className="text-sm text-ink-600 mt-1">
            Community-reported + AI-flagged. Upvote to help others. Report new scams from any listing or DM.
          </p>
          {err && (
            <p className="text-xs text-amber-500 mt-2">
              Live feed unavailable ({err}).
            </p>
          )}
        </div>
        <button onClick={() => setReportOpen(true)} className="btn-accent text-sm"><Flag size={14} /> Report a scam</button>
      </header>

      {reportOpen && (
        <ReportScamModal onClose={() => setReportOpen(false)} onPosted={() => { setReportOpen(false); setRefreshKey((k) => k + 1); }} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search scams" />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind | "all")} className="input text-sm max-w-[200px]">
          <option value="all">All categories</option>
          {(Object.keys(kindLabels) as Kind[]).map((k) => (
            <option key={k} value={k}>{kindLabels[k]}</option>
          ))}
        </select>
      </div>

      {alerts === null && (
        <div className="card text-center py-10 text-ink-500 mb-4">
          <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading alerts...
        </div>
      )}

      {/* Feed */}
      <ul className="space-y-4">
        {filtered.map((a) => (
          <li key={a.id}>
            <article className={`card ${sevTone[a.severity]}`}>
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  a.severity === "high" ? "bg-red-500/15 text-red-600" :
                  a.severity === "med"  ? "bg-amber-500/15 text-amber-500" :
                  "bg-cream-200 text-ink-600"
                }`}>
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="font-medium text-ink-900 leading-snug">{a.title}</h2>
                    <span className={`badge ${sevBadge[a.severity]} capitalize`}>{a.severity}</span>
                    <span className="badge badge-clay">{kindLabels[a.kind]}</span>
                    {a.verified && <span className="badge badge-verified"><ShieldCheck size={11} /> Verified</span>}
                    {a.aiFlagged && <span className="badge !bg-clay-500/15 !text-clay-600"><Bot size={11} /> AI-flagged</span>}
                  </div>
                  <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span>Posted {a.posted}</span>
                    <span>·</span>
                    <span>{a.reporters} {a.reporters === 1 ? "reporter" : "reporters"}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      {a.flags.map((f) => <span key={f} className={`fi fi-${f}`} aria-hidden="true" />)}
                      {a.countries.join(", ")}
                    </span>
                  </div>
                </div>
                <button className="flex flex-col items-center text-xs text-ink-500 hover:text-clay-600 shrink-0 px-2 py-1 rounded-md hover:bg-cream-100">
                  <ArrowUp size={14} className="text-clay-500" />
                  <span className="font-semibold text-ink-900">{a.upvotes}</span>
                </button>
              </div>

              <p className="text-sm text-ink-700 leading-relaxed">{a.body}</p>

              {/* Two-column: signals + what to do (only for entries that have them) */}
              {(a.signals.length > 0 || a.what_to_do.length > 0) && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {a.signals.length > 0 && (
                    <div className="rounded-md bg-red-500/5 border border-red-500/15 px-3 py-2.5">
                      <p className="font-semibold text-xs text-red-600 mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Red flags</p>
                      <ul className="text-xs text-ink-700 space-y-1">
                        {a.signals.map((s) => <li key={s}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {a.what_to_do.length > 0 && (
                    <div className="rounded-md bg-leaf-500/5 border border-leaf-500/15 px-3 py-2.5">
                      <p className="font-semibold text-xs text-leaf-600 mb-1.5 flex items-center gap-1"><Shield size={11} /> What to do</p>
                      <ul className="text-xs text-ink-700 space-y-1">
                        {a.what_to_do.map((s) => <li key={s}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          </li>
        ))}

        {alerts !== null && filtered.length === 0 && (
          <li className="card text-center text-sm text-ink-500 py-10">
            <Shield size={20} className="mx-auto mb-2 opacity-50" /> No scams reported yet.
          </li>
        )}
      </ul>

      <p className="text-xs text-ink-500 mt-6 text-center">
        Not sure if something is a scam? Paste it into{" "}
        <a href="/tools/scam-shield" className="text-clay-600 font-medium hover:underline">Scam Shield</a>{" "}
        for an instant AI check.
      </p>
    </div>
  );
}

function ReportScamModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scamType, setScamType] = useState<Kind>("visa");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!getToken()) { setErr("Sign in to report a scam."); return; }
    setSending(true);
    setErr(null);
    try {
      const res = await authFetch("/api/moderation/scam-alerts", {
        method: "POST",
        body: JSON.stringify({ title, description, scam_type: scamType }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Couldn't submit report");
      onPosted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't submit report");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="card w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
            <Flag size={16} className="text-red-600" /> Report a scam
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-cream-200"><X size={16} /></button>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">Category</span>
          <select value={scamType} onChange={(e) => setScamType(e.target.value as Kind)} className="input">
            {(Object.keys(kindLabels) as Kind[]).map((k) => <option key={k} value={k}>{kindLabels[k]}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Short summary of the scam" minLength={5} maxLength={200} required />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">What happened</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[140px]" placeholder="Include URLs, usernames, or screenshots if you have them" minLength={20} maxLength={5000} required />
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost border border-cream-300 text-sm">Cancel</button>
          <button type="submit" disabled={sending} className="btn-accent text-sm disabled:opacity-50">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Submitting...</> : "Submit report"}
          </button>
        </div>
      </form>
    </div>
  );
}
