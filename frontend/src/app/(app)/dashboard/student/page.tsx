"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Award, Home, Users, Bot, FileText, GraduationCap, Calendar, MessageSquare,
  ArrowRight, ShieldCheck, TrendingUp, Loader2, AlertCircle, BadgeCheck, ChevronRight,
  ShieldAlert, Route, Gauge, Sparkles, Check,
} from "lucide-react";
import { authFetch, getUser } from "@/lib/auth";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { useMascot } from "@/mascot/MascotProvider";
import { formatDateOnly } from "@/lib/utils";
import { AtlasPortrait } from "@/components/mascot/AtlasPortrait";

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
  const { emit, setJourney } = useMascot();
  // Atlas greets once per visit, not on every re-render (spec §27).
  const greeted = useRef(false);

  const QUICK_ACTIONS = [
    { href: "/opportunities", icon: Award, label: t("dashboard.browseOpportunities") },
    { href: "/tools/uni-success", icon: GraduationCap, label: "University Success" },
    { href: "/housing", icon: Home, label: t("dashboard.findHousing") },
    { href: "/community", icon: Users, label: t("community.findMentors") },
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

  // ── Atlas reads the dashboard ────────────────────────────────────────
  // He interprets progress rather than just saying hello: if there's a visa
  // journey underway he speaks to it, otherwise he nudges the profile.
  useEffect(() => {
    if (!data || greeted.current) return;
    greeted.current = true;

    setJourney({
      destination: data.visa?.destination ?? null,
      progress: data.visa?.progress ?? data.profile.completion,
    });

    if (data.visa?.destination && typeof data.visa.progress === "number") {
      emit(
        "VISA_PROGRESS_UPDATED",
        { percent: Math.round(data.visa.progress), destination: data.visa.destination },
        { cta: { label: "Continue preparation", href: "/tools/visa-roadmap" } },
      );
    } else if (data.profile.completion < 100) {
      emit(
        "USER_WELCOME",
        { name: firstName },
        { cta: { label: "Complete your profile", href: "/settings" } },
      );
    } else {
      emit("LOGIN_RETURN", { name: firstName });
    }
  }, [data, emit, setJourney, firstName]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-clay-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-32 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className="text-sm text-ink-600 dark:text-gray-300">{error || "No data available."}</p>
        <button onClick={() => location.reload()} className="text-sm font-medium text-clay-600 hover:text-clay-700">
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
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
            {t("dashboard.welcome", { name: firstName })} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-gray-400">
            Here&apos;s your journey at a glance.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            verified
              ? "bg-leaf-500/10 text-leaf-600"
              : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {verified ? <BadgeCheck size={13} /> : <ShieldCheck size={13} />}
          {verified ? "Verified account" : "Verification pending"}
        </span>
      </header>

      {/* Safety first: an evergreen reminder, not a fabricated "trending scam"
          claim — scam patterns are real and ongoing, but a dashboard shouldn't
          assert a location-specific spike it can't verify. */}
      <SafetyBanner />

      {/* AI Intelligence Suite */}
      <AiSuiteBanner />

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

      {/* Visa roadmap — promoted to its own section: for a student mid-journey
          this is the single most consequential tracker on the page. */}
      <VisaRoadmapCard visa={data.visa} />

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-700 dark:text-gray-300">{t("dashboard.quickActions")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href} href={a.href}
              className="group flex flex-col items-start gap-2 rounded-xl border border-cream-200 bg-white dark:bg-[var(--color-surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-clay-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-clay-500/10 text-clay-600">
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
                    <span className="shrink-0 text-xs font-medium text-clay-600">{fmtDate(d.deadline)}</span>
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
                className="group rounded-xl border border-cream-200 p-4 transition-all hover:border-clay-300 hover:shadow-sm dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-clay-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-clay-700">
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

const fmtDate = formatDateOnly;

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white dark:bg-[var(--color-surface)] p-4 dark:border-gray-800 dark:bg-gray-900">
      <Icon size={18} className="text-clay-600" />
      <p className="mt-3 text-2xl font-bold text-ink-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function ProfileCard({ completion, missing }: { completion: number; missing: string[] }) {
  const { t } = useTranslation();
  const r = 34, c = 2 * Math.PI * r, offset = c - (completion / 100) * c;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-cream-200 bg-white dark:bg-[var(--color-surface)] p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-cream-200 dark:stroke-gray-700" />
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
            className="stroke-clay-500" strokeDasharray={c} strokeDashoffset={offset} />
        </svg>
        <span className="absolute text-sm font-bold text-ink-900 dark:text-white">{t("dashboard.profileCompletion", { percent: completion })}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-800 dark:text-gray-200">Profile completion</p>
        {missing.length > 0 ? (
          <p className="mt-1 text-xs text-ink-500 dark:text-gray-400">
            {t("dashboard.missingFields", { fields: missing.slice(0, 2).join(", ") })}{missing.length > 2 ? "…" : ""}
          </p>
        ) : (
          <p className="mt-1 text-xs text-leaf-600">All set — great work!</p>
        )}
        <Link href="/dashboard/profile" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-clay-600 hover:text-clay-700">
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
        <div className="h-full rounded-full bg-clay-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-400">{sub}</p>
    </div>
  );
}

