"use client";

import { useState } from "react";
import {
  Map, Loader2, Bot, Milestone, CalendarClock, Coins, FileText, Lightbulb, AlertTriangle, Route,
} from "lucide-react";

type Phase = { id: string; title: string; timeframe: string; cost: string; documents: string[]; tip: string };
type Roadmap = { title: string; totalWeeks: number; phases: Phase[] };

const purposes = [
  { value: "study",  label: "Study" },
  { value: "work",   label: "Work" },
  { value: "settle", label: "Settle / residency" },
];

export default function VisaRoadmapPage() {
  const [origin, setOrigin] = useState("Ghana");
  const [destination, setDestination] = useState("Canada");
  const [purpose, setPurpose] = useState("study");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    setRoadmap(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/visa-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, purpose }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) setError(data?.error || `Request failed (${res.status})`);
      else setRoadmap(data as Roadmap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
          <Route size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            AI Visa Roadmap
            <span className="badge badge-clay text-[10px]"><Bot size={10} /> AI</span>
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Tell us where you&apos;re coming from and where you&apos;re headed. We map every phase, deadline, cost, and document.
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">From</span>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Ghana" className="input" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">To</span>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Canada" className="input" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Purpose</span>
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input">
              {purposes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={generate} disabled={loading} className="btn-accent w-full disabled:opacity-50">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Mapping...</> : <><Map size={14} /> Generate roadmap</>}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/25 text-xs text-red-600 flex items-start gap-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Empty / loading */}
      {!roadmap && !loading && (
        <div className="card text-center py-16 text-ink-500">
          <Route size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Your personalized journey will appear here as an interactive timeline.</p>
        </div>
      )}
      {loading && (
        <div className="card text-center py-16">
          <Loader2 size={32} className="mx-auto mb-3 text-clay-500 animate-spin" />
          <p className="text-sm text-ink-700">Charting your route from {origin} to {destination}...</p>
        </div>
      )}

      {/* Timeline */}
      {roadmap && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-display font-semibold text-ink-900">{roadmap.title}</h2>
            <span className="badge badge-clay"><CalendarClock size={12} /> ~{roadmap.totalWeeks} weeks end-to-end</span>
          </div>

          <ol className="relative border-l-2 border-cream-300 ml-3 space-y-6">
            {roadmap.phases.map((p, i) => (
              <li
                key={p.id}
                className="relative pl-8 gb-reveal"
                style={{ animationDelay: `${i * 110}ms` }}
              >
                {/* node */}
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-clay-500 text-white text-xs font-semibold flex items-center justify-center ring-4 ring-cream-50">
                  {i + 1}
                </span>

                <div className="card">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
                      <Milestone size={15} className="text-clay-600" /> {p.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="badge !bg-cream-200 !text-ink-700"><CalendarClock size={11} /> {p.timeframe}</span>
                      <span className="badge !bg-amber-500/15 !text-amber-500"><Coins size={11} /> {p.cost}</span>
                    </div>
                  </div>

                  {p.documents?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.documents.map((d, di) => (
                        <span key={di} className="inline-flex items-center gap-1 text-xs text-ink-700 bg-cream-100 border border-cream-200 rounded-md px-2 py-1">
                          <FileText size={11} className="text-ink-500" /> {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.tip && (
                    <p className="text-xs text-ink-600 flex items-start gap-1.5 bg-leaf-500/8 border border-leaf-500/20 rounded-md px-2.5 py-2">
                      <Lightbulb size={12} className="text-leaf-600 mt-0.5 shrink-0" /> <span>{p.tip}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="text-xs text-ink-500 text-center mt-6">
            ⚠ Timelines and costs are estimates. Always confirm requirements on the official government portal.
          </p>
        </div>
      )}

      <style jsx>{`
        .gb-reveal {
          opacity: 0;
          transform: translateY(14px);
          animation: gbReveal 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes gbReveal {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
