"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot, Activity, BarChart3, ThumbsUp, AlertTriangle, MessageSquare, Loader2,
  Database, Server, Cpu, Star, X,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

type HealthReport = {
  overall: "healthy" | "degraded";
  services: { name: string; status: "up" | "down" | "not_configured"; latencyMs: number | null }[];
};

type AIStats = {
  usage: { total_requests: number; avg_tokens: number; avg_response_time: number; error_rate: number };
  feedback: { avg_rating: number; total_feedback: number };
  conversations: number;
  modelUsage: { feature: string; count: number }[];
  byModel: { model: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  recentErrors: { id: string; feature: string; model: string | null; error: string; created_at: string }[];
};

type TimelinePoint = { hour: string; requests: number; p95: number };

type Conversation = {
  id: string; title: string; user_name: string; user_email: string; message_count: number; created_at: string;
};

type Message = { id: string; role: string; content: string; created_at: string };

const NEON = {
  blue: "#4d8bff", violet: "#8b6bff", cyan: "#3ee6ff", magenta: "#ff5cd1", lime: "#7bff9b", amber: "#ffb84d",
};

function buildPath(values: number[], w: number, h: number, pad = 2): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function Probe({ label, status, latencyMs }: { label: string; status: string; latencyMs: number | null }) {
  const color = status === "up" ? NEON.lime : status === "not_configured" ? "#5a6a91" : "#ff5c7a";
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/25 px-3.5 py-2 min-w-[150px]">
      <span className="relative h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
        <div className="font-mono text-xs font-semibold text-white">
          {status === "not_configured" ? "not configured" : status === "up" ? `up · ${latencyMs}ms` : "down"}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, unit, color }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; unit?: string; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/80 to-[#0f1424]/60 p-4 transition hover:-translate-y-0.5 hover:border-white/25">
      <div className="absolute left-0 right-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.8 }} />
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        <Icon size={16} />
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold leading-tight text-white">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

export default function AIConfigPage() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<"features" | "models">("features");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [healthRes, statsRes, timelineRes] = await Promise.all([
          authFetch("/api/admin/health", { signal: ctrl.signal }),
          authFetch("/api/admin/ai/stats", { signal: ctrl.signal }, 15000),
          authFetch("/api/admin/ai/usage-timeline?hours=24", { signal: ctrl.signal }),
        ]);
        if (healthRes.ok) setHealth(await healthRes.json());
        if (!statsRes.ok) throw new Error("Failed to load AI stats");
        setStats(await statsRes.json());
        if (timelineRes.ok) setTimeline((await timelineRes.json()).series ?? []);
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
    { icon: Activity, label: "Total Requests", value: stats.usage.total_requests?.toLocaleString() ?? "0", color: NEON.blue },
    { icon: BarChart3, label: "Avg Response", value: String(stats.usage.avg_response_time ?? 0), unit: "ms", color: NEON.cyan },
    { icon: Star, label: "Avg Rating", value: String(stats.feedback.avg_rating ?? 0), unit: "/ 5", color: NEON.amber },
    { icon: AlertTriangle, label: "Error Rate", value: `${stats.usage.error_rate ?? 0}`, unit: "%", color: (stats.usage.error_rate ?? 0) > 5 ? "#ff5c7a" : NEON.lime },
    { icon: MessageSquare, label: "Conversations", value: stats.conversations?.toLocaleString() ?? "0", color: NEON.violet },
    { icon: ThumbsUp, label: "Feedback", value: stats.feedback.total_feedback?.toLocaleString() ?? "0", color: NEON.magenta },
  ] : [];

  const activeBreakdown = useMemo(() => {
    if (!stats) return [];
    const rows = breakdownTab === "features"
      ? stats.modelUsage.map((m) => ({ name: m.feature, count: m.count }))
      : stats.byModel.map((m) => ({ name: m.model, count: m.count }));
    const total = rows.reduce((s, r) => s + r.count, 0) || 1;
    return rows.map((r) => ({ ...r, pct: Math.round((r.count / total) * 100) }));
  }, [stats, breakdownTab]);

  const ratingTotal = stats?.ratingDistribution.reduce((s, r) => s + r.count, 0) || 1;
  const ringPct = stats ? Math.max(0, Math.min(100, (stats.feedback.avg_rating / 5) * 100)) : 0;
  const ringCirc = 2 * Math.PI * 54;

  const requestsPath = buildPath(timeline.map((t) => t.requests), 100, 30);
  const p95Path = buildPath(timeline.map((t) => t.p95), 100, 30);

  return (
    <div className="min-h-full bg-[#05070d] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white sm:text-3xl">
            <Bot className="text-[#8b6bff]" /> AI Control Center
          </h1>
          <p className="text-sm text-slate-400">Monitor every request, every token, every conversation across the reasoning engine.</p>
        </header>

        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
            <AlertTriangle size={14} /> {err}
          </div>
        )}

        {/* HERO / PROBES */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/85 to-[#0f1424]/55 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
              System Status: {health?.overall ?? "checking…"}
            </div>
            <div className="flex flex-wrap gap-2">
              {(health?.services ?? []).map((s) => (
                <Probe key={s.name} label={s.name} status={s.status} latencyMs={s.latencyMs} />
              ))}
            </div>
          </div>
        </section>

        {/* KPI ROW */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats ? kpis.map((k) => <Kpi key={k.label} {...k} />) : Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </section>

        {/* BREAKDOWN + FEEDBACK */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/70 to-[#0f1424]/50 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-white">
                  <BarChart3 size={15} className="text-[#8b6bff]" /> Usage Breakdown
                </h3>
                <p className="text-xs text-slate-500">Requests routed by {breakdownTab === "features" ? "feature" : "model"}</p>
              </div>
              <div className="inline-flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
                {(["features", "models"] as const).map((tab) => (
                  <button key={tab} onClick={() => setBreakdownTab(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${breakdownTab === tab ? "bg-gradient-to-br from-blue-500/40 to-violet-500/30 text-white" : "text-slate-400 hover:text-white"}`}
                  >{tab}</button>
                ))}
              </div>
            </div>

            {activeBreakdown.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No usage data yet.</div>
            ) : (
              <div className="space-y-3.5">
                {activeBreakdown.map((row) => (
                  <div key={row.name} className="grid grid-cols-[140px_1fr_70px] items-center gap-3 text-sm">
                    <div className="truncate font-medium text-slate-300 capitalize">{(row.name || "unknown").replace(/_/g, " ")}</div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#4d8bff] to-[#3ee6ff]" style={{ width: `${row.pct}%`, boxShadow: "0 0 10px #4d8bff" }} />
                    </div>
                    <div className="text-right font-mono text-xs font-semibold text-white">{row.count.toLocaleString()}<span className="ml-1 text-slate-500">{row.pct}%</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/70 to-[#0f1424]/50 p-5">
            <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-white">
              <ThumbsUp size={15} className="text-[#8b6bff]" /> User Feedback
            </h3>
            <div className="mb-5 flex items-center gap-5">
              <div className="relative h-[110px] w-[110px] shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="54" strokeWidth="10" fill="none" stroke="rgba(120,140,200,.15)" />
                  <circle cx="60" cy="60" r="54" strokeWidth="10" fill="none" stroke="url(#ring-grad)" strokeLinecap="round"
                    strokeDasharray={ringCirc} strokeDashoffset={ringCirc - (ringPct / 100) * ringCirc}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)" }} />
                  <defs>
                    <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={NEON.cyan} /><stop offset="50%" stopColor={NEON.blue} /><stop offset="100%" stopColor={NEON.violet} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <b className="font-display text-2xl text-white">{stats?.feedback.avg_rating ?? "—"}</b>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">avg / 5</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300"><b className="text-white">{stats?.feedback.total_feedback?.toLocaleString() ?? 0}</b> ratings collected</div>
              </div>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats?.ratingDistribution.find((r) => r.rating === star)?.count ?? 0;
                const pct = Math.round((count / ratingTotal) * 100);
                return (
                  <div key={star} className="grid grid-cols-[24px_1fr_36px] items-center gap-2.5 text-xs text-slate-400">
                    <span>{star}★</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#8b6bff] to-[#3ee6ff]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-right font-mono text-white">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* LIVE VOLUME */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/70 to-[#0f1424]/50 p-5">
          <div className="mb-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-white">
              <Activity size={15} className="text-[#8b6bff]" /> Requests &amp; Response Latency
            </h3>
            <p className="text-xs text-slate-500">Solid: requests / hour · Dashed: p95 response time — rolling 24h</p>
          </div>
          {timeline.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No requests in the last 24 hours.</div>
          ) : (
            <div className="relative h-[180px] w-full">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="vol-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NEON.blue} stopOpacity=".4" />
                    <stop offset="100%" stopColor={NEON.blue} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${requestsPath} L100,30 L0,30 Z`} fill="url(#vol-fade)" stroke="none" />
                <path d={requestsPath} fill="none" stroke={NEON.blue} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                <path d={p95Path} fill="none" stroke={NEON.violet} strokeWidth="0.4" strokeDasharray="1 1.4" vectorEffect="non-scaling-stroke" opacity="0.8" />
              </svg>
            </div>
          )}
        </section>

        {/* CONVERSATIONS + ERRORS */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/70 to-[#0f1424]/50 p-5">
            <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-white">
              <MessageSquare size={15} className="text-[#8b6bff]" /> Recent Conversations
            </h3>
            {convLoading ? (
              <div className="py-10 text-center text-slate-500"><Loader2 size={20} className="mx-auto mb-2 animate-spin" /> Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No conversations yet.</div>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {conversations.map((c) => (
                  <button key={c.id} onClick={() => openConversation(c)}
                    className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3 text-left transition ${selected?.id === c.id ? "border-blue-400/50 bg-[#171c2a]/70" : "border-white/10 bg-black/25 hover:border-white/25"}`}
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#4d8bff] to-[#8b6bff] font-display text-xs font-semibold text-white">
                      {(c.user_name || c.user_email || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{c.title || "Untitled"}</div>
                      <div className="truncate text-xs text-slate-500">{c.user_name || c.user_email || "Unknown"} · {c.message_count ?? 0} messages</div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-slate-500">{new Date(c.created_at).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected ? (
            <div className="flex max-h-[500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="flex items-center gap-3 border-b border-white/10 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{selected.title || "Untitled"}</div>
                  <div className="truncate text-xs text-slate-500">{selected.user_name || selected.user_email}</div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-md p-1 text-slate-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {msgLoading ? (
                  <div className="py-8 text-center text-slate-500"><Loader2 size={18} className="mx-auto animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No messages.</div>
                ) : messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded-xl border p-3 text-xs leading-relaxed ${m.role === "user" ? "ml-auto border-blue-400/30 bg-blue-500/10 text-blue-100" : "border-white/10 bg-white/5 text-slate-300"}`}>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{m.role}</div>
                    {m.content}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171c2a]/70 to-[#0f1424]/50 p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-white">
                <AlertTriangle size={15} className="text-[#ff5c7a]" /> Recent Errors
              </h3>
              {!stats || stats.recentErrors.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No recent errors. 🎉</div>
              ) : (
                <div className="space-y-2">
                  {stats.recentErrors.map((e) => (
                    <div key={e.id} className="rounded-lg border border-red-800/30 bg-red-900/10 p-2.5 text-xs">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="rounded bg-red-800/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-red-300">{e.feature}{e.model ? ` · ${e.model}` : ""}</span>
                        <span className="font-mono text-[10px] text-slate-500">{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      <div className="truncate text-slate-400">{e.error}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* STATUS ROW */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border-l-2 border-emerald-400 bg-white/5 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Database size={11} /> Postgres</div>
            <div className="font-display text-lg font-bold text-white">{health?.services.find((s) => s.name === "postgres")?.latencyMs ?? "—"}ms</div>
          </div>
          <div className="rounded-xl border-l-2 border-emerald-400 bg-white/5 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Server size={11} /> Redis</div>
            <div className="font-display text-lg font-bold text-white">{health?.services.find((s) => s.name === "redis")?.latencyMs ?? "—"}ms</div>
          </div>
          <div className="rounded-xl border-l-2 border-amber-400 bg-white/5 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Cpu size={11} /> AI Service</div>
            <div className="font-display text-lg font-bold text-white">{health?.services.find((s) => s.name === "ai")?.latencyMs ?? "—"}ms</div>
          </div>
          <div className="rounded-xl border-l-2 border-red-400 bg-white/5 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><AlertTriangle size={11} /> Errors (recent)</div>
            <div className="font-display text-lg font-bold text-white">{stats?.recentErrors.length ?? 0}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
