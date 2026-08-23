"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Map, Loader2, Bot, Milestone, CalendarClock, Coins, FileText, Lightbulb, AlertTriangle, Route,
  Fingerprint, PlaneTakeoff, Stamp, MessageSquare, FolderOpen, ArrowRight, ShieldCheck, Check,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

/** Best-effort icon per phase, matched on real phase.title keywords — purely
 * cosmetic, never used to imply a phase is "current" or "done" since the
 * generator has no persistent per-user state to base that on. */
function phaseIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("biometric") || t.includes("fingerprint")) return Fingerprint;
  if (t.includes("interview") || t.includes("consulate") || t.includes("embassy")) return MessageSquare;
  if (t.includes("decision") || t.includes("approval") || t.includes("issue")) return Stamp;
  if (t.includes("depart") || t.includes("travel") || t.includes("arrival")) return PlaneTakeoff;
  if (t.includes("document") || t.includes("gather") || t.includes("prepare")) return FolderOpen;
  return Milestone;
}

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
  // Persistence (GB-09). visa_checklists previously had no reachable writer, so
  // a generated roadmap vanished on refresh and the dashboard's visa-progress
  // tile was null for every user.
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [restored, setRestored] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reload the most recent saved roadmap so progress survives a refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/ai/checklists");
        if (!res.ok) return;
        const data = await res.json();
        const latest = data?.checklists?.[0];
        if (cancelled || !latest?.items?.length) return;
        setOrigin(latest.origin_country ?? "");
        setDestination(latest.destination_country ?? "");
        setPurpose(latest.visa_type ?? "study");
        setRoadmap({
          title: `${latest.visa_type} roadmap: ${latest.origin_country} \u2192 ${latest.destination_country}`,
          totalWeeks: 0,
          phases: latest.items,
        });
        setChecklistId(latest.id);
        setCompleted(new Set<string>(latest.completed_items ?? []));
        setRestored(true);
      } catch {
        /* nothing saved yet, or offline — the generator still works */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function persist(next: Roadmap) {
    setSaveError(null);
    try {
      const res = await authFetch("/api/ai/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_country: origin,
          destination_country: destination,
          visa_type: purpose,
          items: next.phases,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Say so rather than pretending it saved — the roadmap is still on
        // screen and usable, it just will not survive a refresh.
        setSaveError("Generated, but couldn't save your progress. It won't be here when you return.");
        return;
      }
      setChecklistId(data.checklist?.id ?? null);
      setCompleted(new Set<string>(data.checklist?.completed_items ?? []));
    } catch {
      setSaveError("Generated, but couldn't save your progress. It won't be here when you return.");
    }
  }

  async function togglePhase(phaseId: string) {
    if (!checklistId) return;
    const nowCompleted = !completed.has(phaseId);
    // Optimistic, then reconciled against what the server actually stored.
    setCompleted((prev) => {
      const next = new Set(prev);
      if (nowCompleted) next.add(phaseId); else next.delete(phaseId);
      return next;
    });
    try {
      const res = await authFetch(`/api/ai/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase_id: phaseId, completed: nowCompleted }),
      });
      const data = await res.json();
      if (res.ok) setCompleted(new Set<string>(data.checklist?.completed_items ?? []));
      else throw new Error("save failed");
    } catch {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (nowCompleted) next.delete(phaseId); else next.add(phaseId);
        return next;
      });
      setSaveError("Couldn't save that change. Check your connection and try again.");
    }
  }

  async function generate() {
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    setRoadmap(null);
    setError(null);
    try {
      const res = await authFetch("/api/ai/visa-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, purpose }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) setError(data?.error || `Request failed (${res.status})`);
      else {
        const next = data as Roadmap;
        setRoadmap(next);
        setRestored(false);
        await persist(next);
      }
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="text-xl font-display font-semibold text-ink-900">{roadmap.title}</h2>
              <div className="flex items-center gap-2">
                {roadmap.totalWeeks > 0 && (
                  <span className="badge badge-clay"><CalendarClock size={12} /> ~{roadmap.totalWeeks} weeks end-to-end</span>
                )}
                {checklistId && (
                  <span className="badge !bg-leaf-500/15 !text-leaf-600">
                    {completed.size}/{roadmap.phases.length} done
                  </span>
                )}
              </div>
            </div>

            {restored && (
              <p className="text-xs text-ink-500 mb-4">Picking up where you left off — this is your saved roadmap.</p>
            )}
            {saveError && (
              <p className="text-xs text-amber-600 mb-4">{saveError}</p>
            )}
            {!checklistId && !saveError && (
              <p className="text-xs text-ink-500 mb-4">Generate a roadmap to start tracking your progress.</p>
            )}

            <ol className="relative border-l-2 border-cream-300 ml-3 space-y-6">
              {roadmap.phases.map((p, i) => {
                const Icon = phaseIcon(p.title);
                return (
                  <li
                    key={p.id}
                    className="relative pl-8 gb-reveal"
                    style={{ animationDelay: `${i * 110}ms` }}
                  >
                    {/* node — doubles as the completion control once saved */}
                    {checklistId ? (
                      <button
                        type="button"
                        onClick={() => togglePhase(p.id)}
                        aria-pressed={completed.has(p.id)}
                        aria-label={completed.has(p.id) ? `Mark "${p.title}" as not done` : `Mark "${p.title}" as done`}
                        className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center ring-4 ring-cream-50 transition-colors ${completed.has(p.id) ? "bg-leaf-500 text-white" : "bg-clay-500 text-white hover:bg-clay-600"}`}
                      >
                        {completed.has(p.id) ? <Check size={13} /> : i + 1}
                      </button>
                    ) : (
                      <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-clay-500 text-white text-xs font-semibold flex items-center justify-center ring-4 ring-cream-50">
                        {i + 1}
                      </span>
                    )}

                    <div className={`card transition-opacity ${completed.has(p.id) ? "opacity-60" : ""}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
                          <Icon size={15} className="text-clay-600" /> {p.title}
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
                );
              })}
            </ol>

            <p className="text-xs text-ink-500 text-center mt-6">
              ⚠ Timelines and costs are estimates. Always confirm requirements on the official government portal.
            </p>
          </div>

          {/* Sidebar — evergreen, not tied to any specific fabricated case */}
          <aside className="lg:col-span-1 space-y-4">
            <div className="card">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900 mb-3">
                <ShieldCheck size={16} className="text-clay-600" /> How to use this
              </h3>
              <ul className="space-y-2.5 text-sm text-ink-700">
                <li className="flex gap-2"><span className="text-clay-500 font-semibold">1.</span> Treat this as a starting checklist, not a guarantee — every country&apos;s process changes.</li>
                <li className="flex gap-2"><span className="text-clay-500 font-semibold">2.</span> Cross-check every document and fee against your destination&apos;s official immigration site.</li>
                <li className="flex gap-2"><span className="text-clay-500 font-semibold">3.</span> Re-run this with a different purpose (study/work/settle) to compare paths.</li>
              </ul>
            </div>
            <div className="card bg-clay-500/5 border-clay-500/20">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900 mb-2">
                <Bot size={16} className="text-clay-600" /> Have a specific question?
              </h3>
              <p className="text-sm text-ink-600 mb-3">
                The AI Assistant can dig into your exact situation — a document you&apos;re unsure about, a timeline conflict, or a country-specific quirk.
              </p>
              <Link href="/assistant" className="btn-accent w-full justify-center text-sm">
                Ask the AI Assistant <ArrowRight size={13} />
              </Link>
            </div>
          </aside>
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
