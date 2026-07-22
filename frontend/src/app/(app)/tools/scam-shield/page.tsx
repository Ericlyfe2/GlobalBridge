"use client";

import { useMemo, useState } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Loader2, Bot, Flag, Sparkles,
} from "lucide-react";

type Severity = "low" | "med" | "high";
type ScamFlag = { phrase: string; category: string; why: string; severity: Severity };
type ScamResult = {
  score: number;
  verdict: "Likely safe" | "Be cautious" | "High scam risk";
  summary: string;
  flags: ScamFlag[];
  advice: string[];
};

const kinds = [
  { value: "housing",     label: "Housing / rental listing" },
  { value: "job",         label: "Job offer" },
  { value: "scholarship", label: "Scholarship / program" },
  { value: "message",     label: "Direct message" },
];

const samples: Record<string, string> = {
  housing:
    "Beautiful 2-bedroom apartment near campus, only $450/month all bills included! I am currently abroad on a missionary trip so I cannot show you the place, but the keys will be couriered to you once you wire the first month's rent and deposit via Western Union to secure it. Many students are interested so please act today!",
  job:
    "Congratulations! You have been selected for a remote Data Entry role paying $600 per week for just 2 hours a day. To activate your contract, please pay a one-time $95 training and background-check fee and send a copy of your passport to confirm your eligibility. Offer expires in 24 hours.",
};

