"use client";

import { useEffect, useState } from "react";
import { Flag, AlertTriangle, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

type Report = {
  id: string; target_type: string; target_id: string; reason: string;
  details: string | null; status: string; created_at: string;
  reporter_name: string | null;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch("/api/moderation/reports", { signal: ctrl.signal });
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
  }, []);

  async function resolveReport(id: string, status: "resolved" | "dismissed") {
    try {
      const res = await authFetch(`/api/moderation/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  const filtered = reports.filter((r) => {
    if (filter === "open") return r.status === "pending";
    if (filter === "resolved") return r.status !== "pending";
    return true;
  });

  function severityLabel(r: Report): { label: string; tone: string } {
    const highKeywords = ["scam", "fraud", "fake", "harassment", "threat"];
    const isHigh = highKeywords.some((k) => (r.details ?? r.reason).toLowerCase().includes(k));
    if (isHigh) return { label: "High", tone: "!bg-red-500/15 !text-red-600" };
    if (r.reason.length > 20) return { label: "Med", tone: "!bg-amber-500/15 !text-amber-500" };
    return { label: "Low", tone: "!bg-cream-200 !text-ink-700" };
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Reports</h1>
          <p className="text-sm text-ink-600 mt-1">Community + AI-flagged content. {filtered.length} shown.</p>
        </div>
        <div className="flex gap-1 rounded-md border border-cream-200 p-1 bg-cream-100">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition ${
                filter === f ? "bg-clay-500 text-white" : "text-ink-700 hover:bg-cream-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {err && (
        <div className="card border-red-300 text-sm text-red-600 mb-4">
          Couldn&apos;t load reports: {err}
        </div>
      )}

      {loading && !err && (
        <div className="card text-center py-10 text-ink-500">
          <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading reports...
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((r) => {
          const severity = severityLabel(r);
          const isHigh = severity.label === "High";
          return (
            <div key={r.id} className={`card ${isHigh && r.status === "pending" ? "border-red-300" : ""}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isHigh ? "bg-red-500/15 text-red-600" : "bg-cream-200 text-ink-600"
                }`}>
                  <Flag size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-ink-900">{r.reason}</h3>
                    <span className={`badge ${severity.tone}`}>
                      {severity.label === "High" && <AlertTriangle size={10} />} {severity.label}
                    </span>
                    <span className="badge !bg-cream-200 !text-ink-700 capitalize">{r.target_type}</span>
                  </div>
                  <p className="text-sm text-ink-600 mt-1">{r.details ?? "No additional details."}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
                    <span>Reported by {r.reporter_name ?? "Anonymous"}</span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="btn-ghost text-xs border border-cream-300 !py-1.5"><ExternalLink size={12} /> View</button>
                    <button onClick={() => resolveReport(r.id, "dismissed")} title="Dismiss" className="p-1.5 rounded-md text-ink-500 hover:bg-cream-200"><X size={14} /></button>
                    <button onClick={() => resolveReport(r.id, "resolved")} title="Resolve" className="p-1.5 rounded-md text-leaf-600 hover:bg-leaf-500/10"><Check size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="card text-center text-sm text-ink-500 py-10">
            <Check size={20} className="mx-auto mb-2 text-leaf-600" /> No {filter} reports.
          </div>
        )}
      </div>
    </div>
  );
}