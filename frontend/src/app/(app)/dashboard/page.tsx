"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  FileCheck,
  Home,
  MapPin,
  Calendar,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";

async function fetchWithTimeout(url: string, ms = 5000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  useEffect(() => {
    try {
      const role = localStorage.getItem("user-role");
      if (role === "mentor") router.replace("/dashboard/mentor");
      else if (role === "employer") router.replace("/dashboard/employer");

      setName((localStorage.getItem("user-name") || "").split(" ")[0] || "");
      setOrigin(localStorage.getItem("user-country") || "");
      setDestination(localStorage.getItem("user-destination") || "");
    } catch { /* ignore */ }
  }, [router]);

  const journey = origin && destination
    ? `${origin} → ${destination}`
    : "Your study-abroad journey";

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <p className="text-sm font-medium text-clay-600">YOUR JOURNEY</p>
        <h1 className="mt-1 text-4xl font-display font-semibold text-ink-900 tracking-tight">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </h1>
        <p className="mt-2 text-ink-600">{journey}</p>
      </div>

      <ProgressTracker />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AIAssistantCard />
          <RecentOpportunities />
        </div>

        <div className="space-y-6">
          <NextStepsCard />
          <HousingSnapshot />
          <ScamAlert />
        </div>
      </div>
    </div>
  );
}

