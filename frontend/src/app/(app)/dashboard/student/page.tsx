"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Award, Home, Users, Bot, FileText, GraduationCap, Calendar, MessageSquare,
  ArrowRight, ShieldCheck, TrendingUp, Loader2, AlertCircle, Plane, BadgeCheck, ChevronRight,
} from "lucide-react";
import { authFetch, getUser } from "@/lib/auth";
import { useTranslation } from "@/i18n/hooks/useTranslation";

type Dashboard = {
  profile: { completion: number; missingFields: string[]; verificationStatus: string };
  stats: { savedScholarships: number; savedHousing: number; mentorSessions: number; profileStrength: number };
  visa: { progress: number; destination: string | null; total: number; done: number } | null;
  deadlines: { id: string; title: string; type: string; deadline: string | null; country: string }[];
  discussions: { id: string; title: string; answer_count: number; upvotes: number; created_at: string }[];
};

type Opportunity = {
  id: string; title: string; type: string; country: string;
  deadline: string | null; funding_amount?: number | null; currency?: string | null;
};

export default function StudentDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const firstName = (getUser()?.full_name || "there").split(" ")[0];
  const { t } = useTranslation();

  const QUICK_ACTIONS = [
    { href: "/opportunities", icon: Award, label: t("dashboard.browseOpportunities") },
    { href: "/tools/uni-success", icon: GraduationCap, label: t("dashboard.browseOpportunities") },
    { href: "/housing", icon: Home, label: t("dashboard.findHousing") },
    { href: "/community/mentors", icon: Users, label: t("community.findMentors") },
    { href: "/assistant", icon: Bot, label: t("nav.aiAssistant") },
    { href: "/jobs/resume-builder", icon: FileText, label: "Resume Builder" },
  ];

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch("/api/users/dashboard", {}, 60000);
        if (!res.ok) throw new Error("Could not load your dashboard.");
        const json = (await res.json()) as Dashboard;
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (active) setLoading(false);
      }
    })();
    (async () => {
      try {
        const res = await authFetch("/api/opportunities?limit=4");
        if (res.ok) {
          const json = await res.json();
          if (active) setOpps(Array.isArray(json) ? json : json.items ?? json.opportunities ?? []);
        }
      } catch { /* widget is optional */ }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-32 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className="text-sm text-ink-600 dark:text-gray-300">{error || "No data available."}</p>
        <button onClick={() => location.reload()} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          Try again
        </button>
      </div>
    );
  }

  const verified = data.profile.verificationStatus === "verified";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
      {/* Welcome */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A2540] dark:text-white">
            {t("dashboard.welcome", { name: firstName })} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-gray-400">
            Here&apos;s your journey at a glance.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            verified
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
          }`}
        >
          {verified ? <BadgeCheck size={13} /> : <ShieldCheck size={13} />}
          {verified ? "Verified account" : "Verification pending"}
        </span>
      </header>

      {/* Profile completion + stats */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <ProfileCard completion={data.profile.completion} missing={data.profile.missingFields} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Award} label="Saved scholarships" value={data.stats.savedScholarships} />
          <Stat icon={Calendar} label="Mentor sessions" value={data.stats.mentorSessions} />
          <Stat icon={Home} label="Saved housing" value={data.stats.savedHousing} />
          <Stat icon={TrendingUp} label="Profile strength" value={`${data.stats.profileStrength}%`} />
        </div>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-700 dark:text-gray-300">{t("dashboard.quickActions")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href} href={a.href}
              className="group flex flex-col items-start gap-2 rounded-xl border border-cream-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <a.icon size={18} />
              </span>
              <span className="text-xs font-medium leading-snug text-ink-800 dark:text-gray-200">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trackers + widgets */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Status trackers */}
        <SectionCard title="Status trackers" className="lg:col-span-1">
          <div className="space-y-4">
            <Tracker
              icon={Plane} label="Visa checklist"
              value={data.visa ? `${data.visa.progress}%` : "Not started"}
              progress={data.visa?.progress ?? 0}
              sub={data.visa?.destination ? `Destination: ${data.visa.destination}` : "Start your visa checklist"}
            />
            <Tracker
              icon={Award} label="Applications"
              value={`${data.stats.savedScholarships} tracked`}
              progress={Math.min(data.stats.savedScholarships * 20, 100)}
              sub="Scholarships you're pursuing"
            />
            <Tracker
              icon={Home} label="Housing"
              value={`${data.stats.savedHousing} saved`}
              progress={Math.min(data.stats.savedHousing * 25, 100)}
              sub="Listings shortlisted"
            />
          </div>
        </SectionCard>

        {/* Upcoming deadlines */}
        <SectionCard title={t("dashboard.upcomingDeadlines")} href="/opportunities" className="lg:col-span-1">
          {data.deadlines.length === 0 ? (
            <Empty>No upcoming deadlines.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {data.deadlines.map((d) => (
                <li key={d.id}>
                  <Link href={`/opportunities/${d.id}`} className="group flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-cream-50 dark:hover:bg-gray-800">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-800 dark:text-gray-200">{d.title}</p>
                      <p className="text-xs text-ink-400">{d.country} · {d.type}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-emerald-600">{fmtDate(d.deadline)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Community discussions */}
        <SectionCard title={t("dashboard.recentDiscussions")} href="/forums" className="lg:col-span-1">
          {data.discussions.length === 0 ? (
            <Empty>No discussions yet.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {data.discussions.map((p) => (
                <li key={p.id}>
                  <Link href={`/forums/${p.id}`} className="group flex items-start gap-2 rounded-lg p-2 hover:bg-cream-50 dark:hover:bg-gray-800">
                    <MessageSquare size={15} className="mt-0.5 shrink-0 text-ink-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-800 dark:text-gray-200">{p.title}</p>
                      <p className="text-xs text-ink-400">{p.answer_count} replies · {p.upvotes} upvotes</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Recommended opportunities */}
      <SectionCard title="Recommended for you" href="/opportunities">
        {opps.length === 0 ? (
          <Empty>Browse the opportunities board to get started.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {opps.slice(0, 4).map((o) => (
              <Link
                key={o.id} href={`/opportunities/${o.id}`}
                className="group rounded-xl border border-cream-200 p-4 transition-all hover:border-emerald-300 hover:shadow-sm dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {o.type}
                  </span>
                  <ChevronRight size={15} className="text-ink-300 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink-900 dark:text-white">{o.title}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {o.country}{o.deadline ? ` · Due ${fmtDate(o.deadline)}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ── small building blocks ──────────────────────────────── */

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Icon size={18} className="text-emerald-600 dark:text-emerald-400" />
      <p className="mt-3 text-2xl font-bold text-[#0A2540] dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function ProfileCard({ completion, missing }: { completion: number; missing: string[] }) {
  const { t } = useTranslation();
  const r = 34, c = 2 * Math.PI * r, offset = c - (completion / 100) * c;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-cream-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-cream-200 dark:stroke-gray-700" />
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
            className="stroke-emerald-500" strokeDasharray={c} strokeDashoffset={offset} />
        </svg>
        <span className="absolute text-sm font-bold text-[#0A2540] dark:text-white">{t("dashboard.profileCompletion", { percent: completion })}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-800 dark:text-gray-200">Profile completion</p>
        {missing.length > 0 ? (
          <p className="mt-1 text-xs text-ink-500 dark:text-gray-400">
            {t("dashboard.missingFields", { fields: missing.slice(0, 2).join(", ") })}{missing.length > 2 ? "…" : ""}
          </p>
        ) : (
          <p className="mt-1 text-xs text-emerald-600">All set — great work!</p>
        )}
        <Link href="/dashboard/profile" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          {t("dashboard.completeProfile")} <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function Tracker({
  icon: Icon, label, value, sub, progress,
}: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string; sub: string; progress: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-gray-300">
          <Icon size={15} className="text-ink-400" /> {label}
        </span>
        <span className="text-xs font-semibold text-ink-800 dark:text-gray-200">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200 dark:bg-gray-700">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-400">{sub}</p>
    </div>
  );
}

function SectionCard({ title, href, className = "", children }: { title: string; href?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-cream-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-800 dark:text-gray-200">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
            View all <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-xs text-ink-400">{children}</p>;
}
