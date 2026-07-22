"use client";

import { useState } from "react";
import {
  Gauge, Loader2, Bot, FileCheck, Wallet, Home, Briefcase, Users, ArrowRight, Sparkles,
} from "lucide-react";
import Link from "next/link";

type PillarKey = "documents" | "finances" | "housing" | "job" | "community";
type Action = { title: string; detail: string; pillar: PillarKey };
type PillarOut = { key: PillarKey; label: string; score: number; note: string };
type ReadinessResult = { overall: number; pillars: PillarOut[]; actions: Action[] };

const PILLAR_META: Record<PillarKey, { icon: typeof FileCheck; hint: string }> = {
  documents: { icon: FileCheck, hint: "Passport, transcripts, letters" },
  finances:  { icon: Wallet,    hint: "Proof of funds, budget" },
  housing:   { icon: Home,      hint: "A safe place lined up" },
  job:       { icon: Briefcase, hint: "Income / sponsorship" },
  community: { icon: Users,     hint: "Mentors & peers" },
};

const ACTION_LINK: Record<PillarKey, string> = {
  documents: "/tools/doc-checker",
  finances:  "/toolkit/cost",
  housing:   "/housing",
  job:       "/jobs/sponsorship-tracker",
  community: "/community/mentors",
};

const ORDER: PillarKey[] = ["documents", "finances", "housing", "job", "community"];

export default function ReadinessPage() {
  const [scores, setScores] = useState<Record<PillarKey, number>>({
    documents: 60, finances: 40, housing: 25, job: 30, community: 50,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function score() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillars: scores }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) setError(data?.error || `Request failed (${res.status})`);
      else setResult(data as ReadinessResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <Gauge size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            GlobalBridge Readiness Score
            <span className="badge badge-clay text-[10px]"><Bot size={10} /> AI</span>
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Rate how ready you feel across five pillars. We score your overall readiness and tell you exactly what to do next.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="card space-y-5">
          {ORDER.map((k) => {
            const Meta = PILLAR_META[k];
            const Icon = Meta.icon;
            return (
              <div key={k}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-ink-900 flex items-center gap-2 capitalize">
                    <Icon size={15} className="text-clay-600" /> {k === "job" ? "Job / income" : k}
                  </span>
                  <span className="text-sm font-semibold text-ink-700 tabular-nums">{scores[k]}</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5} value={scores[k]}
                  onChange={(e) => setScores((s) => ({ ...s, [k]: Number(e.target.value) }))}
                  className="w-full accent-[var(--color-clay-500)]"
                />
                <p className="text-xs text-ink-500 mt-0.5">{Meta.hint}</p>
              </div>
            );
          })}

          <button onClick={score} disabled={loading} className="btn-accent w-full disabled:opacity-50">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Scoring...</> : <><Sparkles size={14} /> Score my readiness</>}
          </button>
          {error && (
            <div className="px-3 py-2 rounded-md bg-red-500/10 border border-red-500/25 text-xs text-red-600">{error}</div>
          )}
        </div>

        {/* Result */}
        <div>
          {!result && !loading && (
            <div className="card h-full flex flex-col items-center justify-center text-center py-16 text-ink-500">
              <Gauge size={32} className="mb-3 opacity-50" />
              <p className="text-sm">Your readiness meter and personalized action plan appear here.</p>
            </div>
          )}
          {loading && (
            <div className="card h-full flex flex-col items-center justify-center py-16">
              <Loader2 size={32} className="mb-3 text-leaf-500 animate-spin" />
              <p className="text-sm text-ink-700">Calculating your readiness...</p>
            </div>
          )}
          {result && (
            <div className="card">
              <div className="flex flex-col items-center">
                <RadialMeter value={result.overall} />
                <p className="text-sm text-ink-600 mt-2">Overall readiness</p>
              </div>

              <div className="mt-5 space-y-2">
                {result.pillars.map((p) => (
                  <div key={p.key}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-ink-700 font-medium">{p.label}</span>
                      <span className="text-ink-500">{p.note}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${barTone(p.score)}`}
                        style={{ width: `${p.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-display font-semibold text-ink-900 mb-3">Your top 3 next actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {result.actions.map((a, i) => (
              <Link key={i} href={ACTION_LINK[a.pillar] ?? "/dashboard"} className="card hover:border-clay-500 transition group">
                <span className="badge badge-clay text-[10px] mb-2 capitalize">{a.pillar === "job" ? "job" : a.pillar}</span>
                <h3 className="font-medium text-ink-900 text-sm flex items-start gap-1">
                  <span className="text-clay-600 font-semibold">{i + 1}.</span> {a.title}
                </h3>
                <p className="text-xs text-ink-600 mt-1.5 leading-relaxed">{a.detail}</p>
                <span className="text-xs text-clay-600 mt-2 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Start <ArrowRight size={11} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RadialMeter({ value }: { value: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const stroke = value >= 70 ? "#16a34a" : value >= 40 ? "#f59e0b" : "#dc2626";
  const text = value >= 70 ? "text-leaf-600" : value >= 40 ? "text-amber-500" : "text-red-600";
  return (
    <div className="relative w-[150px] h-[150px]">
      <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--color-cream-200, #e7e2d8)" strokeWidth="11" />
        <circle
          cx="65" cy="65" r={r} fill="none" strokeWidth="11" strokeLinecap="round" stroke={stroke}
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 1000ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-display font-semibold ${text}`}>{value}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-500">/ 100</span>
      </div>
    </div>
  );
}

function barTone(score: number): string {
  if (score >= 70) return "bg-leaf-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}
