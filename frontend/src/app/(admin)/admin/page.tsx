"use client";

import { useEffect, useState } from "react";
import {
  Users, ShieldCheck, Flag, FileText, TrendingUp, AlertTriangle, Activity, Bot,
} from "lucide-react";
import Link from "next/link";
import { authFetch } from "@/lib/auth";

export default function AdminOverview() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/users/summary/all", { signal: ctrl.signal }, 60000);
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

  const statCards = stats ? [
    { label: "Total users", value: stats.total_users.toLocaleString(), delta: "All time", icon: Users, tone: "clay" as const },
    { label: "Pending verifications", value: stats.pending_verifications.toLocaleString(), delta: "Awaiting review", icon: ShieldCheck, tone: "amber" as const, warn: stats.pending_verifications > 20 },
    { label: "Open reports", value: stats.open_reports.toLocaleString(), delta: "Flagged content", icon: Flag, tone: "red" as const },
    { label: "Active listings", value: stats.active_listings.toLocaleString(), delta: "Live on platform", icon: FileText, tone: "leaf" as const },
  ] : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-display font-semibold text-ink-900">Admin overview</h1>
        <p className="text-sm text-ink-600 mt-1">Platform health, moderation queue, and recent admin activity.</p>
      </header>

      {err && (
        <div className="card border-red-300 text-sm text-red-600">
          Couldn&apos;t load stats: {err}
        </div>
      )}

      {!stats && !err && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-cream-200" />
              <div className="mt-4 h-8 w-24 bg-cream-200 rounded" />
              <div className="mt-1 h-4 w-32 bg-cream-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {statCards && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="card">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  s.tone === "clay" ? "bg-clay-500/15 text-clay-600" :
                  s.tone === "amber" ? "bg-amber-500/15 text-amber-500" :
                  s.tone === "red" ? "bg-red-500/15 text-red-600" :
                  "bg-leaf-500/15 text-leaf-600"
                }`}>
                  <s.icon size={18} />
                </div>
                {s.warn && <AlertTriangle size={14} className="text-amber-500" />}
              </div>
              <p className="mt-4 text-2xl font-display font-semibold text-ink-900">{s.value}</p>
              <p className="text-xs text-ink-500 mt-1">{s.label}</p>
              <p className={`mt-2 text-xs font-medium flex items-center gap-1 ${
                s.warn ? "text-amber-500" : s.tone === "red" ? "text-red-600" : "text-leaf-600"
              }`}>
                <TrendingUp size={11} /> {s.delta}
              </p>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Community breakdown</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Students", value: stats.students },
                { label: "Mentors", value: stats.mentors },
                { label: "Employers", value: stats.employers },
                { label: "Admins", value: stats.admins },
              ].map((r) => (
                <div key={r.label} className="rounded-lg border border-cream-200 p-3 text-center">
                  <p className="text-xl font-display font-semibold text-ink-900">{(r.value ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{r.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Growth &amp; activity</h2>
            <ul className="space-y-2.5">
              {[
                { label: "New signups today", value: stats.new_today },
                { label: "New signups (7 days)", value: stats.new_7d },
                { label: "Opportunities posted", value: stats.total_opportunities },
                { label: "AI conversations", value: stats.ai_conversations },
                { label: "Success stories", value: stats.success_stories },
              ].map((r) => (
                <li key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{r.label}</span>
                  <span className="font-semibold text-ink-900">{(r.value ?? 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">Quick links</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/admin/users", label: "Manage users", icon: Users },
              { href: "/admin/verifications", label: "Verifications queue", icon: ShieldCheck },
              { href: "/admin/reports", label: "Open reports", icon: Flag },
              { href: "/admin/listings", label: "Listings review", icon: FileText },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-3 p-3 rounded-lg border border-cream-200 hover:border-clay-300 transition">
                <div className="w-8 h-8 rounded-md bg-clay-500/15 text-clay-600 flex items-center justify-center">
                  <l.icon size={14} />
                </div>
                <span className="text-sm font-medium text-ink-900">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">System status</h2>
            <Activity size={14} className="text-ink-500" />
          </div>
          <ul className="space-y-3">
            {[
              { label: "PostgreSQL", status: "Connected", ok: true },
              { label: "Redis cache", status: "Connected", ok: true },
              { label: "AI service", status: "Online", ok: true },
              { label: "Translation", status: "Online", ok: true },
            ].map((s) => (
              <li key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{s.label}</span>
                <span className={`flex items-center gap-1 text-xs font-medium ${s.ok ? "text-leaf-600" : "text-red-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-leaf-500" : "bg-red-500"}`} />
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
          <Bot size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-900">AI Immigration Assistant — Online</p>
          <p className="text-xs text-ink-500">Powered by Claude · Available on /assistant</p>
        </div>
        <Link href="/admin/ai" className="btn-ghost text-sm border border-cream-300">Configure</Link>
      </div>
    </div>
  );
}