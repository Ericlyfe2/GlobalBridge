"use client";

import { useEffect, useState } from "react";
import { Home, Award, Briefcase, MessageSquare, FileText, ShieldCheck, X, Trash2, AlertTriangle, Loader2, Search, CheckCircle2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

type ContentItem = {
  id: string; title: string; type: string; status: string; created_at: string; author_field?: string;
};

export default function ContentModerationPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch("/api/admin/content", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        setItems(data.content ?? []);
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

  const filtered = items.filter((i) => {
    if (typeFilter !== "all" && i.type !== typeFilter) return false;
    if (statusFilter === "pending" && i.status !== "pending_review") return false;
    if (statusFilter === "active" && i.status !== "active") return false;
    return true;
  });

  async function approve(id: string, type: string) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/content/${type}/${id}/approve`, { method: "POST" });
      if (res.ok) setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "active" } : i));
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  async function reject(id: string, type: string) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/content/${type}/${id}/reject`, { method: "POST" });
      if (res.ok) setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "archived" } : i));
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  async function deleteItem(id: string, type: string) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/content/${type}/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ } finally { setBusyId(null); setDeleteConfirm(null); }
  }

  function typeIcon(type: string) {
    if (type === "housing") return <Home size={14} />;
    if (type === "opportunity") return <Award size={14} />;
    if (type === "job") return <Briefcase size={14} />;
    if (type === "forum_post") return <MessageSquare size={14} />;
    return <FileText size={14} />;
  }

  function typeLabel(type: string) {
    return type.replace("_", " ");
  }

  function typeColor(type: string) {
    if (type === "housing") return "bg-sky-500/15 text-sky-600";
    if (type === "opportunity") return "bg-leaf-500/15 text-leaf-600";
    if (type === "job") return "bg-amber-500/15 text-amber-500";
    if (type === "forum_post") return "bg-purple-500/15 text-purple-600";
    return "bg-clay-500/15 text-clay-600";
  }

  const types = ["all", ...new Set(items.map((i) => i.type))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900">Content Moderation</h1>
        <p className="text-sm text-ink-600 mt-1">Review and manage all platform content.</p>
      </header>

      {err && <div className="card border-red-300 text-sm text-red-600"><AlertTriangle size={14} className="inline mr-1" />{err}</div>}

      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${typeFilter === t ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"}`}
          >{t === "all" ? "All" : typeLabel(t)}</button>
        ))}
        <div className="ml-auto flex gap-1 bg-cream-100 rounded-lg p-0.5">
          {["all", "pending", "active"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition ${statusFilter === s ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-700"}`}
            >{s === "pending" ? "Pending Review" : s === "all" ? "All" : "Active"}</button>
          ))}
        </div>
      </div>

      {loading && <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card animate-pulse"><div className="h-4 w-3/4 bg-cream-200 rounded" /><div className="mt-2 h-3 w-1/2 bg-cream-200 rounded" /><div className="mt-3 flex gap-2"><div className="h-6 w-16 bg-cream-200 rounded" /><div className="h-6 w-16 bg-cream-200 rounded" /></div></div>)}</div>}

      {!loading && !err && filtered.length === 0 && (
        <div className="card text-center py-12"><FileText size={32} className="mx-auto text-ink-300" /><p className="mt-3 text-sm text-ink-600">No content found matching these filters.</p></div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className={`card ${item.status === "pending_review" ? "border-amber-200" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeColor(item.type)}`}>{typeIcon(item.type)}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{item.title}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    <span className={`inline-block capitalize px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColor(item.type)}`}>{typeLabel(item.type)}</span>
                    {item.author_field && <span className="ml-2">by {item.author_field}</span>}
                    <span className="ml-2">{new Date(item.created_at).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.status === "pending_review" && (
                  <>
                    <button onClick={() => approve(item.id, item.type)} disabled={busyId === item.id}
                      className="p-1.5 rounded-md text-leaf-600 hover:bg-leaf-500/10 transition disabled:opacity-40" title="Approve">
                      {busyId === item.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    </button>
                    <button onClick={() => reject(item.id, item.type)} disabled={busyId === item.id}
                      className="p-1.5 rounded-md text-amber-600 hover:bg-amber-500/10 transition" title="Reject">
                      <X size={14} />
                    </button>
                  </>
                )}
                <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-md text-red-600 hover:bg-red-500/10 transition" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={item.status} />
            </div>

            {deleteConfirm === item.id && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-200">
                <p className="text-xs text-red-700 mb-2">Are you sure you want to permanently delete this content?</p>
                <div className="flex gap-2">
                  <button onClick={() => deleteItem(item.id, item.type)} disabled={busyId === item.id}
                    className="btn-ghost text-xs border-red-300 text-red-600 !py-1">Delete</button>
                  <button onClick={() => setDeleteConfirm(null)} className="btn-ghost text-xs !py-1">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <span className="badge badge-verified">Active</span>;
  if (status === "pending_review") return <span className="badge !bg-amber-500/15 !text-amber-500">Pending Review</span>;
  return <span className="badge !bg-ink-200 !text-ink-600">{status}</span>;
}