function SectionCard({ title, href, className = "", children }: { title: string; href?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-cream-200 bg-white dark:bg-[var(--color-surface)] p-5 dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-800 dark:text-gray-200">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-clay-600 hover:text-clay-700">
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

const AI_SUITE = [
  { href: "/tools/scam-shield",  icon: ShieldAlert, title: "Scam Shield",     desc: "Paste a listing or offer — spot fraud in seconds." },
  { href: "/tools/visa-roadmap", icon: Route,       title: "Visa Roadmap",    desc: "Your full journey mapped, step by step." },
  { href: "/tools/readiness",    icon: Gauge,       title: "Readiness Score", desc: "See how prepared you are — and what's next." },
];

function AiSuiteBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-clay-500/20 bg-gradient-to-br from-clay-500/5 via-white to-cream-100 p-5 dark:from-clay-500/10 dark:via-gray-900 dark:to-gray-900">
      <AtlasPortrait size={96} className="pointer-events-none absolute -right-3 -top-3 opacity-90" />
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-clay-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          <Sparkles size={11} /> NEW
        </span>
        <h2 className="text-sm font-semibold text-ink-900 dark:text-white">AI Intelligence Suite</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {AI_SUITE.map((a) => (
          <Link
            key={a.href} href={a.href}
            className="group flex items-start gap-3 rounded-xl border border-cream-200 bg-white/70 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-clay-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-clay-600/10 text-clay-600">
              <a.icon size={20} />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-semibold text-ink-900 dark:text-white">
                {a.title}
                <ArrowRight size={13} className="text-clay-500 transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="mt-0.5 text-xs leading-snug text-ink-500 dark:text-gray-400">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Evergreen safety reminder, not a live threat feed. Real, specific scam
 * reports live at /scam-alerts (community-sourced) — this banner exists to
 * point there and to the checker, not to assert an unverifiable claim like
 * "scams are up 40% in Berlin" on someone's personal dashboard.
 */
function SafetyBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-600">
        <ShieldAlert size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900 dark:text-white">{t("dashboard.safetyBannerTitle")}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-600 dark:text-gray-400">{t("dashboard.safetyBannerBody")}</p>
      </div>
      <Link
        href="/scam-alerts"
        className="hidden shrink-0 items-center gap-1 self-center rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-400 sm:flex"
      >
        {t("dashboard.safetyBannerCta")} <ArrowRight size={12} />
      </Link>
    </div>
  );
}

/**
 * A step-by-step read of `visa.done`/`visa.total` rather than a plain bar —
 * for a journey this consequential, "3 of 5 steps done" reads better than a
 * bare percentage. Falls back to a start-CTA when no roadmap exists yet, and
 * to a plain percent bar if the backend ever omits step counts.
 */
function VisaRoadmapCard({ visa }: { visa: Dashboard["visa"] }) {
  const { t } = useTranslation();

  if (!visa) {
    return (
      <SectionCard title="Visa Roadmap">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-clay-500/10 text-clay-600">
              <Route size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">{t("dashboard.startVisaRoadmap")}</p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-gray-400">{t("dashboard.startVisaRoadmapBody")}</p>
            </div>
          </div>
          <Link
            href="/tools/visa-roadmap"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-clay-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clay-700"
          >
            {t("dashboard.startVisaRoadmap")} <ArrowRight size={12} />
          </Link>
        </div>
      </SectionCard>
    );
  }

  const hasSteps = visa.total > 0;

  return (
    <SectionCard title="Visa Roadmap">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-500 dark:text-gray-400">
            {visa.destination ? `Destination: ${visa.destination}` : "Your visa journey"}
          </p>
          <span className="rounded-full bg-leaf-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-leaf-600">
            {visa.progress}% complete
          </span>
        </div>

        {hasSteps ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {Array.from({ length: visa.total }).map((_, i) => {
              const isDone = i < visa.done;
              const isCurrent = i === visa.done;
              return (
                <div key={i} className="flex flex-1 items-center gap-1.5 sm:gap-2">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors ${
                      isDone
                        ? "bg-leaf-500 text-white"
                        : isCurrent
                          ? "bg-white dark:bg-[var(--color-surface)] text-clay-600 ring-2 ring-clay-500 dark:bg-gray-900"
                          : "bg-cream-200 text-ink-400 dark:bg-gray-700"
                    }`}
                  >
                    {isDone ? <Check size={14} /> : i + 1}
                  </span>
                  {i < visa.total - 1 && (
                    <span className={`h-0.5 flex-1 rounded-full ${isDone ? "bg-leaf-500" : "bg-cream-200 dark:bg-gray-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-1.5 overflow-hidden rounded-full bg-cream-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-clay-500 transition-all" style={{ width: `${visa.progress}%` }} />
          </div>
        )}

        <Link
          href="/tools/visa-roadmap"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-clay-600 hover:text-clay-700"
        >
          {t("dashboard.visaRoadmapCta")} <ArrowRight size={12} />
        </Link>
      </div>
    </SectionCard>
  );
}
