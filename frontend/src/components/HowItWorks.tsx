"use client";

import Link from "next/link";
import { Compass, Sparkles, KeyRound, LifeBuoy, ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";

const STEPS = [
  { icon: Compass, titleKey: "landing.how.step1Title", bodyKey: "landing.how.step1Body" },
  { icon: Sparkles, titleKey: "landing.how.step2Title", bodyKey: "landing.how.step2Body" },
  { icon: KeyRound, titleKey: "landing.how.step3Title", bodyKey: "landing.how.step3Body" },
  { icon: LifeBuoy, titleKey: "landing.how.step4Title", bodyKey: "landing.how.step4Body" },
];

export default function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="relative w-full bg-cream-50 py-24 md:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10">
        {/* Heading */}
        <div className="max-w-2xl">
          <div className="mb-6 flex items-center gap-4">
            <span className="facet-label text-clay-500">{t("landing.how.label")}</span>
            <div className="h-px w-12 bg-clay-500/30" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight text-ink-900">
            {t("landing.how.title")}
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
            {t("landing.how.subtitle")}
          </p>
        </div>

        {/* Steps */}
        <ol className="mt-14 grid gap-6 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.titleKey}
              className="group relative flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6 transition-colors hover:border-clay-500/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600">
                  <s.icon size={22} />
                </div>
                <span className="font-mono text-sm text-ink-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-display text-xl text-ink-900">{t(s.titleKey)}</h3>
              <p className="text-sm leading-relaxed text-ink-600">{t(s.bodyKey)}</p>
            </li>
          ))}
        </ol>

        {/* CTA */}
        <div className="mt-12 md:mt-16">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center gap-2 rounded-full bg-clay-500 px-7 py-3.5 font-mono text-xs uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-clay-600"
          >
            {t("landing.how.cta")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
