"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, FileText, Check as CheckIcon, X, Clock, Eye, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

type PendingUser = {
  id: string; full_name: string; email: string; role: string;
  country_of_residence: string | null; created_at: string;
  verification_status: string;
};

export default function VerificationsPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingUser | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/users?status=pending&limit=50", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        setPending(data.users ?? []);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  async function approve(id: string) {
    try {
      const res = await authFetch(`/api/users/${id}/verify`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to verify");
      setPending((q) => q.filter((u) => u.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch { /* ignore */ }
  }

  async function reject(id: string) {
    try {
      const res = await authFetch(`/api/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setPending((q) => q.filter((u) => u.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Verifications</h1>
          <p className="text-sm text-ink-600 mt-1">{pending.length} pending</p>
        </div>
        <span className="badge !bg-amber-500/15 !text-amber-500"><Clock size={11} /> Awaiting review</span>
      </header>

      {err && (
        <div className="card border-red-300 text-sm text-red-600 mb-4">Couldn&apos;t load: {err}</div>
      )}

      {loading && !err && (
        <div className="card text-center py-12 text-ink-500">
          <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading...
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card !p-0 overflow-hidden lg:col-span-1">
          <div className="px-4 py-3 border-b border-cream-200 text-xs font-semibold uppercase tracking-wider text-ink-600">
            Queue ({pending.length})
          </div>
          <ul className="divide-y divide-cream-200">
            {pending.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => setSelected(u)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream-100 transition ${
                    selected?.id === u.id ? "bg-clay-500/5 border-l-2 border-l-clay-500" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-clay-500 text-white flex items-center justify-center text-sm font-medium shrink-0">
                    {u.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-ink-500 capitalize">{u.role}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </button>
              </li>
            ))}
            {pending.length === 0 && !loading && (
              <li className="px-4 py-10 text-center text-sm text-ink-500">
                <CheckIcon size={20} className="mx-auto mb-2 text-leaf-600" /> Queue clear.
              </li>
            )}
          </ul>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink-900">{selected.full_name}</h2>
                  <p className="text-sm text-ink-600 capitalize">{selected.role} · {selected.country_of_residence ?? "No country"} · Joined {new Date(selected.created_at).toLocaleDateString()}</p>
                </div>
                <span className="badge badge-clay">{selected.email}</span>
              </div>

              <div className="aspect-[4/3] rounded-lg bg-cream-100 border border-cream-200 flex items-center justify-center text-ink-500 mb-4 relative overflow-hidden">
                <FileText size={48} className="opacity-40" />
                <span className="absolute bottom-3 left-3 text-xs">Document verification — upload required</span>
                <button className="absolute top-3 right-3 btn-ghost text-xs border border-cream-300 !py-1.5">
                  <Eye size={12} /> View profile
                </button>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  { label: "Email matches identity documents", ok: true },
                  { label: "Name matches government ID", ok: selected.full_name.length > 2 },
                  { label: "Country of residence is consistent", ok: !!selected.country_of_residence },
                  { label: "No existing account with same ID", warn: true },
                ].map((c) => (
                  <label key={c.label} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                    <input type="checkbox" defaultChecked={c.ok && !c.warn} className="w-4 h-4 accent-clay-500" />
                    <span>{c.label}</span>
                    {c.warn && <span className="text-xs text-amber-500 ml-1">⚠ verify manually</span>}
                  </label>
                ))}
              </div>

              <label className="block mb-4">
                <span className="block text-xs font-medium text-ink-600 mb-1.5">Internal notes (visible to admins only)</span>
                <textarea className="input min-h-[80px]" placeholder="Add notes..." />
              </label>

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => reject(selected.id)} className="btn-ghost border border-red-300 text-red-600 hover:!bg-red-500/10">
                  <X size={15} /> Reject
                </button>
                <button onClick={() => approve(selected.id)} className="btn-accent">
                  <CheckIcon size={15} /> Approve & verify
                </button>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center text-center py-16 text-ink-500">
              <ShieldCheck size={32} className="mb-3 opacity-50" />
              <p className="text-sm">Select a submission to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}