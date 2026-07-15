"use client";

import { useEffect, useState } from "react";
import {
  Users, ShieldCheck, Flag, FileText, TrendingUp, AlertTriangle, Activity, Bot,
  GraduationCap, Briefcase, Building2, Bell, BarChart3, MessageSquare, Home, Award,
} from "lucide-react";
import Link from "next/link";
import { authFetch } from "@/lib/auth";

type HealthProbe = { name: string; status: "up" | "down" | "not_configured"; latencyMs: number | null; detail?: string };
type DashboardStats = Record<string, number>;

const HEALTH_LABELS: Record<string, string> = { postgres: "PostgreSQL", redis: "Redis cache", ai: "AI service" };

export default function AdminOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthProbe[] | null>(null);
  const [healthErr, setHealthErr] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/admin/dashboard", { signal: ctrl.signal }, 60000);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load stats");
        setStats(data.stats);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await authFetch("/api/admin/health", {}, 15000);
        const data = await res.json();
        if (!res.ok) throw new Error("health check failed");
        if (active) { setHealth(data.services as HealthProbe[]); setHealthErr(false); }
      } catch { if (active) setHealthErr(true); }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const statCards = stats ? [
    { label: "Total Users", value: stats.total_users?.toLocaleString() ?? "0", icon: Users, tone: "clay", href: "/admin/users" },
    { label: "Students", value: stats.students?.toLocaleString() ?? "0", icon: GraduationCap, tone: "sky", href: "/admin/users?role=student" },
    { label: "Mentors", value: stats.mentors?.toLocaleString() ?? "0", icon: CompassIcon, tone: "leaf", href: "/admin/users?role=mentor" },
    { label: "Employers", value: stats.employers?.toLocaleString() ?? "0", icon: Building2, tone: "amber", href: "/admin/users?role=employer" },
    { label: "Pending Verifications", value: stats.pending_verifications?.toLocaleString() ?? "0", icon: ShieldCheck, tone: "amber", warn: (stats.pending_verifications ?? 0) > 10, href: "/admin/mentor-verifications" },
    { label: "Open Reports", value: stats.reports?.toLocaleString() ?? "0", icon: Flag, tone: "red", href: "/admin/reports" },
    { label: "Scholarships", value: stats.scholarships?.toLocaleString() ?? "0", icon: Award, tone: "leaf", href: "/admin/content" },
    { label: "Housing Listings", value: stats.housing_listings?.toLocaleString() ?? "0", icon: Home, tone: "sky", href: "/admin/content" },
    { label: "Forum Posts", value: stats.forum_posts?.toLocaleString() ?? "0", icon: MessageSquare, tone: "clay", href: "/admin/content" },
    { label: "AI Conversations", value: stats.ai_conversations?.toLocaleString() ?? "0", icon: Bot, tone: "purple", href: "/admin/ai" },
  ] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900">Admin Dashboard</h1>
          <p className="text-sm text-ink-600 mt-1">Platform overview and management center.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${healthErr ? "bg-red-500/10 text-red-600" : "bg-leaf-500/10 text-leaf-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${healthErr ? "bg-red-500" : "bg-leaf-500"}`} />
            {healthErr ? "System Degraded" : "All Systems Online"}
          </span>
        </div>
      </header>

      {err && (
        <div className="card border-red-300 text-sm text-red-600">Couldn&apos;t load stats: {err}</div>
      )}

      {!stats && !err && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="w-10 h-10 rounded-lg bg-cream-200" /><div className="mt-4 h-8 w-20 bg-cream-200 rounded" /><div className="mt-1 h-4 w-24 bg-cream-200 rounded" /></div>
          ))}
        </div>
      )}

      {statCards && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {statCards.map((s) => (
            <Link key={s.label} href={s.href} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  s.tone === "clay" ? "bg-clay-500/15 text-clay-600" :
                  s.tone === "amber" ? "bg-amber-500/15 text-amber-500" :
                  s.tone === "red" ? "bg-red-500/15 text-red-600" :
                  s.tone === "sky" ? "bg-sky-500/15 text-sky-600" :
                  s.tone === "leaf" ? "bg-leaf-500/15 text-leaf-600" :
                  s.tone === "purple" ? "bg-purple-500/15 text-purple-600" :
                  "bg-clay-500/15 text-clay-600"
                }`}>
                  <s.icon size={18} />
                </div>
                {s.warn && <AlertTriangle size={14} className="text-amber-500" />}
              </div>
              <p className="mt-4 text-xl sm:text-2xl font-display font-semibold text-ink-900">{s.value}</p>
              <p className="text-xs text-ink-500 mt-1">{s.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* System Status */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900">System Status</h2>
            <Activity size={14} className={healthErr ? "text-red-500" : "text-ink-500"} />
          </div>
          {healthErr && <p className="text-xs text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1" /> Unable to reach API health endpoint.</p>}
          {!health && !healthErr && <ul className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <li key={i} className="flex items-center justify-between"><span className="h-3 w-24 rounded bg-cream-200 animate-pulse" /><span className="h-3 w-16 rounded bg-cream-200 animate-pulse" /></li>)}</ul>}
          {health && <ul className="space-y-3">{health.map((s) => {
            const label = HEALTH_LABELS[s.name] ?? s.name;
            const cfg = s.status === "up" ? { text: "Online", dot: "bg-leaf-500", tone: "text-leaf-600" } : s.status === "not_configured" ? { text: "Not configured", dot: "bg-ink-300", tone: "text-ink-500" } : { text: "Down", dot: "bg-red-500", tone: "text-red-600" };
            return <li key={s.name} className="flex items-center justify-between text-sm"><span className="text-ink-700">{label}</span><span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.tone}`}>{s.status === "up" && s.latencyMs != null && <span className="text-ink-400 tabular-nums">{s.latencyMs}ms</span>}<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.text}</span></li>;
          })}</ul>}
        </div>

        {/* Quick Actions */}
        <div className="card lg:col-span-1">
          <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2">
            {[
              { href: "/admin/users", label: "Manage Users", icon: Users },
              { href: "/admin/mentor-verifications", label: "Review Verifications", icon: ShieldCheck },
              { href: "/admin/reports", label: "Review Reports", icon: Flag },
              { href: "/admin/notifications", label: "Send Notification", icon: Bell },
              { href: "/admin/settings", label: "Platform Settings", icon: SettingsIcon },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-3 p-2.5 rounded-lg border border-cream-200 hover:border-clay-300 transition text-sm">
                <div className="w-8 h-8 rounded-md bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0"><l.icon size={14} /></div>
                <span className="font-medium text-ink-900">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Community Breakdown */}
        {stats && <div className="card lg:col-span-1">
          <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900 mb-4">Community</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Students", value: stats.students, icon: GraduationCap },
              { label: "Mentors", value: stats.mentors, icon: CompassIcon },
              { label: "Employers", value: stats.employers, icon: Building2 },
              { label: "Admins", value: (stats.admins ?? 0) + 1, icon: Users },
            ].map((r) => (
              <div key={r.label} className="rounded-lg border border-cream-200 p-3 text-center">
                <r.icon size={16} className="mx-auto text-ink-400 mb-1" />
                <p className="text-lg font-display font-semibold text-ink-900">{(r.value ?? 0).toLocaleString()}</p>
                <p className="text-xs text-ink-500">{r.label}</p>
              </div>
            ))}
          </div>
        </div>}
      </div>

      {/* Growth Stats */}
      {stats && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Daily Active Users", value: stats.daily_users ?? 0 },
          { label: "Monthly Active Users", value: stats.monthly_users ?? 0 },
          { label: "Approved Verifications", value: stats.approved_verifications ?? 0 },
          { label: "Rejected Verifications", value: stats.rejected_verifications ?? 0 },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs text-ink-500">{s.label}</p>
            <p className="text-xl font-display font-semibold text-ink-900 mt-1">{(s.value ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </div>}
    </div>
  );
}

function CompassIcon(props: { size?: number; className?: string }) { return <Briefcase size={props.size ?? 16} className={props.className} />; }
function SettingsIcon(props: { size?: number; className?: string }) { return <BarChart3 size={props.size ?? 16} className={props.className} />; }
