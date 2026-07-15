"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Send,
  Megaphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  ExternalLink,
  X,
  Mail,
  Users,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
  user_name: string | null;
};

type Kind = "info" | "warning" | "announcement" | "alert";
type BroadcastRole = "student" | "mentor" | "employer" | "all";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "announcement", label: "Announcement" },
  { value: "alert", label: "Alert" },
];

const ROLE_OPTIONS: { value: BroadcastRole; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "student", label: "Students" },
  { value: "mentor", label: "Mentors" },
  { value: "employer", label: "Employers" },
];

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    info: { label: "Info", classes: "!bg-sky-500/15 !text-sky-600" },
    warning: { label: "Warning", classes: "!bg-amber-500/15 !text-amber-500" },
    announcement: { label: "Announcement", classes: "!bg-clay-500/15 !text-clay-600" },
    alert: { label: "Alert", classes: "!bg-red-500/15 !text-red-600" },
  };
  const m = map[kind] ?? { label: kind, classes: "!bg-cream-200 !text-ink-700" };
  return <span className={`badge ${m.classes} capitalize`}>{m.label}</span>;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sendTab, setSendTab] = useState<"specific" | "broadcast">("specific");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Kind>("info");
  const [href, setHref] = useState("");

  const [userId, setUserId] = useState("");
  const [broadcastRole, setBroadcastRole] = useState<BroadcastRole>("all");

  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const ctrl = new AbortController();
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/notifications", { signal: ctrl.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setNotifications(data.notifications ?? []);
      setErr(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
    return () => ctrl.abort();
  }

  function showFeedback(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 5000);
  }

  async function handleSendSpecific(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!userId.trim()) { showFeedback(false, "Enter a user UUID"); return; }
    setSending(true);
    setFeedback(null);
    try {
      const res = await authFetch("/api/admin/notifications/send", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId.trim(),
          kind,
          title: title.trim(),
          body: body.trim() || undefined,
          href: href.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      showFeedback(true, "Notification sent");
      setTitle(""); setBody(""); setHref(""); setUserId("");
      loadNotifications();
    } catch (e) {
      showFeedback(false, e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
    }
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await authFetch("/api/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title: title.trim(),
          body: body.trim() || undefined,
          href: href.trim() || undefined,
          role: broadcastRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to broadcast");
      showFeedback(true, `Broadcast sent to ${broadcastRole === "all" ? "all users" : broadcastRole + "s"}`);
      setTitle(""); setBody(""); setHref("");
      loadNotifications();
    } catch (e) {
      showFeedback(false, e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            <Bell className="text-clay-500" /> Notifications
          </h1>
          <p className="text-sm text-ink-600 mt-1">Send and manage in-app notifications.</p>
        </div>
      </header>

      {feedback && (
        <div
          className={`card flex items-center gap-2 text-sm ${
            feedback.ok ? "border-leaf-600 text-leaf-700" : "border-red-300 text-red-600"
          }`}
        >
          {feedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto p-0.5 rounded hover:bg-cream-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Send / Broadcast form */}
      <div className="card">
        <div className="flex items-center gap-1 border-b border-cream-200 pb-3 mb-4">
          <button
            onClick={() => setSendTab("specific")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              sendTab === "specific"
                ? "bg-clay-500 text-white"
                : "text-ink-700 hover:bg-cream-200"
            }`}
          >
            <Send size={12} /> To specific user
          </button>
          <button
            onClick={() => setSendTab("broadcast")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              sendTab === "broadcast"
                ? "bg-clay-500 text-white"
                : "text-ink-700 hover:bg-cream-200"
            }`}
          >
            <Megaphone size={12} /> Broadcast
          </button>
        </div>

        <form onSubmit={sendTab === "specific" ? handleSendSpecific : handleBroadcast}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <label className="sm:col-span-2 lg:col-span-2">
              <span className="block text-xs font-medium text-ink-600 mb-1.5">
                Title <span className="text-red-500">*</span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input text-sm"
                placeholder="e.g. New deadline for visa applications"
                required
              />
            </label>

            <label>
              <span className="block text-xs font-medium text-ink-600 mb-1.5">Kind</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
                className="input text-sm"
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="block text-xs font-medium text-ink-600 mb-1.5">Href (optional)</span>
              <input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                className="input text-sm"
                placeholder="/opportunities/123"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <label className="sm:col-span-2">
              <span className="block text-xs font-medium text-ink-600 mb-1.5">Body (optional)</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="input min-h-[72px] text-sm"
                placeholder="Notification body text..."
              />
            </label>
          </div>

          {sendTab === "specific" ? (
            <div className="flex items-end gap-3 flex-wrap">
              <label className="flex-1 min-w-[200px]">
                <span className="block text-xs font-medium text-ink-600 mb-1.5">
                  User UUID <span className="text-red-500">*</span>
                </span>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="input text-sm font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </label>
              <button type="submit" disabled={sending} className="btn-accent">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-3 flex-wrap">
              <label className="min-w-[160px]">
                <span className="block text-xs font-medium text-ink-600 mb-1.5">Target role</span>
                <select
                  value={broadcastRole}
                  onChange={(e) => setBroadcastRole(e.target.value as BroadcastRole)}
                  className="input text-sm"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={sending} className="btn-accent">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                Broadcast
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Recent notifications */}
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <Mail size={16} /> Recent notifications
          <span className="text-xs font-normal text-ink-500">({notifications.length})</span>
        </h2>

        {err && (
          <div className="card border-red-300 text-sm text-red-600 mb-4">
            Couldn&apos;t load notifications: {err}
          </div>
        )}

        {loading && !err && (
          <div className="card text-center py-10 text-ink-500">
            <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading notifications...
          </div>
        )}

        {!loading && !err && notifications.length === 0 && (
          <div className="card flex flex-col items-center text-center py-12 text-ink-500">
            <Bell size={28} className="mb-2 opacity-50" />
            <p className="text-sm">No notifications sent yet.</p>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`card flex items-start gap-3 ${!n.read ? "border-l-2 border-l-clay-500" : ""}`}>
              <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center shrink-0 text-ink-600">
                {n.kind === "alert" ? (
                  <AlertTriangle size={15} />
                ) : n.kind === "warning" ? (
                  <AlertCircle size={15} />
                ) : n.kind === "announcement" ? (
                  <Megaphone size={15} />
                ) : (
                  <Info size={15} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-ink-900">{n.title}</span>
                  <KindBadge kind={n.kind} />
                  {!n.read && <span className="badge !bg-clay-500/15 !text-clay-600 text-[10px]">New</span>}
                </div>
                {n.body && (
                  <p className="text-sm text-ink-600 mt-0.5 line-clamp-2">{n.body}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-500">
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {n.user_name ?? "Unknown"}
                  </span>
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  {n.href && (
                    <a
                      href={n.href}
                      className="inline-flex items-center gap-0.5 text-clay-600 hover:underline"
                    >
                      <ExternalLink size={11} /> Link
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
