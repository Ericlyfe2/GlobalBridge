"use client";

import { useEffect, useState } from "react";
import {
  Flag, AlertTriangle, Check, X, Loader2, ChevronUp, AlertCircle, MessageSquare,
  Home, User, FileText, ShieldAlert, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { authFetch } from "@/lib/auth";

type Report = {
  id: string; target_type: string; target_id: string; reason: string;
  details: string | null; status: string; created_at: string;
  reporter_name: string | null; resolver_name: string | null; resolved_at: string | null;
};

type ScamAlert = {
  id: string; title: string; description: string; scam_type: string | null;
  affected_countries: string[] | null; upvotes: number; created_at: string; reporter_name: string | null;
};

const TARGET_ICON: Record<string, typeof Flag> = {
  post: MessageSquare, forum_post: MessageSquare, comment: MessageSquare,
  listing: Home, housing: Home, user: User, profile: User, document: FileText,
};

function targetIcon(type: string) {
  return TARGET_ICON[type.toLowerCase()] ?? Flag;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all" | "reviewing">("pending");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
  const [openTotal, setOpenTotal] = useState<number | null>(null);
  const [scamAlerts, setScamAlerts] = useState<ScamAlert[] | null>(null);
  const limit = 20;

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("status", filter);
        params.set("limit", String(limit));
        params.set("page", String(page));
        const res = await authFetch(`/api/admin/reports?${params}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setReports(data.reports ?? []);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [filter, page]);

  // Platform-wide open-report count, independent of the current filter/page —
  // reuses the same dashboard stats the Overview page already pulls.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/admin/dashboard", { signal: ctrl.signal }, 30000);
        const data = await res.json();
        if (res.ok) setOpenTotal(data.stats?.reports ?? null);
      } catch { /* optional */ }
    })();
    return () => ctrl.abort();
  }, []);

  // Community scam reports — a separate, real data source from `reports`.
  // Read-only here: there's no admin resolve/dismiss action for scam_alerts
  // in the backend, so this panel links out to the full page rather than
  // faking moderation controls that don't exist yet.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/moderation/scam-alerts", { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok) setScamAlerts((data.alerts ?? []).slice(0, 3));
      } catch { /* optional */ }
    })();
    return () => ctrl.abort();
  }, []);

  async function updateReport(id: string, status: "resolved" | "dismissed" | "reviewing") {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status, resolved_by: "admin" } : r));
      if (selected?.id === id) setSelected(null);
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  function severityLabel(r: Report): { label: string; tone: string } {
    const highKeywords = ["scam", "fraud", "fake", "harassment", "threat", "abuse"];
    const isHigh = highKeywords.some((k) => (r.details ?? r.reason).toLowerCase().includes(k));
    if (isHigh) return { label: "High", tone: "!bg-red-500/15 !text-red-600" };
    if (r.reason.length > 20) return { label: "Med", tone: "!bg-amber-500/15 !text-amber-500" };
    return { label: "Low", tone: "!bg-cream-200 !text-ink-700" };
  }

  const filters = [
    { value: "pending" as const, label: "Open" },
    { value: "reviewing" as const, label: "Reviewing" },
    { value: "resolved" as const, label: "Resolved" },
    { value: "dismissed" as const, label: "Dismissed" },
    { value: "all" as const, label: "All" },
  ];

  const highSeverityOnPage = reports.filter((r) => r.status === "pending" && severityLabel(r).label === "High").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 dark:text-white">Safety &amp; Moderation</h1>
          <p className="text-sm text-ink-600 dark:text-gray-400 mt-1">Monitor and resolve community-flagged content and scam reports.</p>
        </div>
      </header>

      {/* Real summary strip — no fabricated "safety score", just the counts we actually have */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card">
          <p className="text-xs text-ink-500 flex items-center gap-1.5"><Flag size={12} /> Open reports</p>
          <p className="mt-2 text-2xl font-display font-semibold text-ink-900 dark:text-white">{openTotal ?? "—"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-amber-600 flex items-center gap-1.5"><AlertTriangle size={12} /> High severity (this page)</p>
          <p className="mt-2 text-2xl font-display font-semibold text-ink-900 dark:text-white">{highSeverityOnPage}</p>
        </div>
        <div className="card col-span-2 sm:col-span-1">
          <p className="text-xs text-ink-500 flex items-center gap-1.5"><ShieldAlert size={12} /> Community scam reports</p>
          <p className="mt-2 text-2xl font-display font-semibold text-ink-900 dark:text-white">{scamAlerts ? scamAlerts.length : "—"}<span className="text-sm font-normal text-ink-400"> recent</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Reports queue */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <button key={f.value}
                onClick={() => { setFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filter === f.value ? "bg-clay-500 text-white" : "bg-cream-100 dark:bg-gray-800 text-ink-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-700"}`}
              >{f.label}</button>
            ))}
          </div>

          {err && <div className="card border-red-300 text-sm text-red-600"><AlertTriangle size={14} className="inline mr-1" />{err}</div>}

          <div className="space-y-3">
            {loading && !err && (
              <div className="text-center py-10 text-ink-500"><Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading reports...</div>
            )}

            {!loading && !err && reports.length === 0 && (
              <div className="card text-center py-10 text-sm text-ink-500">
                <Check size={20} className="mx-auto mb-2 text-leaf-600" /> No {filter} reports found.
              </div>
            )}

            {reports.map((r) => {
              const severity = severityLabel(r);
              const isHigh = severity.label === "High";
              const Icon = targetIcon(r.target_type);
              return (
                <div key={r.id}
                  className={`card cursor-pointer ${isHigh && r.status === "pending" ? "border-red-300" : ""} ${selected?.id === r.id ? "ring-2 ring-clay-500" : ""}`}
                  onClick={() => setSelected(r)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHigh ? "bg-red-500/15 text-red-600" : "bg-cream-200 dark:bg-gray-800 text-ink-600 dark:text-gray-300"}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-ink-900 dark:text-white">{r.reason}</h3>
                        <span className={`badge ${severity.tone}`}>{severity.label}</span>
                        <span className="badge !bg-cream-200 dark:!bg-gray-800 !text-ink-700 dark:!text-gray-300 capitalize">{r.target_type}</span>
                      </div>
                      <p className="text-xs text-ink-600 dark:text-gray-400 mt-1 line-clamp-2">{r.details ?? "No additional details."}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-500">
                        <span>by {r.reporter_name ?? "Anonymous"}</span>
                        <span>·</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        {r.status !== "pending" && (
                          <><span>·</span><span className={`${r.status === "resolved" ? "text-leaf-600" : "text-ink-400"}`}>{r.status}</span></>
                        )}
                      </div>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => updateReport(r.id, "dismissed")} disabled={busyId === r.id} title="Dismiss"
                          className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200 dark:hover:bg-gray-800 transition">{busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}</button>
                        <button onClick={() => updateReport(r.id, "resolved")} disabled={busyId === r.id} title="Resolve"
                          className="p-1.5 rounded-md text-leaf-600 hover:bg-leaf-500/10 transition">{busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">{selected.reason}</h2>
                  <p className="text-xs text-ink-600 dark:text-gray-400 mt-1">
                    <span className="badge !bg-cream-200 dark:!bg-gray-800 !text-ink-700 dark:!text-gray-300 capitalize mr-2">{selected.target_type}</span>
                    {selected.reporter_name && <>Reported by {selected.reporter_name}</>}
                    <span className="ml-2">{new Date(selected.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200 dark:hover:bg-gray-800"><X size={14} /></button>
              </div>

              <div className="bg-cream-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-ink-600 dark:text-gray-400 mb-1">Details</p>
                <p className="text-sm text-ink-900 dark:text-gray-100">{selected.details || "No additional details provided."}</p>
              </div>

              <div className="bg-cream-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-ink-600 dark:text-gray-400 mb-1">Target ID</p>
                <p className="text-sm font-mono text-ink-900 dark:text-gray-100">{selected.target_id}</p>
              </div>

              {selected.resolver_name && (
                <div className="bg-cream-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium text-ink-600 dark:text-gray-400 mb-1">Resolution</p>
                  <p className="text-sm text-ink-900 dark:text-gray-100">
                    {selected.status === "resolved" ? "Resolved" : selected.status === "dismissed" ? "Dismissed" : "Under review"}
                    {selected.resolver_name && <> by {selected.resolver_name}</>}
                    {selected.resolved_at && <> on {new Date(selected.resolved_at).toLocaleString()}</>}
                  </p>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-200 dark:border-gray-800">
                  <button onClick={() => updateReport(selected.id, "dismissed")} disabled={busyId === selected.id}
                    className="btn-ghost text-sm border border-cream-300 flex items-center gap-1.5">
                    <X size={14} /> Dismiss
                  </button>
                  <button onClick={() => updateReport(selected.id, "reviewing")} disabled={busyId === selected.id}
                    className="btn-ghost text-sm border border-amber-300 text-amber-600 flex items-center gap-1.5">
                    <AlertCircle size={14} /> Mark Reviewing
                  </button>
                  <button onClick={() => updateReport(selected.id, "resolved")} disabled={busyId === selected.id}
                    className="btn-accent text-sm flex items-center gap-1.5">
                    <Check size={14} /> Resolve
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Community scam reports */}
        <div className="xl:col-span-1">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-ink-900 dark:text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" /> Scam Reports
              </h2>
              <Link href="/scam-alerts" target="_blank" className="text-xs font-medium text-clay-600 hover:text-clay-700 inline-flex items-center gap-1">
                View all <ExternalLink size={11} />
              </Link>
            </div>
            {!scamAlerts && <div className="py-6 text-center text-xs text-ink-400"><Loader2 size={14} className="animate-spin mx-auto mb-2" /> Loading…</div>}
            {scamAlerts && scamAlerts.length === 0 && <p className="py-6 text-center text-xs text-ink-400">No community scam reports yet.</p>}
            {scamAlerts && scamAlerts.length > 0 && (
              <ul className="space-y-3">
                {scamAlerts.map((a) => (
                  <li key={a.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-sm font-medium text-ink-900 dark:text-white line-clamp-1">{a.title}</p>
                    <p className="text-xs text-ink-600 dark:text-gray-400 mt-1 line-clamp-2">{a.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                      <span className="flex items-center gap-1"><ChevronUp size={11} /> {a.upvotes}</span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
