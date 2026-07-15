"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, MessageSquare, Briefcase, Bot, Globe2, MapPin,
  Users, ChevronDown, Calendar,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

type UserGrowthPoint = { date: string; students: number; mentors: number; employers: number; total: number };
type OpportunitiesPoint = { date: string; count: number };
type ForumsPoint = { date: string; posts: number; comments: number };
type AiUsagePoint = { date: string; conversations: number; messages: number; tokens: number };
type LanguageStat = { language: string; count: number; percentage: number };
type CountryStat = { country: string; count: number; percentage: number };

type AnalyticsData = {
  userGrowth: UserGrowthPoint[];
  opportunities: OpportunitiesPoint[];
  forums: ForumsPoint[];
  aiUsage: AiUsagePoint[];
  languages: LanguageStat[];
  countries: CountryStat[];
};

type TimeRange = 7 | 30 | 90;

const DAYS_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function maxValue(values: number[]): number {
  const m = Math.max(...values, 1);
  return Math.ceil(m / 5) * 5 || 5;
}

function SvgBarChart({ data, bars, height = 180 }: {
  data: { label: string; values: number[] }[];
  bars: { key: string; color: string }[];
  height?: number;
}) {
  if (data.length === 0) return null;
  const allVals = data.flatMap((d) => d.values);
  const max = maxValue(allVals);
  const barGroupWidth = 28;
  const gap = data.length > 20 ? 2 : 6;
  const width = Math.max(data.length * (barGroupWidth + gap) + 40, 300);
  const rowCount = 4;
  const rowStep = max / rowCount;

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        {bars.map((b) => (
          <linearGradient key={b.key} id={`grad-${b.key.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={b.color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={b.color} stopOpacity="0.5" />
          </linearGradient>
        ))}
      </defs>

      {Array.from({ length: rowCount + 1 }).map((_, i) => {
        const y = height - (height / rowCount) * i;
        const val = Math.round(rowStep * i);
        return (
          <g key={i}>
            <line x1="30" y1={y} x2={width - 10} y2={y} stroke="#E8E0D8" strokeWidth="1" />
            <text x="28" y={y + 4} textAnchor="end" fill="#8C8178" fontSize="9">{val}</text>
          </g>
        );
      })}

      {data.map((d, idx) => {
        const x = 40 + idx * (barGroupWidth + gap);
        const barW = barGroupWidth / bars.length - 2;
        const skipLabel = data.length > 20 && idx % 5 !== 0;
        return (
          <g key={idx}>
            {d.values.map((v, vi) => {
              const barH = (v / max) * (height - 4);
              return barH > 0 ? (
                <rect
                  key={vi}
                  x={x + vi * (barW + 2)}
                  y={height - barH}
                  width={Math.max(barW, 3)}
                  height={barH}
                  rx="2"
                  fill={`url(#grad-${bars[vi].key.replace(/\s/g, "")})`}
                />
              ) : null;
            })}
            {!skipLabel && (
              <text x={x + barGroupWidth / 2} y={height + 16} textAnchor="end" fill="#8C8178" fontSize="8" transform={`rotate(-45, ${x + barGroupWidth / 2}, ${height + 16})`}>
                {d.label.length > 5 ? d.label.slice(5) : d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SvgStackedBarChart({ data, height = 180 }: {
  data: { label: string; students: number; mentors: number; employers: number }[];
  height?: number;
}) {
  if (data.length === 0) return null;
  const allVals = data.flatMap((d) => [d.students, d.mentors, d.employers]);
  const max = maxValue(allVals);
  const barW = 16;
  const gap = data.length > 20 ? 2 : 6;
  const width = Math.max(data.length * (barW + gap) + 40, 300);
  const rowCount = 4;
  const rowStep = max / rowCount;
  const colors = ["#14B8A6", "#F59E0B", "#6366F1"];
  const keys = ["Students", "Mentors", "Employers"];

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: rowCount + 1 }).map((_, i) => {
        const y = height - (height / rowCount) * i;
        const val = Math.round(rowStep * i);
        return (
          <g key={i}>
            <line x1="30" y1={y} x2={width - 10} y2={y} stroke="#E8E0D8" strokeWidth="1" />
            <text x="28" y={y + 4} textAnchor="end" fill="#8C8178" fontSize="9">{val}</text>
          </g>
        );
      })}
      {data.map((d, idx) => {
        const x = 40 + idx * (barW + gap);
        const skipLabel = data.length > 20 && idx % 5 !== 0;
        let yOff = 0;
        const segments = [
          { val: d.students, color: colors[0] },
          { val: d.mentors, color: colors[1] },
          { val: d.employers, color: colors[2] },
        ];
        return (
          <g key={idx}>
            {segments.map((seg, si) => {
              const h = (seg.val / max) * (height - 4);
              const y = height - yOff - h;
              yOff += h;
              return h > 0 ? (
                <rect key={si} x={x} y={y} width={barW} height={h} rx="1" fill={seg.color} opacity="0.85" />
              ) : null;
            })}
            {!skipLabel && (
              <text x={x + barW / 2} y={height + 16} textAnchor="end" fill="#8C8178" fontSize="8" transform={`rotate(-45, ${x + barW / 2}, ${height + 16})`}>
                {d.label.length > 5 ? d.label.slice(5) : d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MiniBar({ values, color = "#14B8A6", height = 40 }: { values: number[]; color?: string; height?: number }) {
  const max = maxValue(values);
  return (
    <div className="flex items-end gap-[2px] h-full">
      {values.map((v, i) => {
        const pct = max > 0 ? (v / max) * 100 : 0;
        return (
          <div
            key={i}
            className="rounded-sm transition-all duration-300 flex-1"
            style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color, opacity: 0.8 }}
          />
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<TimeRange>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const endpoints = [
          authFetch(`/api/admin/analytics/user-growth?days=${days}`, { signal: ctrl.signal }),
          authFetch(`/api/admin/analytics/opportunities?days=${days}`, { signal: ctrl.signal }),
          authFetch(`/api/admin/analytics/forums?days=${days}`, { signal: ctrl.signal }),
          authFetch(`/api/admin/analytics/ai-usage?days=${days}`, { signal: ctrl.signal }),
          authFetch(`/api/admin/analytics/languages`, { signal: ctrl.signal }),
          authFetch(`/api/admin/countries`, { signal: ctrl.signal }),
        ];
        const results = await Promise.allSettled(endpoints);
        const jsonResults = await Promise.allSettled(
          results.map((r) => r.status === "fulfilled" ? r.value.json() : Promise.reject())
        );

        const getData = <T,>(idx: number, fallback: T): T => {
          const r = jsonResults[idx];
          return r.status === "fulfilled" ? (r.value as any).data ?? r.value ?? fallback : fallback;
        };

        setData({
          userGrowth: getData<UserGrowthPoint[]>(0, []),
          opportunities: getData<OpportunitiesPoint[]>(1, []),
          forums: getData<ForumsPoint[]>(2, []),
          aiUsage: getData<AiUsagePoint[]>(3, []),
          languages: getData<LanguageStat[]>(4, []),
          countries: getData<CountryStat[]>(5, []),
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [days]);

  const totalGrowth = data?.userGrowth.reduce((s, d) => s + d.total, 0) ?? 0;
  const totalOpps = data?.opportunities.reduce((s, d) => s + d.count, 0) ?? 0;
  const totalPosts = data?.forums.reduce((s, d) => s + d.posts, 0) ?? 0;
  const totalComments = data?.forums.reduce((s, d) => s + d.comments, 0) ?? 0;
  const totalAi = data?.aiUsage.reduce((s, d) => s + d.conversations, 0) ?? 0;
  const totalAiMsgs = data?.aiUsage.reduce((s, d) => s + d.messages, 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900">Analytics</h1>
          <p className="text-sm text-ink-600 mt-1">Platform metrics over time.</p>
        </div>
        <div className="relative">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as TimeRange)}
            className="input text-sm appearance-none pr-8 min-w-[140px]"
          >
            {DAYS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
        </div>
      </header>

      {err && (
        <div className="card border-red-300 text-sm text-red-600">
          Couldn&apos;t load analytics: {err}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse space-y-3">
                <div className="w-8 h-8 rounded-lg bg-cream-200" />
                <div className="h-7 w-16 bg-cream-200 rounded" />
                <div className="h-4 w-24 bg-cream-200 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 w-32 bg-cream-200 rounded mb-4" />
                <div className="h-40 bg-cream-200 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 w-32 bg-cream-200 rounded mb-4" />
                <div className="h-40 bg-cream-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stat cards */}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "New Registrations", value: totalGrowth.toLocaleString(), icon: Users, color: "text-teal-600 bg-teal-500/15" },
              { label: "Opportunities", value: totalOpps.toLocaleString(), icon: Briefcase, color: "text-amber-600 bg-amber-500/15" },
              { label: "Forum Activity", value: (totalPosts + totalComments).toLocaleString(), sub: `${totalPosts} posts · ${totalComments} comments`, icon: MessageSquare, color: "text-indigo-600 bg-indigo-500/15" },
              { label: "AI Conversations", value: totalAi.toLocaleString(), sub: `${totalAiMsgs.toLocaleString()} messages`, icon: Bot, color: "text-purple-600 bg-purple-500/15" },
            ].map((s) => (
              <div key={s.label} className="card">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={18} />
                  </div>
                </div>
                <p className="mt-4 text-xl sm:text-2xl font-display font-semibold text-ink-900">{s.value}</p>
                <p className="text-xs text-ink-500 mt-1">{s.label}</p>
                {s.sub && <p className="text-[10px] text-ink-400 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Charts row 1 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* User Growth */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900">User Growth by Role</h2>
                <TrendingUp size={16} className="text-ink-400" />
              </div>
              {data.userGrowth.length === 0 ? (
                <EmptyChart />
              ) : (
                <>
                  <SvgStackedBarChart data={data.userGrowth.map((d) => ({ label: d.date, students: d.students, mentors: d.mentors, employers: d.employers }))} height={180} />
                  <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500" /> Students</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Mentors</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Employers</span>
                  </div>
                </>
              )}
            </div>

            {/* Opportunities */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900">Opportunities Posted</h2>
                <Briefcase size={16} className="text-ink-400" />
              </div>
              {data.opportunities.length === 0 ? (
                <EmptyChart />
              ) : (
                <>
                  <SvgBarChart
                    data={data.opportunities.map((d) => ({ label: d.date, values: [d.count] }))}
                    bars={[{ key: "opportunities", color: "#F59E0B" }]}
                    height={180}
                  />
                  <MiniBar values={data.opportunities.map((d) => d.count)} color="#F59E0B" />
                </>
              )}
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Forum Activity */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900">Forum Activity</h2>
                <MessageSquare size={16} className="text-ink-400" />
              </div>
              {data.forums.length === 0 ? (
                <EmptyChart />
              ) : (
                <>
                  <SvgBarChart
                    data={data.forums.map((d) => ({ label: d.date, values: [d.posts, d.comments] }))}
                    bars={[
                      { key: "posts", color: "#6366F1" },
                      { key: "comments", color: "#14B8A6" },
                    ]}
                    height={180}
                  />
                  <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Posts</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500" /> Comments</span>
                  </div>
                </>
              )}
            </div>

            {/* AI Usage */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900">AI Usage</h2>
                <Bot size={16} className="text-ink-400" />
              </div>
              {data.aiUsage.length === 0 ? (
                <EmptyChart />
              ) : (
                <>
                  <SvgBarChart
                    data={data.aiUsage.map((d) => ({ label: d.date, values: [d.conversations, d.messages] }))}
                    bars={[
                      { key: "conversations", color: "#A855F7" },
                      { key: "messages", color: "#14B8A6" },
                    ]}
                    height={180}
                  />
                  <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Conversations</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500" /> Messages</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Language & Country stats */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Language Distribution */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900">Language Distribution</h2>
                <Globe2 size={16} className="text-ink-400" />
              </div>
              {data.languages.length === 0 ? (
                <p className="text-sm text-ink-500">No language data available.</p>
              ) : (
                <div className="space-y-3">
                  {data.languages.slice(0, 8).map((l) => (
                    <div key={l.language} className="flex items-center gap-3">
                      <span className="text-sm text-ink-900 w-24 sm:w-32 truncate shrink-0">{l.language}</span>
                      <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all"
                          style={{ width: `${Math.min(l.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-500 w-12 text-right tabular-nums">{l.percentage.toFixed(1)}%</span>
                      <span className="text-xs text-ink-400 w-16 text-right tabular-nums">{l.count.toLocaleString()}</span>
                    </div>
                  ))}
                  {data.languages.length > 8 && (
                    <p className="text-xs text-ink-400 pt-1">+{data.languages.length - 8} more</p>
                  )}
                </div>
              )}
            </div>

            {/* Country Statistics */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900">Country Statistics</h2>
                <MapPin size={16} className="text-ink-400" />
              </div>
              {data.countries.length === 0 ? (
                <p className="text-sm text-ink-500">No country data available.</p>
              ) : (
                <div className="space-y-3">
                  {data.countries.slice(0, 8).map((c) => (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="text-sm text-ink-900 w-24 sm:w-32 truncate shrink-0">{c.country}</span>
                      <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${Math.min(c.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-500 w-12 text-right tabular-nums">{c.percentage.toFixed(1)}%</span>
                      <span className="text-xs text-ink-400 w-16 text-right tabular-nums">{c.count.toLocaleString()}</span>
                    </div>
                  ))}
                  {data.countries.length > 8 && (
                    <p className="text-xs text-ink-400 pt-1">+{data.countries.length - 8} more</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-ink-400">
      <Calendar size={24} className="mb-2" />
      <p className="text-sm">No data for this period.</p>
    </div>
  );
}