export default function ScamShieldPage() {
  const [kind, setKind] = useState("housing");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setReported(false);
    try {
      const res = await fetch("/api/ai/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, kind }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setError(data?.error || `Request failed (${res.status})`);
      } else {
        setResult(data as ScamResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function report() {
    setReported(true); // optimistic — this is protective, never blocking
    try {
      const token = (() => { try { return localStorage.getItem("gb-token"); } catch { return null; } })();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/moderation/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: "scam",
          target: kind,
          reason: `Scam Shield flagged this ${kind} (risk ${result?.score ?? "?"}/100).`,
          content: text.slice(0, 2000),
        }),
      }).catch(() => {});
    } catch { /* best-effort; UI already confirmed */ }
  }

  const tone = result ? toneFor(result.score) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center shrink-0">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            AI Scam Shield
            <span className="badge badge-clay text-[10px]"><Bot size={10} /> AI</span>
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Paste a suspicious listing, job offer, or message. We spot the red flags newcomers get caught by — in seconds.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <label className="block mb-3">
              <span className="block text-xs font-medium text-ink-600 mb-1.5">What is this?</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="input">
                {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-ink-600 mb-1.5">Paste the text</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the full listing, offer, or message here..."
                className="input text-xs min-h-[180px] leading-relaxed"
              />
            </label>

            {samples[kind] && (
              <button
                onClick={() => { setText(samples[kind]); setResult(null); setError(null); }}
                className="mt-2 text-xs text-clay-600 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles size={11} /> Try a sample {kind === "job" ? "job offer" : "listing"}
              </button>
            )}

            <button
              onClick={analyze}
              disabled={!text.trim() || loading}
              className="btn-accent w-full mt-4 disabled:opacity-50"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Scanning...</> : <><ShieldAlert size={14} /> Check for scams</>}
            </button>

            {error && (
              <div className="mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/25 text-xs text-red-600 flex items-start gap-2">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="card text-xs text-ink-600 leading-relaxed">
            <p className="font-medium text-ink-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-leaf-600" /> Private by design
            </p>
            Text is analyzed for scam patterns and never stored unless you choose to report it. Scam Shield assists your judgment — it doesn&apos;t replace it.
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {!result && !loading && (
            <div className="card text-center py-16 text-ink-500">
              <ShieldAlert size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Paste something suspicious to see the risk breakdown.</p>
            </div>
          )}

          {loading && (
            <div className="card text-center py-16">
              <Loader2 size={32} className="mx-auto mb-3 text-red-500 animate-spin" />
              <p className="text-sm text-ink-700">Scanning for scam signals...</p>
              <p className="text-xs text-ink-500 mt-2">Checking payment demands, urgency, viewing refusals, data requests...</p>
            </div>
          )}

          {result && tone && (
            <div className="space-y-4">
              {/* Gauge */}
              <div className="card flex items-center gap-6">
                <RiskGauge score={result.score} tone={tone} />
                <div className="min-w-0">
                  <span className={`badge ${tone.badge}`}>{result.verdict}</span>
                  <p className="text-sm text-ink-700 mt-2 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Highlighted text */}
              {result.flags.length > 0 && (
                <div className="card">
                  <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">Where the risk is</h2>
                  <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">
                    <Highlighted text={text} flags={result.flags} />
                  </p>
                </div>
              )}

              {/* Flags list */}
              {result.flags.length > 0 && (
                <div className="card !p-0 overflow-hidden">
                  <div className="px-5 py-3 border-b border-cream-200">
                    <h2 className="font-display text-lg font-semibold text-ink-900">
                      {result.flags.length} red flag{result.flags.length === 1 ? "" : "s"}
                    </h2>
                  </div>
                  <ul className="divide-y divide-cream-200">
                    {result.flags.map((f, i) => (
                      <li key={i} className="px-5 py-3 flex items-start gap-3">
                        <SeverityDot s={f.severity} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-900">
                            {f.category}
                            <span className="ml-2 text-xs font-normal text-ink-500 italic">&ldquo;{trim(f.phrase)}&rdquo;</span>
                          </p>
                          <p className="text-xs text-ink-600 mt-0.5">{f.why}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advice */}
              <div className="card">
                <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">What to do next</h2>
                <ul className="space-y-2">
                  {result.advice.map((a, i) => (
                    <li key={i} className="text-sm text-ink-700 flex items-start gap-2">
                      <ShieldCheck size={14} className="text-leaf-600 mt-0.5 shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>

                {result.score > 33 && (
                  <button
                    onClick={report}
                    disabled={reported}
                    className="btn-ghost w-full mt-4 border border-cream-300 disabled:opacity-60"
                  >
                    {reported
                      ? <><ShieldCheck size={14} className="text-leaf-600" /> Reported — thank you for protecting others</>
                      : <><Flag size={14} /> Report this to protect other students</>}
                  </button>
                )}
              </div>

              <p className="text-xs text-ink-500 text-center">
                ⚠ Scam Shield flags common patterns. A low score is not a guarantee — always verify before paying.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */

function RiskGauge({ score, tone }: { score: number; tone: Tone }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative w-[120px] h-[120px] shrink-0">
      <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-cream-200, #e7e2d8)" strokeWidth="9" />
        <circle
          cx="55" cy="55" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
          stroke={tone.stroke}
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-display font-semibold ${tone.text}`}>{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-500">risk / 100</span>
      </div>
    </div>
  );
}

function Highlighted({ text, flags }: { text: string; flags: ScamFlag[] }) {
  const parts = useMemo(() => splitByFlags(text, flags), [text, flags]);
  return (
    <>
      {parts.map((p, i) =>
        p.severity ? (
          <mark
            key={i}
            className={
              p.severity === "high"
                ? "bg-red-500/20 text-red-700 rounded px-0.5"
                : p.severity === "med"
                  ? "bg-amber-500/20 text-amber-600 rounded px-0.5"
                  : "bg-clay-500/15 text-clay-700 rounded px-0.5"
            }
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function SeverityDot({ s }: { s: Severity }) {
  const cls = s === "high" ? "bg-red-600" : s === "med" ? "bg-amber-500" : "bg-clay-500";
  return <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

type Tone = { stroke: string; text: string; badge: string };
function toneFor(score: number): Tone {
  if (score > 66) return { stroke: "#dc2626", text: "text-red-600",   badge: "!bg-red-500/15 !text-red-600" };
  if (score > 33) return { stroke: "#f59e0b", text: "text-amber-500", badge: "!bg-amber-500/15 !text-amber-500" };
  return { stroke: "#16a34a", text: "text-leaf-600", badge: "!bg-leaf-500/15 !text-leaf-600" };
}

function trim(s: string, n = 48) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** Split text into segments, marking the ones that match a flag phrase. */
function splitByFlags(
  text: string,
  flags: ScamFlag[],
): { text: string; severity?: Severity }[] {
  const ranges: { start: number; end: number; severity: Severity }[] = [];
  const lc = text.toLowerCase();
  for (const f of flags) {
    const phrase = (f.phrase || "").trim();
    if (!phrase) continue;
    let from = 0;
    let idx = lc.indexOf(phrase.toLowerCase(), from);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + phrase.length, severity: f.severity });
      from = idx + phrase.length;
      idx = lc.indexOf(phrase.toLowerCase(), from);
      if (ranges.length > 60) break;
    }
  }
  if (!ranges.length) return [{ text }];
  ranges.sort((a, b) => a.start - b.start);

  const out: { text: string; severity?: Severity }[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue; // skip overlaps
    if (r.start > cursor) out.push({ text: text.slice(cursor, r.start) });
    out.push({ text: text.slice(r.start, r.end), severity: r.severity });
    cursor = r.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}
