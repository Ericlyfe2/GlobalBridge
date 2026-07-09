"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, User, Flag, Home, ShieldCheck, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

type AuditEntry = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
};

const ACTION_META: Record<string, { label: string; icon: typeof User; tone: string }> = {
  "user.verify": { label: "Verified user", icon: ShieldCheck, tone: "text-leaf-600 bg-leaf-500/15" },
  "user.status": { label: "Changed user status", icon: User, tone: "text-clay-600 bg-clay-500/15" },
  "report.resolve": { label: "Resolved report", icon: Flag, tone: "text-red-600 bg-red-500/15" },
  "listing.status": { label: "Changed listing status", icon: Home, tone: "text-amber-600 bg-amber-500/15" },
};

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, icon: ScrollText, tone: "text-ink-600 bg-cream-200" };
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const load = useCallback(async (before: string | null) => {
    const params = new URLSearchParams({ limit: "50" });
    if (before) params.set("before", before);
    const res = await authFetch(`/api/admin/audit?${params.toString()}`, {}, 60000);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load audit log");
    return data as { entries: AuditEntry[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await load(null);
        if (!active) return;
        setEntries(data.entries);
        setCursor(data.nextCursor);
        setReachedEnd(!data.nextCursor);
      } catch (e) {
        if (active) setErr(e instanceof Error ? e.message : "Network error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const data = await load(cursor);
      setEntries((prev) => [...prev, ...data.entries]);
      setCursor(data.nextCursor);
      setReachedEnd(!data.nextCursor);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
          <ScrollText size={26} className="text-clay-600" /> Audit log
        </h1>
        <p className="text-sm text-ink-600 mt-1">A record of privileged admin actions, most recent first.</p>
      </header>

      {err && (
        <div className="card border-red-300 text-sm text-red-600">Couldn&apos;t load the audit log: {err}</div>
      )}

      {loading && (
        <div className="card space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-cream-200 animate-pulse" />
              <div className="h-4 flex-1 rounded bg-cream-200 animate-pulse" />
              <div className="h-4 w-24 rounded bg-cream-200 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && !err && entries.length === 0 && (
        <div className="card text-center py-12">
          <ScrollText size={28} className="mx-auto text-ink-300" />
          <p className="mt-3 text-sm text-ink-600">No admin actions recorded yet.</p>
          <p className="text-xs text-ink-400 mt-1">Entries appear here when admins verify users, resolve reports, or update listings.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-cream-200">
            {entries.map((e) => {
              const meta = actionMeta(e.action);
              const status = e.metadata && typeof e.metadata.status === "string" ? (e.metadata.status as string) : null;
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${meta.tone}`}>
                    <meta.icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-900">
                      <span className="font-medium">{meta.label}</span>
                      {status && <span className="ml-1.5 badge !bg-cream-200 !text-ink-600">{status}</span>}
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5 truncate">
                      by {e.admin_name || e.admin_email || "Unknown admin"}
                      {e.target_type && (
                        <span className="text-ink-400"> · {e.target_type} {e.target_id?.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-ink-400 tabular-nums" dateTime={e.created_at}>
                    {new Date(e.created_at).toLocaleString()}
                  </time>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!loading && entries.length > 0 && !reachedEnd && (
        <div className="text-center">
          <button onClick={loadMore} disabled={loadingMore} className="btn-ghost text-sm border border-cream-300 inline-flex items-center gap-2">
            {loadingMore && <Loader2 size={14} className="animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
