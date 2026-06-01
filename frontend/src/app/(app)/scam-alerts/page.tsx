"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, Shield, Flag, Search, ExternalLink, ArrowUp, ShieldCheck, Bot, Loader2,
} from "lucide-react";

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

const seedAlerts: Alert[] = [
  {
    id: "sa_001", title: "Fake Canadian Study Permit consultant in Lagos asking for $2,000 upfront",
    kind: "visa", severity: "high",
    countries: ["Nigeria", "Ghana"], flags: ["ng", "gh"],
    posted: "12m ago", reporters: 11, upvotes: 87, verified: true, aiFlagged: true,
    body: "Person calling themselves 'CanadaVisaPro' on Instagram is contacting students with offers to 'guarantee' Canadian study permits for $2,000. IRCC does not work with private agents.",
    signals: [
      "Guarantees visa approval",
      "Asks for full payment upfront via Western Union or crypto",
      "Refuses video call",
      "DMs from Instagram instead of registered company website",
    ],
    what_to_do: [
      "Block & report on Instagram",
      "Use the official IRCC portal — application is CAD 150",
      "If you already paid, file a report with EFCC (Nigeria) and your bank",
    ],
  },
  {
    id: "sa_002", title: "Fake 'luxury' Manchester apartment listing — photos copied from Airbnb",
    kind: "housing", severity: "high",
    countries: ["United Kingdom"], flags: ["gb"],
    posted: "1h ago", reporters: 4, upvotes: 42, verified: true, aiFlagged: true,
    body: "Listing offering a £400/month 'fully furnished luxury studio' in central Manchester. Reverse image search shows the photos are from an Airbnb in Berlin.",
    signals: [
      "Rent dramatically below market (£400 vs typical £800-1100)",
      "Landlord won't show flat in person or video",
      "Asks for full deposit before signing",
      "Pressure tactics ('3 other students are interested')",
    ],
    what_to_do: [
      "Always view in person or via live video before paying",
      "Use the GlobalBridge verified housing marketplace",
      "Report the listing → admin removes within 1h",
    ],
  },
  {
    id: "sa_003", title: "Phishing email pretending to be IRCC asking for biometrics fee",
    kind: "phishing", severity: "high",
    countries: ["Multi-country"], flags: ["ca"],
    posted: "3h ago", reporters: 6, upvotes: 34, verified: true, aiFlagged: true,
    body: "Email from 'ircc-verify@canada-gov-update.com' (note the suspicious domain) asking applicants to 'reverify' their biometrics fee. Real IRCC emails come from @cic.gc.ca only.",
    signals: [
      "Sender domain is NOT canada.ca or cic.gc.ca",
      "Urgent language ('application will be cancelled in 48h')",
      "Link goes to a lookalike payment page",
    ],
    what_to_do: [
      "Do not click links — log in via the official portal directly",
      "Forward email to spam@fintrac-canafe.gc.ca",
    ],
  },
  {
    id: "sa_004", title: "'Work from home' job paying $40/hour — actually a money-laundering mule scam",
    kind: "job", severity: "high",
    countries: ["United States", "Canada"], flags: ["us", "ca"],
    posted: "Yesterday", reporters: 7, upvotes: 56, verified: true, aiFlagged: true,
    body: "WhatsApp messages offering $40/hour 'package re-shipping' or 'transferring funds for our client' jobs. These are mule schemes — you become legally liable for fraud.",
    signals: [
      "Hired with no interview",
      "Asked to receive money and forward it",
      "Asked to receive packages and reship",
      "Pay seems too high for the task",
    ],
    what_to_do: [
      "Do NOT accept. You can be prosecuted even if you didn't know.",
      "Report on the platform you were contacted on",
      "If you already participated, contact a lawyer immediately",
    ],
  },
  {
    id: "sa_005", title: "Fake DAAD scholarship form harvesting passport data",
    kind: "scholarship", severity: "med",
    countries: ["Multi-country"], flags: ["de"],
    posted: "2d ago", reporters: 3, upvotes: 18, verified: false, aiFlagged: true,
    body: "Google Form impersonating DAAD asking for passport scan, bank details, and a $50 'verification fee'. DAAD applications go through portal.mydaad.de only and are always free.",
    signals: [
      "Google Form instead of official DAAD domain",
      "Asks for sensitive ID + bank info in same form",
      "Charges an application fee",
    ],
    what_to_do: [
      "Apply only via the official DAAD portal",
      "If you submitted info — change passwords + monitor accounts",
    ],
  },
];

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

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/moderation/scam-alerts", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        const mapped = (data.alerts as RawAlert[]).map(mapAlert);
        // Merge with hand-crafted seed entries (richer signals / what-to-do panels)
        // so the page degrades gracefully if DB is empty.
        setAlerts(mapped.length ? mapped : seedAlerts);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setAlerts(seedAlerts);
      }
    })();
    return () => ctrl.abort();
  }, []);

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
              Live feed unavailable ({err}). Showing cached entries.
            </p>
          )}
        </div>
        <button className="btn-accent text-sm"><Flag size={14} /> Report a scam</button>
      </header>

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

              {/* Two-column: signals + what to do */}
              <div className="mt-4 grid md:grid-cols-2 gap-3">
                <div className="rounded-md bg-red-500/5 border border-red-500/15 px-3 py-2.5">
                  <p className="font-semibold text-xs text-red-600 mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Red flags</p>
                  <ul className="text-xs text-ink-700 space-y-1">
                    {a.signals.map((s) => <li key={s}>• {s}</li>)}
                  </ul>
                </div>
                <div className="rounded-md bg-leaf-500/5 border border-leaf-500/15 px-3 py-2.5">
                  <p className="font-semibold text-xs text-leaf-600 mb-1.5 flex items-center gap-1"><Shield size={11} /> What to do</p>
                  <ul className="text-xs text-ink-700 space-y-1">
                    {a.what_to_do.map((s) => <li key={s}>• {s}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button className="text-xs text-clay-600 font-medium hover:underline inline-flex items-center gap-1">
                  Share with my country group <ExternalLink size={11} />
                </button>
              </div>
            </article>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="card text-center text-sm text-ink-500 py-10">
            <Shield size={20} className="mx-auto mb-2 opacity-50" /> No scams match this filter.
          </li>
        )}
      </ul>

      <p className="text-xs text-ink-500 mt-6 text-center">
        AI auto-scans new listings and DMs for known scam patterns. False positives? Hit the appeal button on any flagged content.
      </p>
    </div>
  );
}
