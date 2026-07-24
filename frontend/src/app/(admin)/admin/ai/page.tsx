"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot, Activity, BarChart3, ThumbsUp, AlertTriangle, MessageSquare, Loader2,
  Star, X, TrendingUp, TrendingDown, Zap, MessagesSquare, Timer,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

type HealthReport = {
  overall: "healthy" | "degraded";
  services: { name: string; status: "up" | "down" | "not_configured"; latencyMs: number | null }[];
};

type AIStats = {
  usage: { total_requests: number; avg_tokens: number; avg_response_time: number; error_rate: number | null };
  feedback: { avg_rating: number; total_feedback: number };
  conversations: number;
  modelUsage: { feature: string; count: number }[];
  byModel: { model: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  recentErrors: { id: string; feature: string; model: string | null; error: string; created_at: string }[];
  errorsByFeature: { feature: string; count: number }[];
};

type TimelinePoint = { hour: string; requests: number; p95: number };

type Trend = { current: number; previous: number; pct: number | null };
type KpiSeries = {
  series: Record<"requests" | "avgResponseTime" | "errorRate" | "conversations" | "feedbackCount" | "avgRating", { hour: string; value: number }[]>;
  trends: Record<"requests" | "avgResponseTime" | "errorRate" | "conversations" | "feedbackCount" | "avgRating", Trend>;
};

type Conversation = {
  id: string; title: string; user_name: string; user_email: string; message_count: number;
  created_at: string; visa_type: string | null;
};

type Message = { id: string; role: string; content: string; created_at: string };

const NEON = { blue: "#4d8bff", violet: "#8b6bff", cyan: "#3ee6ff", magenta: "#ff5cd1", lime: "#7bff9b", amber: "#ffb84d", red: "#ff5c7a" };

function buildPath(values: number[], w: number, h: number, pad = 2): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function SectionTitle({ title, tag }: { title: string; tag: string }) {
  return (
    <div className="mb-1 mt-2 flex items-center gap-3">
      <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      <span className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">{tag}</span>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br from-[#171c2a]/70 to-[#0f1424]/50 p-5 ${className}`}>
      {children}
    </div>
  );
}

function PanelHeading({ icon: Icon, title, sub }: { icon: React.ComponentType<{ size?: number }>; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-[#8b6bff]/28 bg-[#8b6bff]/14 text-[#8b6bff]">
        <Icon size={15} />
      </span>
      <div>
        <h3 className="font-display text-base font-semibold text-white">{title}</h3>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function Probe({ label, status, latencyMs }: { label: string; status: string; latencyMs: number | null }) {
  const color = status === "up" ? NEON.lime : status === "not_configured" ? "#5a6a91" : NEON.red;
  return (
    <div className="flex min-w-[150px] items-center gap-2.5 rounded-xl border border-white/10 bg-black/25 px-3.5 py-2">
      <span className="relative h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <div className="font-mono text-xs font-semibold text-white">
          {status === "not_configured" ? "not configured" : status === "up" ? `up · ${latencyMs}ms` : "down"}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, unit, color, trend, series,
}: {
  icon: React.ComponentType<{ size?: number }>; label: string; value: string; unit?: string; color: string;
  trend: Trend | null; series: number[];
}) {
  const up = trend?.pct != null && trend.pct >= 0;
  const path = buildPath(series, 100, 34, 1);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/80 to-[#0f1424]/60 p-4 transition hover:-translate-y-0.5 hover:border-white/25">
      <span className="pointer-events-none absolute -bottom-10 -right-8 h-[120px] w-[120px] rounded-full opacity-[0.15] blur-[30px]" style={{ background: color }} />
      <div className="absolute left-0 right-0 top-0 h-[2px] opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px]" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
          <Icon size={16} />
        </span>
        {trend?.pct != null && (
          <span
            className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold"
            style={up ? { color: NEON.lime, background: "rgba(123,255,155,.1)" } : { color: NEON.red, background: "rgba(255,92,122,.1)" }}
          >
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend.pct)}%
          </span>
        )}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-display text-[26px] font-bold leading-tight text-white">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
      </div>
      <div className="relative mt-3.5 h-[34px]">
        <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`kpi-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".55" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {path && <path d={`${path} L100,34 L0,34 Z`} fill={`url(#kpi-${label.replace(/\s/g, "")})`} stroke="none" />}
          {path && <path d={path} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>
    </div>
  );
}

export default function AIConfigPage() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [kpiSeries, setKpiSeries] = useState<KpiSeries | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<"features" | "models" | "errors">("features");
  const [convFilter, setConvFilter] = useState<string>("All");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [healthRes, statsRes, timelineRes, kpiRes] = await Promise.all([
          authFetch("/api/admin/health", { signal: ctrl.signal }),
          authFetch("/api/admin/ai/stats", { signal: ctrl.signal }, 15000),
          authFetch("/api/admin/ai/usage-timeline?hours=24", { signal: ctrl.signal }),
          authFetch("/api/admin/ai/kpi-series", { signal: ctrl.signal }),
        ]);
        if (healthRes.ok) setHealth(await healthRes.json());
        if (!statsRes.ok) throw new Error("Failed to load AI stats");
        setStats(await statsRes.json());
        if (timelineRes.ok) setTimeline((await timelineRes.json()).series ?? []);
        if (kpiRes.ok) setKpiSeries(await kpiRes.json());
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setConvLoading(true);
    (async () => {
      try {
        const res = await authFetch("/api/admin/ai/conversations?limit=20", { signal: ctrl.signal });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setConversations(data.conversations ?? []);
      } catch { /* ignore */ } finally { setConvLoading(false); }
    })();
    return () => ctrl.abort();
  }, []);

  async function openConversation(c: Conversation) {
    setSelected(c);
    setMsgLoading(true);
    try {
      const res = await authFetch(`/api/admin/ai/conversations/${c.id}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { setMessages([]); } finally { setMsgLoading(false); }
  }

  const kpis = stats ? [
    { icon: Activity, label: "Total AI Requests", value: stats.usage.total_requests?.toLocaleString() ?? "0", color: NEON.cyan, key: "requests" as const },
    { icon: Zap, label: "Avg Tokens / req", value: stats.usage.avg_tokens?.toLocaleString() ?? "0", unit: "tok", color: NEON.blue, key: null },
    { icon: Timer, label: "Avg Response Time", value: String(stats.usage.avg_response_time ?? 0), unit: "ms", color: NEON.violet, key: "avgResponseTime" as const },
    { icon: AlertTriangle, label: "Error Rate", value: String(stats.usage.error_rate ?? 0), unit: "%", color: NEON.lime, key: "errorRate" as const },
    { icon: Star, label: "Feedback Rating", value: String(stats.feedback.avg_rating ?? 0), unit: "/5", color: NEON.amber, key: "avgRating" as const },
    { icon: MessagesSquare, label: "Conversations", value: stats.conversations?.toLocaleString() ?? "0", color: NEON.magenta, key: "conversations" as const },
  ] : [];

  const activeBreakdown = useMemo(() => {
    if (!stats) return [];
    const rows = breakdownTab === "features"
      ? stats.modelUsage.map((m) => ({ name: m.feature, count: m.count }))
      : breakdownTab === "models"
      ? stats.byModel.map((m) => ({ name: m.model, count: m.count }))
      : stats.errorsByFeature.map((m) => ({ name: m.feature, count: m.count }));
    const total = rows.reduce((s, r) => s + r.count, 0) || 1;
    return rows.map((r) => ({ ...r, pct: Math.round((r.count / total) * 100) }));
  }, [stats, breakdownTab]);

  const ratingTotal = stats?.ratingDistribution.reduce((s, r) => s + r.count, 0) || 1;
  const ringPct = stats ? Math.max(0, Math.min(100, (stats.feedback.avg_rating / 5) * 100)) : 0;
  const ringCirc = 2 * Math.PI * 54;

  const requestsPath = buildPath(timeline.map((t) => t.requests), 800, 160);
  const p95Path = buildPath(timeline.map((t) => t.p95), 800, 160);
  const latest = timeline[timeline.length - 1];

  const convFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of conversations) {
      const key = c.visa_type || "General";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [{ label: "All", count: conversations.length }, ...Array.from(counts, ([label, count]) => ({ label, count }))];
  }, [conversations]);
  const visibleConversations = convFilter === "All" ? conversations : conversations.filter((c) => (c.visa_type || "General") === convFilter);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
            <AlertTriangle size={14} /> {err}
          </div>
        )}

        {/* HERO */}
        <section className="relative overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-br from-[#171c2a]/85 to-[#0f1424]/55 p-6 sm:p-7">
          <span className="pointer-events-none absolute -right-10 -top-10 h-[280px] w-[280px] rounded-full bg-[conic-gradient(from_0deg,#4d8bff,#8b6bff,#3ee6ff,#4d8bff)] opacity-[0.28] blur-[80px]" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <span className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-400/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_10px_#3ee6ff]" />
                Live · Model: claude-sonnet-4.5 · Region us-east-1
              </span>
              <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-white sm:text-[34px]">
                <Bot className="mr-2 inline -translate-y-1 text-[#8b6bff]" size={28} /> AI Control Center
              </h1>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-400">
                Monitor every request, every token, every conversation. Real-time telemetry for the reasoning engine that powers mentorship, verification, and student assistance across GlobalBridge.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(health?.services ?? []).map((s) => <Probe key={s.name} label={s.name} status={s.status} latencyMs={s.latencyMs} />)}
            </div>
          </div>
        </section>

        {/* KPI ROW */}
        <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {stats ? kpis.map((k) => (
            <Kpi key={k.label} icon={k.icon} label={k.label} value={k.value} unit={k.unit} color={k.color}
              trend={k.key ? kpiSeries?.trends[k.key] ?? null : null}
              series={k.key ? (kpiSeries?.series[k.key].map((p) => p.value) ?? []) : []}
            />
          )) : Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[168px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}
        </section>

        {/* BREAKDOWN + FEEDBACK */}
        <SectionTitle title="Model & Feature Telemetry" tag="live" />
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <PanelHeading icon={BarChart3} title="Feature Breakdown" sub="Requests routed by workload across the reasoning engine" />
              <div className="inline-flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
                {(["features", "models", "errors"] as const).map((tab) => (
                  <button key={tab} onClick={() => setBreakdownTab(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${breakdownTab === tab ? "bg-gradient-to-br from-blue-500/40 to-violet-500/30 text-white shadow-[0_0_20px_-6px_rgba(77,139,255,.55)]" : "text-slate-400 hover:text-white"}`}
                  >{tab}</button>
                ))}
              </div>
            </div>

            {activeBreakdown.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No {breakdownTab} data yet.</div>
            ) : (
              <div className="space-y-3.5">
                {activeBreakdown.map((row) => (
                  <div key={row.name} className="grid grid-cols-[140px_1fr_90px] items-center gap-3.5 text-sm">
                    <div className="truncate font-medium text-slate-300 capitalize">{(row.name || "unknown").replace(/_/g, " ")}</div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-black/40">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#4d8bff] to-[color-mix(in_oklab,#4d8bff,white_25%)]" style={{ width: `${row.pct}%`, boxShadow: "0 0 12px #4d8bff" }} />
                    </div>
                    <div className="text-right font-mono text-xs font-semibold text-white">
                      {row.count.toLocaleString()}<small className="ml-1 block font-normal text-slate-500">{row.pct}%</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeading icon={ThumbsUp} title="User Feedback" sub="Ratings, sentiment, and satisfaction pulse" />
            <div className="mb-5 flex items-center gap-5">
              <div className="relative h-[110px] w-[110px] shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="54" strokeWidth="10" fill="none" stroke="rgba(120,140,200,.15)" />
                  <circle cx="60" cy="60" r="54" strokeWidth="10" fill="none" stroke="url(#ring-grad)" strokeLinecap="round"
                    strokeDasharray={ringCirc} strokeDashoffset={ringCirc - (ringPct / 100) * ringCirc}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)", filter: "drop-shadow(0 0 8px #8b6bff)" }} />
                  <defs>
                    <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={NEON.cyan} /><stop offset="50%" stopColor={NEON.blue} /><stop offset="100%" stopColor={NEON.violet} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <b className="font-display text-[28px] text-white">{stats?.feedback.avg_rating ?? "—"}</b>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500">avg / 5</span>
                </div>
              </div>
              <div>
                <div className="text-[15px] tracking-[2px] text-amber-400" style={{ filter: "drop-shadow(0 0 4px rgba(255,184,77,.5))" }}>★ ★ ★ ★ ★</div>
                <div className="mt-1.5 text-xs text-slate-400"><b className="font-mono text-sm text-white">{stats?.feedback.total_feedback?.toLocaleString() ?? 0}</b> ratings collected</div>
              </div>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats?.ratingDistribution.find((r) => r.rating === star)?.count ?? 0;
                const pct = Math.round((count / ratingTotal) * 100);
                return (
                  <div key={star} className="grid grid-cols-[24px_1fr_40px] items-center gap-2.5 text-xs text-slate-400">
                    <span>{star}★</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#8b6bff] to-[#3ee6ff]" style={{ width: `${pct}%`, boxShadow: "0 0 8px #8b6bff" }} />
                    </div>
                    <span className="text-right font-mono text-[11px] text-white">{count}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>

        {/* LIVE TIMELINE */}
        <SectionTitle title="Live Request Volume" tag="rolling 24h" />
        <Panel>
          <PanelHeading icon={Activity} title="Requests & Response Latency" sub="Solid: requests / hour · Dashed: p95 response time (ms)" />
          {timeline.every((t) => t.requests === 0) ? (
            <div className="py-10 text-center text-sm text-slate-500">No requests in the last 24 hours.</div>
          ) : (
            <div className="relative h-[230px]">
              <div className="absolute right-0 top-0 flex gap-3.5 text-[11px] text-slate-400">
                <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: NEON.cyan }} />Requests</span>
                <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: NEON.violet }} />Latency p95</span>
              </div>
              {latest && (
                <div className="absolute left-[8%] top-5 rounded-lg border border-[#4d8bff]/50 bg-[#171c2a]/90 px-2.5 py-1.5 font-mono text-[11px] text-white shadow-[0_8px_24px_rgba(0,0,0,.5)]">
                  <small className="block text-slate-500">{new Date(latest.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                  <b className="text-[14px] text-cyan-300">{latest.requests.toLocaleString()} req</b>
                  <small className="block text-slate-500">p95 · {latest.p95}ms</small>
                </div>
              )}
              <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="tl-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NEON.blue} stopOpacity=".5" /><stop offset="100%" stopColor={NEON.blue} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="tl-line-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={NEON.cyan} /><stop offset="100%" stopColor={NEON.violet} />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160].map((y) => <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(120,140,200,.08)" />)}
                <path d={`${requestsPath} L800,160 L0,160 Z`} fill="url(#tl-fade)" stroke="none" />
                <path d={requestsPath} fill="none" stroke="url(#tl-line-grad)" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: "drop-shadow(0 0 8px rgba(77,139,255,.7))" }} />
                <path d={p95Path} fill="none" stroke={NEON.violet} strokeWidth="1.6" strokeDasharray="2 4" opacity="0.75" vectorEffect="non-scaling-stroke" />
                {timeline.map((t, i) => (
                  i % 4 === 0 && (
                    <text key={i} x={(i / Math.max(timeline.length - 1, 1)) * 800} y="195" textAnchor="middle" className="fill-slate-500" style={{ fontFamily: "var(--font-jetbrains)", fontSize: 10 }}>
                      {new Date(t.hour).toLocaleTimeString([], { hour: "2-digit" })}
                    </text>
                  )
                ))}
              </svg>
            </div>
          )}
        </Panel>

        {/* STATUS ROW */}
        <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {[
            { label: "System Health", value: health?.overall === "healthy" ? "Healthy" : health ? "Degraded" : "—", sub: `${health?.services.filter((s) => s.status === "up").length ?? 0}/${health?.services.length ?? 0} services up`, tone: health?.overall === "healthy" ? "ok" : "bad" },
            { label: "Total Tokens Used", value: (stats?.usage.total_requests && stats?.usage.avg_tokens ? (stats.usage.total_requests * stats.usage.avg_tokens) : 0).toLocaleString(), sub: "sum across all requests", tone: "warn" },
            { label: "Avg Tokens / Request", value: stats?.usage.avg_tokens?.toLocaleString() ?? "0", sub: "input + output", tone: "ok" },
            { label: "Errors (last 10)", value: String(stats?.recentErrors.length ?? 0), sub: "needs review", tone: (stats?.recentErrors.length ?? 0) > 0 ? "bad" : "ok" },
          ].map((s) => (
            <div key={s.label} className="rounded-[14px] border-l-2 bg-white/5 p-4" style={{ borderLeftColor: s.tone === "ok" ? NEON.lime : s.tone === "warn" ? NEON.amber : NEON.red }}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</div>
              <div className="font-display text-[22px] font-bold text-white">{s.value}</div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-400">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* CONVERSATIONS */}
        <SectionTitle title="Conversation Browser" tag={`${stats?.conversations.toLocaleString() ?? 0} total`} />
        <Panel>
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            {convFilters.map((f) => (
              <button key={f.label} onClick={() => setConvFilter(f.label)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${convFilter === f.label ? "border-[#4d8bff]/50 bg-gradient-to-br from-[#4d8bff]/30 to-[#8b6bff]/15 text-white shadow-[0_0_16px_-4px_rgba(77,139,255,.6)]" : "border-white/10 bg-black/30 text-slate-400 hover:border-white/25 hover:text-white"}`}
              >
                {f.label}<span className="ml-1.5 font-mono text-[10px] text-slate-500">{f.count}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {convLoading ? (
                <div className="py-10 text-center text-slate-500"><Loader2 size={20} className="mx-auto mb-2 animate-spin" /> Loading…</div>
              ) : visibleConversations.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">No conversations yet.</div>
              ) : visibleConversations.map((c) => (
                <button key={c.id} onClick={() => openConversation(c)}
                  className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3.5 text-left transition ${selected?.id === c.id ? "border-[#4d8bff]/50 bg-[#171c2a]/70 shadow-[0_0_24px_-6px_rgba(77,139,255,.4)]" : "border-white/10 bg-black/25 hover:border-white/25"}`}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#4d8bff] to-[#8b6bff] font-display text-xs font-semibold text-white">
                    {(c.user_name || c.user_email || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-white">{c.title || "Untitled"}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                      {c.user_name || c.user_email || "Unknown"} ·
                      <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-cyan-200">{c.visa_type || "general"}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-500">
                    <b className="block text-[12px] text-white">{c.message_count ?? 0}</b>
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex max-h-[520px] flex-col overflow-hidden rounded-[14px] border border-white/10 bg-black/25">
              {selected ? (
                <>
                  <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#171c2a]/60 to-transparent p-3.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#4d8bff] to-[#8b6bff] font-display text-xs font-semibold text-white">
                      {(selected.user_name || selected.user_email || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[13px] text-white">{selected.title || "Untitled"}</b>
                      <span className="truncate text-[11px] text-slate-500">{selected.user_name || selected.user_email} · {selected.message_count ?? 0} messages</span>
                    </div>
                    <button onClick={() => setSelected(null)} className="rounded-md p-1.5 text-slate-400 hover:text-white"><X size={15} /></button>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {msgLoading ? (
                      <div className="py-8 text-center text-slate-500"><Loader2 size={18} className="mx-auto animate-spin" /></div>
                    ) : messages.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">No messages.</div>
                    ) : messages.map((m) => (
                      <div key={m.id} className={`max-w-[85%] rounded-xl border p-3 text-[12.5px] leading-relaxed ${m.role === "user" ? "ml-auto rounded-br-sm border-[#4d8bff]/28 bg-[#4d8bff]/[0.12] text-blue-100" : "rounded-bl-sm border-white/10 bg-white/[0.04] text-slate-300"}`}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          <b className={m.role === "user" ? "text-[#8fb8ff]" : "text-cyan-300"}>{m.role}</b>
                        </div>
                        {m.content}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
                  <MessageSquare size={22} className="opacity-40" />
                  <div className="text-sm">Select a conversation to review</div>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* ERRORS */}
        <SectionTitle title="Recent Errors & Escalations" tag="real-time" />
        <Panel>
          {!stats || stats.recentErrors.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No recent errors. All requests completing cleanly.</div>
          ) : (
            <div className="space-y-2">
              {stats.recentErrors.map((e) => (
                <div key={e.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-red-800/15 bg-red-900/[0.05] p-2.5 text-xs">
                  <span className="rounded bg-red-800/25 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-red-300">{e.feature}</span>
                  <div className="truncate text-slate-400"><b className="font-medium text-white">{e.model || "unknown model"}</b> — {e.error}</div>
                  <span className="font-mono text-[10px] text-slate-500">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
