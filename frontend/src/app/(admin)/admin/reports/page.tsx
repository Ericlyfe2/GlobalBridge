"use client";

import { useEffect, useState } from "react";
import { Flag, AlertTriangle, Check, X, ExternalLink, Loader2, Search, ChevronLeft, ChevronRight, AlertCircle, Ban, MessageSquare } from "lucide-react";
import { authFetch } from "@/lib/auth";

type Report = {
  id: string; target_type: string; target_id: string; reason: string;
  details: string | null; status: string; created_at: string;
  reporter_name: string | null; resolver_name: string | null; resolved_at: string | null;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all" | "reviewing">("pending");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
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

  const totalPages = Math.ceil(reports.length / limit);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900">Reports</h1>
          <p className="text-sm text-ink-600 mt-1">Community-flagged content requiring review.</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filter === f.value ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"}`}
          >{f.label}</button>
        ))}
      </div>

      {err && <div className="card border-red-300 text-sm text-red-600"><AlertTriangle size={14} className="inline mr-1" />{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-3 ${selected ? "lg:col-span-1" : "lg:col-span-3"}`}>
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
            return (
              <div key={r.id}
                className={`card cursor-pointer ${isHigh && r.status === "pending" ? "border-red-300" : ""} ${selected?.id === r.id ? "ring-2 ring-clay-500" : ""}`}
                onClick={() => setSelected(r)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHigh ? "bg-red-500/15 text-red-600" : "bg-cream-200 text-ink-600"}`}>
                    <Flag size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-ink-900">{r.reason}</h3>
                      <span className={`badge ${severity.tone}`}>{severity.label}</span>
                      <span className="badge !bg-cream-200 !text-ink-700 capitalize">{r.target_type}</span>
                    </div>
                    <p className="text-xs text-ink-600 mt-1 line-clamp-2">{r.details ?? "No additional details."}</p>
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
                        className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200 transition">{busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}</button>
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
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink-900">{selected.reason}</h2>
                  <p className="text-xs text-ink-600 mt-1">
                    <span className="badge !bg-cream-200 !text-ink-700 capitalize mr-2">{selected.target_type}</span>
                    {selected.reporter_name && <>Reported by {selected.reporter_name}</>}
                    <span className="ml-2">{new Date(selected.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200"><X size={14} /></button>
              </div>

              <div className="bg-cream-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-ink-600 mb-1">Details</p>
                <p className="text-sm text-ink-900">{selected.details || "No additional details provided."}</p>
              </div>

              <div className="bg-cream-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-ink-600 mb-1">Target ID</p>
                <p className="text-sm font-mono text-ink-900">{selected.target_id}</p>
              </div>

              {selected.resolver_name && (
                <div className="bg-cream-50 rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium text-ink-600 mb-1">Resolution</p>
                  <p className="text-sm text-ink-900">
                    {selected.status === "resolved" ? "Resolved" : selected.status === "dismissed" ? "Dismissed" : "Under review"}
                    {selected.resolver_name && <> by {selected.resolver_name}</>}
                    {selected.resolved_at && <> on {new Date(selected.resolved_at).toLocaleString()}</>}
                  </p>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-200">
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
          </div>
        )}
      </div>
    </div>
  );
}