function ProgressTracker() {
  const steps = [
    { label: "Accepted", done: true },
    { label: "Visa Docs", done: true },
    { label: "Biometrics", done: false, active: true },
    { label: "Submit", done: false },
    { label: "Arrival", done: false },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold text-ink-900">Application Progress</h3>
        <span className="badge badge-clay">40% complete</span>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex-1 flex items-center gap-2">
            <div className="flex-1 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                  s.done
                    ? "bg-leaf-500 border-leaf-500 text-white"
                    : s.active
                    ? "bg-clay-500 border-clay-500 text-white animate-pulse-glow"
                    : "bg-cream-100 border-cream-300 text-ink-500"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </div>
              <p className="mt-2 text-xs font-medium text-ink-700">{s.label}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 ${s.done ? "bg-leaf-500" : "bg-cream-300"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AIAssistantCard() {
  return (
    <Link href="/assistant" className="card group flex items-start gap-4 hover:!border-clay-300">
      <div className="w-12 h-12 rounded-xl bg-clay-500 text-white flex items-center justify-center shrink-0">
        <Bot size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-ink-900">Ask the AI assistant</h3>
          <Sparkles size={14} className="text-clay-500" />
        </div>
        <p className="mt-1 text-sm text-ink-600">
          Country-specific visa guidance, document checklists, deadline reminders — in plain language.
        </p>
        <p className="mt-3 text-sm font-medium text-clay-600 flex items-center gap-1 group-hover:gap-2 transition-all">
          Open AI Assistant <ArrowRight size={14} />
        </p>
      </div>
    </Link>
  );
}

type Opp = {
  id: string; type: string; title: string; country: string;
  institution: string | null; funding_amount: string | null; currency: string | null;
  deadline: string | null;
};

const typeLabel: Record<string, string> = {
  scholarship: "Scholarship", internship: "Internship", exchange: "Exchange",
  work_study: "Work-Study", job: "Job",
};

function RecentOpportunities() {
  const [opps, setOpps] = useState<Opp[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithTimeout("/api/opportunities?limit=3");
        const data = await res.json();
        if (res.ok) setOpps(data.opportunities as Opp[]);
        else setOpps([]);
      } catch { setOpps([]); }
    })();
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-lg font-semibold text-ink-900">Matched opportunities</h3>
        <Link href="/opportunities" className="text-sm font-medium text-clay-600 hover:underline">
          View all
        </Link>
      </div>

      {opps === null && (
        <div className="py-8 text-center text-ink-500"><Loader2 size={16} className="animate-spin mx-auto" /></div>
      )}
      {opps && opps.length === 0 && (
        <p className="py-6 text-center text-sm text-ink-500">No opportunities yet.</p>
      )}

      <div className="space-y-3">
        {opps?.map((o) => {
          const funding = o.funding_amount
            ? `${o.currency ?? ""} ${Number(o.funding_amount).toLocaleString()}`.trim()
            : "See details";
          return (
            <Link
              key={o.id}
              href={`/opportunities/${o.id}`}
              className="block p-4 rounded-lg border border-cream-200 hover:border-cream-300 hover:bg-cream-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-sky">{typeLabel[o.type] ?? o.type}</span>
                {o.institution && <span className="text-xs text-ink-500">{o.institution}</span>}
              </div>
              <h4 className="font-medium text-ink-900">{o.title}</h4>
              <div className="mt-2 flex items-center gap-4 text-xs text-ink-600 flex-wrap">
                <span className="flex items-center gap-1"><MapPin size={12} /> {o.country}</span>
                <span className="flex items-center gap-1"><Calendar size={12} /> Due {o.deadline ?? "Rolling"}</span>
                <span className="flex items-center gap-1 text-leaf-600 font-medium"><TrendingUp size={12} /> {funding}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NextStepsCard() {
  const tasks = [
    { label: "Book biometrics appointment", due: "Tomorrow", urgent: true },
    { label: "Upload bank statement", due: "Mar 5", urgent: false },
    { label: "Submit IRCC application", due: "Mar 15", urgent: false },
  ];

  return (
    <div className="card">
      <h3 className="font-display text-lg font-semibold text-ink-900 mb-4">Next steps</h3>
      <ul className="space-y-3">
        {tasks.map((t, i) => (
          <li key={i} className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 accent-clay-500" />
            <div className="flex-1">
              <p className="text-sm text-ink-900">{t.label}</p>
              <p className={`text-xs mt-0.5 ${t.urgent ? "text-clay-600 font-medium" : "text-ink-500"}`}>
                Due {t.due}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Link href="/assistant" className="btn-ghost border border-cream-300 w-full mt-4 text-sm">
        <FileCheck size={14} /> Generate full checklist
      </Link>
    </div>
  );
}

type Listing = {
  id: string; city: string; country: string; rent_amount: string; currency: string;
};

function HousingSnapshot() {
  const [data, setData] = useState<{ count: number; avg: number; currency: string; city: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithTimeout("/api/housing?limit=20");
        const json = await res.json();
        const list = (json.listings ?? []) as Listing[];
        if (!list.length) { setData({ count: 0, avg: 0, currency: "", city: "" }); return; }
        const currency = list[0].currency;
        const sameCur = list.filter((l) => l.currency === currency);
        const avg = Math.round(sameCur.reduce((a, l) => a + Number(l.rent_amount), 0) / sameCur.length);
        setData({ count: list.length, avg, currency, city: list[0].city });
      } catch { setData({ count: 0, avg: 0, currency: "", city: "" }); }
    })();
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">Housing</h3>
        <Home size={16} className="text-clay-500" />
      </div>
      {!data ? (
        <Loader2 size={16} className="animate-spin text-ink-400" />
      ) : data.count === 0 ? (
        <p className="text-sm text-ink-600">No listings yet.</p>
      ) : (
        <>
          <p className="text-sm text-ink-600">
            {data.count} verified listing{data.count > 1 ? "s" : ""} available.
          </p>
          <p className="mt-2 text-2xl font-display font-semibold text-ink-900">
            {data.currency} {data.avg.toLocaleString()} <span className="text-sm font-normal text-ink-500">avg/mo</span>
          </p>
        </>
      )}
      <Link href="/housing" className="text-sm font-medium text-clay-600 hover:underline mt-3 inline-flex items-center gap-1">
        Browse listings <ArrowRight size={14} />
      </Link>
    </div>
  );
}

type Alert = { id: string; title: string; upvotes: number };

function ScamAlert() {
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithTimeout("/api/moderation/scam-alerts");
        const json = await res.json();
        if (res.ok && json.alerts?.length) setAlert(json.alerts[0]);
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <div className="card !bg-clay-500/5 !border-clay-500/30">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-clay-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm text-ink-900">Top scam alert</h4>
          <p className="text-xs text-ink-700 mt-1 leading-relaxed">
            {alert
              ? `${alert.title} — flagged ${alert.upvotes} times.`
              : "Stay alert for fake visa agents and housing scams."}
          </p>
          <Link href="/scam-alerts" className="text-xs font-medium text-clay-600 hover:underline mt-2 inline-block">
            Read full feed →
          </Link>
        </div>
      </div>
    </div>
  );
}
