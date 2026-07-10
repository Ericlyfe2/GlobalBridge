"use client";

import Link from "next/link";
import { GraduationCap, Briefcase, Home, MapPin, CalendarClock, ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";

// Illustrative, representative sample of what's on the platform. Kept static on
// the public landing so visitors see concrete value before signing up; the full,
// live list lives behind /opportunities.
type Kind = "scholarship" | "job" | "housing";

const SAMPLE: {
  kind: Kind;
  title: string;
  org: string;
  location: string;
  meta: string;
  tag?: "sponsor" | "verified";
}[] = [
  { kind: "scholarship", title: "Chevening Master's Scholarship", org: "UK Government", location: "United Kingdom", meta: "Fully funded" },
  { kind: "job", title: "Junior Software Engineer", org: "Fintech · Berlin", location: "Germany", meta: "€55k–65k", tag: "sponsor" },
  { kind: "housing", title: "Verified studio near campus", org: "Identity-checked host", location: "Toronto", meta: "$1,150 / mo", tag: "verified" },
  { kind: "scholarship", title: "DAAD Study Scholarship", org: "DAAD", location: "Germany", meta: "€934 / mo stipend" },
  { kind: "job", title: "Data Analyst (Graduate)", org: "Health-tech · Dublin", location: "Ireland", meta: "€42k", tag: "sponsor" },
  { kind: "housing", title: "Shared 2-bed, roommate matched", org: "Identity-checked host", location: "Melbourne", meta: "A$320 / wk", tag: "verified" },
];

const KIND_META: Record<Kind, { icon: typeof GraduationCap; labelKey: string; tone: string }> = {
  scholarship: { icon: GraduationCap, labelKey: "landing.opps.scholarship", tone: "bg-clay-500/10 text-clay-600" },
  job: { icon: Briefcase, labelKey: "landing.opps.job", tone: "bg-sky-500/10 text-sky-600" },
  housing: { icon: Home, labelKey: "landing.opps.housing", tone: "bg-leaf-500/10 text-leaf-600" },
};

export default function OpportunitiesPreview() {
  const { t } = useTranslation();

  return (
    <section id="opportunities-preview" className="relative w-full bg-cream-100 py-24 md:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10">
        <div className="max-w-2xl">
          <div className="mb-6 flex items-center gap-4">
            <span className="facet-label text-clay-500">{t("landing.opps.label")}</span>
            <div className="h-px w-12 bg-clay-500/30" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight text-ink-900">
            {t("landing.opps.title")}
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
            {t("landing.opps.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE.map((o, i) => {
            const meta = KIND_META[o.kind];
            return (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6 transition-colors hover:border-clay-500/40"
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.tone}`}>
                    <meta.icon size={13} />
                    {t(meta.labelKey)}
                  </span>
                  {o.tag === "sponsor" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600">
                      <ShieldCheck size={12} /> {t("landing.opps.sponsor")}
                    </span>
                  )}
                  {o.tag === "verified" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-leaf-600">
                      <ShieldCheck size={12} /> {t("landing.opps.verified")}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-ink-900">{o.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-500">{o.org}</p>
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {o.location}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-ink-700">
                    <CalendarClock size={12} /> {o.meta}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 md:mt-16">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center gap-2 rounded-full border border-clay-500/40 px-7 py-3.5 font-mono text-xs uppercase tracking-widest text-clay-600 transition-colors hover:bg-clay-500 hover:text-white"
          >
            {t("landing.opps.viewAll")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
