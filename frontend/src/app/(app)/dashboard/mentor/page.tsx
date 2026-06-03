"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users, Clock, CalendarCheck, Sparkles, MessageSquare, BadgeCheck, Award,
  ArrowRight, Loader2, AlertCircle, CalendarPlus, FileText, UserCheck, Inbox,
} from "lucide-react";
import { authFetch, getUser } from "@/lib/auth";

type MentorDashboard = {
  stats: { activeMentees: number; pendingRequests: number; totalSessions: number; hoursMentored: number };
  community: { answers: number; acceptedAnswers: number; successStories: number; impactScore: number };
  upcomingSessions: { id: string; student_name: string | null; slot_date: string; slot_time: string; duration_min: number; goal: string | null; status: string }[];
  pendingRequests: { id: string; student_name: string | null; slot_date: string; slot_time: string; goal: string | null }[];
};

const MANAGE = [
  { href: "/community/mentors", icon: UserCheck, label: "Manage mentees" },
  { href: "/messages", icon: CalendarPlus, label: "Schedule meetings" },
  { href: "/forums", icon: MessageSquare, label: "Answer questions" },
  { href: "/stories", icon: FileText, label: "Publish guides" },
];

export default function MentorDashboard() {
  const [data, setData] = useState<MentorDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const firstName = (getUser()?.full_name || "Mentor").split(" ")[0];

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch("/api/users/mentor-dashboard", {}, 60000);
        if (!res.ok) throw new Error("Could not load your dashboard.");
        const json = (await res.json()) as MentorDashboard;
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center py-32"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>;
  }
  if (error || !data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-32 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className="text-sm text-ink-600 dark:text-gray-300">{error || "No data available."}</p>
        <button onClick={() => location.reload()} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Try again</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#0A2540] dark:text-white">Welcome, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-gray-400">Your mentorship impact at a glance.</p>
      </header>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Users} label="Active mentees" value={data.stats.activeMentees} />
        <Stat icon={Inbox} label="Pending requests" value={data.stats.pendingRequests} accent={data.stats.pendingRequests > 0} />
        <Stat icon={CalendarCheck} label="Total sessions" value={data.stats.totalSessions} />
        <Stat icon={Sparkles} label="Impact score" value={data.community.impactScore} />
      </div>

      {/* Management */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-700 dark:text-gray-300">Manage</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MANAGE.map((a) => (
            <Link key={a.label} href={a.href}
              className="group flex flex-col items-start gap-2 rounded-xl border border-cream-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><a.icon size={18} /></span>
              <span className="text-xs font-medium text-ink-800 dark:text-gray-200">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Upcoming sessions */}
        <SectionCard title="Upcoming sessions" href="/messages" className="lg:col-span-2">
          {data.upcomingSessions.length === 0 ? (
            <Empty>No upcoming sessions scheduled.</Empty>
          ) : (
            <ul className="divide-y divide-cream-200 dark:divide-gray-800">
              {data.upcomingSessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {initials(s.student_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-800 dark:text-gray-200">{s.student_name || "Student"}</p>
                      <p className="truncate text-xs text-ink-400">{s.goal || "Mentorship session"}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-emerald-600">{fmtDate(s.slot_date)}</p>
                    <p className="text-xs text-ink-400">{s.slot_time} · {s.duration_min}m</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Community impact */}
        <SectionCard title="Community impact" className="lg:col-span-1">
          <div className="space-y-3">
            <ImpactRow icon={MessageSquare} label="Answers given" value={data.community.answers} />
            <ImpactRow icon={BadgeCheck} label="Accepted answers" value={data.community.acceptedAnswers} />
            <ImpactRow icon={Award} label="Success stories" value={data.community.successStories} />
            <ImpactRow icon={Clock} label="Hours mentored" value={data.stats.hoursMentored} />
          </div>
        </SectionCard>
      </div>

      {/* Pending requests */}
      <SectionCard title="Pending mentee requests" href="/messages">
        {data.pendingRequests.length === 0 ? (
          <Empty>No pending requests right now.</Empty>
        ) : (
          <ul className="divide-y divide-cream-200 dark:divide-gray-800">
            {data.pendingRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800 dark:text-gray-200">{r.student_name || "Student"}</p>
                  <p className="truncate text-xs text-ink-400">{r.goal || "Wants to connect"} · {fmtDate(r.slot_date)} {r.slot_time}</p>
                </div>
                <Link href="/messages" className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Review</Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function initials(name: string | null): string {
  if (!name) return "S";
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "S";
}
function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Stat({ icon: Icon, label, value, accent = false }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 dark:bg-gray-900 ${accent ? "border-amber-300 dark:border-amber-700" : "border-cream-200 dark:border-gray-800"}`}>
      <Icon size={18} className={accent ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"} />
      <p className="mt-3 text-2xl font-bold text-[#0A2540] dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function ImpactRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-ink-600 dark:text-gray-300"><Icon size={15} className="text-ink-400" /> {label}</span>
      <span className="text-sm font-bold text-[#0A2540] dark:text-white">{value}</span>
    </div>
  );
}

function SectionCard({ title, href, className = "", children }: { title: string; href?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-cream-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-800 dark:text-gray-200">{title}</h2>
        {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">View all <ArrowRight size={12} /></Link>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-xs text-ink-400">{children}</p>;
}
