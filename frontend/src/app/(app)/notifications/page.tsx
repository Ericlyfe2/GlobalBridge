"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, MessageCircle, ShieldCheck, AlertTriangle, Award, Home, Briefcase, Bot, CheckCheck,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type Kind = "message" | "verification" | "scam" | "opportunity" | "housing" | "job" | "ai";

type Note = {
  id: string; kind: Kind; title: string; body: string; when: string; read: boolean; href: string;
};

type RawNote = {
  id: string; kind: string; title: string; body: string | null;
  href: string | null; read: boolean; created_at: string;
};

function relTime(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 86400 * 2) return "Yesterday";
  return `${Math.floor(d / 86400)}d`;
}

function mapNote(r: RawNote): Note {
  const kind = (["message", "verification", "scam", "opportunity", "housing", "job", "ai"].includes(r.kind)
    ? r.kind : "message") as Kind;
  return {
    id: r.id, kind, title: r.title, body: r.body ?? "",
    when: relTime(r.created_at), read: r.read, href: r.href ?? "#",
  };
}

const iconMap: Record<Kind, { Icon: typeof Bell; tone: string }> = {
  message:      { Icon: MessageCircle, tone: "bg-clay-500/15 text-clay-600" },
  verification: { Icon: ShieldCheck,   tone: "bg-leaf-500/15 text-leaf-600" },
  scam:         { Icon: AlertTriangle, tone: "bg-red-500/15 text-red-600" },
  opportunity:  { Icon: Award,         tone: "bg-amber-500/15 text-amber-500" },
  housing:      { Icon: Home,          tone: "bg-sky-500/15 text-sky-600" },
  job:          { Icon: Briefcase,     tone: "bg-amber-500/15 text-amber-500" },
  ai:           { Icon: Bot,           tone: "bg-clay-500/15 text-clay-600" },
};

const filters: { key: Kind | "all" | "unread"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "message", label: "Messages" },
  { key: "verification", label: "Verification" },
  { key: "scam", label: "Scam alerts" },
  { key: "opportunity", label: "Opportunities" },
];

export default function NotificationsPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [active, setActive] = useState<typeof filters[number]["key"]>("all");
  const signedIn = !!getToken();

  useEffect(() => {
    if (!signedIn) { setNotes([]); return; }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/content/notifications", { signal: ctrl.signal });
        const data = await res.json();
        setNotes(res.ok && Array.isArray(data.notifications) ? (data.notifications as RawNote[]).map(mapNote) : []);
      } catch {
        setNotes([]);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (notes ?? []).filter((n) => {
    if (active === "all") return true;
    if (active === "unread") return !n.read;
    return n.kind === active;
  });

  function markRead(id: string) {
    setNotes((arr) => (arr ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (signedIn) authFetch("/api/content/notifications/read", { method: "POST", body: JSON.stringify({ id }) }).catch(() => {});
  }
  function markAll() {
    setNotes((arr) => (arr ?? []).map((n) => ({ ...n, read: true })));
    if (signedIn) authFetch("/api/content/notifications/read", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
  }

  const unreadCount = (notes ?? []).filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            <Bell className="text-clay-500" /> Notifications
            {unreadCount > 0 && <span className="badge !bg-clay-500 !text-white">{unreadCount} new</span>}
          </h1>
          <p className="text-sm text-ink-600 mt-1">Messages, verifications, scam alerts, and matches.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="btn-ghost text-sm border border-cream-300">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-1 mb-6 border border-cream-200 rounded-md p-1 bg-cream-100 w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              active === f.key ? "bg-clay-500 text-white" : "text-ink-700 hover:bg-cream-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <ul className="space-y-2">
        {filtered.map((n) => {
          const { Icon, tone } = iconMap[n.kind];
          return (
            <li key={n.id}>
              <Link
                href={n.href}
                onClick={() => markRead(n.id)}
                className={`card flex items-start gap-3 hover:border-clay-300 transition ${
                  !n.read ? "bg-clay-500/[0.04]" : ""
                }`}
              >
                <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm ${!n.read ? "font-semibold text-ink-900" : "text-ink-700"}`}>{n.title}</p>
                    <span className="text-xs text-ink-500 shrink-0">{n.when}</span>
                  </div>
                  <p className="text-sm text-ink-600 mt-0.5">{n.body}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-clay-500 mt-2 shrink-0" />}
              </Link>
            </li>
          );
        })}
        {notes === null && (
          <li className="card text-center text-sm text-ink-500 py-10">Loading...</li>
        )}
        {notes !== null && !signedIn && (
          <li className="card text-center text-sm text-ink-500 py-10">
            <Bell size={20} className="mx-auto mb-2 opacity-50" />
            <Link href="/auth?mode=signin" className="text-clay-600 font-medium hover:underline">Sign in</Link> to see your notifications.
          </li>
        )}
        {notes !== null && signedIn && filtered.length === 0 && (
          <li className="card text-center text-sm text-ink-500 py-10">
            <Bell size={20} className="mx-auto mb-2 opacity-50" /> Nothing here.
          </li>
        )}
      </ul>
    </div>
  );
}
