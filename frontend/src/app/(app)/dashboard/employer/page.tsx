"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Briefcase, Eye, Users, Plane, Plus, Settings, UserCheck, CalendarPlus,
  ArrowRight, Loader2, AlertCircle, ChevronRight, BadgeCheck,
} from "lucide-react";
import { authFetch, getUser } from "@/lib/auth";
import { useTranslation } from "@/i18n/hooks/useTranslation";

type EmployerDashboard = {
  stats: { activeListings: number; interestedCandidates: number; totalViews: number; sponsorshipListings: number; sponsorshipRate: number };
  listings: { id: string; title: string; type: string; view_count: number; sponsors_visa: boolean; deadline: string | null; interested: number }[];
  company: string | null;
};



export default function EmployerDashboard() {
  const [data, setData] = useState<EmployerDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const company = (data?.company) || (getUser()?.full_name || "Employer").split(" ")[0];
  const { t } = useTranslation();
  const MANAGE = [
    { href: "/jobs", icon: Plus, label: "Create job" },
    { href: "/jobs", icon: Settings, label: "Manage jobs" },
    { href: "/community", icon: UserCheck, label: t("nav.candidates") },
    { href: "/messages", icon: CalendarPlus, label: "Schedule interviews" },
  ];

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch("/api/users/employer-dashboard", {}, 60000);
        if (!res.ok) throw new Error("Could not load your dashboard.");
        const json = (await res.json()) as EmployerDashboard;
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
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A2540] dark:text-white">{company}</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-gray-400">Your hiring pipeline at a glance.</p>
        </div>
        <Link href="/jobs" className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          <Plus size={16} /> {t("dashboard.createListing")}
        </Link>
      </header>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Briefcase} label={t("dashboard.activeListings")} value={data.stats.activeListings} />
        <Stat icon={Users} label={t("dashboard.interestedCandidates")} value={data.stats.interestedCandidates} />
        <Stat icon={Eye} label={t("dashboard.totalViews")} value={data.stats.totalViews} />
        <Stat icon={Plane} label={t("dashboard.sponsorshipListings")} value={data.stats.sponsorshipListings} />
      </div>

      {/* Manage */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-700 dark:text-gray-300">{t("dashboard.quickActions")}</h2>
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
        {/* Listings */}
        <SectionCard title="Your job listings" href="/jobs" className="lg:col-span-2">
          {data.listings.length === 0 ? (
            <Empty>No active listings. Post your first job to start hiring.</Empty>
          ) : (
            <ul className="divide-y divide-cream-200 dark:divide-gray-800">
              {data.listings.map((l) => (
                <li key={l.id}>
                  <Link href={`/jobs/${l.id}`} className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-800 dark:text-gray-200">
                        {l.title}
                        {l.sponsors_visa && <BadgeCheck size={14} className="shrink-0 text-emerald-500" />}
                      </p>
                      <p className="text-xs text-ink-400 capitalize">{l.type} · {l.view_count} views</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {l.interested} interested
                      </span>
                      <ChevronRight size={15} className="text-ink-300 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Sponsorship */}
        <SectionCard title="Visa sponsorship" className="lg:col-span-1">
          <div className="flex flex-col items-center py-2 text-center">
            <Ring value={data.stats.sponsorshipRate} />
            <p className="mt-3 text-sm font-medium text-ink-700 dark:text-gray-300">
              {data.stats.sponsorshipListings} of {data.stats.activeListings} listings sponsor visas
            </p>
            <p className="mt-1 text-xs text-ink-400">Share of your roles open to international talent.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Icon size={18} className="text-emerald-600 dark:text-emerald-400" />
      <p className="mt-3 text-2xl font-bold text-[#0A2540] dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 38, c = 2 * Math.PI * r, offset = c - (value / 100) * c;
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className="stroke-cream-200 dark:stroke-gray-700" />
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-emerald-500" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <span className="absolute text-lg font-bold text-[#0A2540] dark:text-white">{value}%</span>
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
