"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/hooks/useTranslation";

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section
      id="hero"
      className="relative w-full h-screen overflow-hidden bg-ink-900"
    >
      {/* ── Background Video ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover z-0"
        src="/video/hero-loop.mp4"
      />

      {/* ── Gradients for text legibility & aesthetic ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, color-mix(in srgb, var(--color-ink-900) 95%, transparent) 0%, color-mix(in srgb, var(--color-ink-900) 80%, transparent) 40%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Mobile-specific overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none md:hidden"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--color-ink-900) 95%, transparent) 0%, color-mix(in srgb, var(--color-ink-900) 60%, transparent) 60%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle color bloom (static gradient — no heavy blur filter, for GPU cost) */}
      <div
        className="absolute inset-0 z-10 pointer-events-none mix-blend-screen opacity-70"
        style={{
          background: `
            radial-gradient(circle at 15% 25%, color-mix(in srgb, var(--color-clay-500) 22%, transparent) 0%, transparent 45%),
            radial-gradient(circle at 38% 68%, color-mix(in srgb, var(--color-sky-500) 16%, transparent) 0%, transparent 55%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Bottom transition: blur + fade */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 h-[30%] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--color-ink-900) 60%, transparent) 50%, var(--color-ink-900) 100%)",
          maskImage: "linear-gradient(180deg, transparent 0%, black 35%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 35%)",
        }}
        aria-hidden="true"
      />

      <div className="grain absolute inset-0 z-10 pointer-events-none" />

      {/* ── Text overlay ── */}
      <div
        id="hero-text"
        className="relative z-20 h-full w-full max-w-[1400px] mx-auto px-6 md:px-10 flex flex-col justify-center pb-32 md:pb-40"
      >
        <div className="max-w-xl">
          <span className="facet-label block mb-6 text-cream-50/90 drop-shadow-md">
            {t("landing.hero.label")}
          </span>
          <h1
            className="font-display text-[13vw] md:text-[4.4vw] leading-[0.98] tracking-tight text-cream-50 drop-shadow-lg"
            dangerouslySetInnerHTML={{ __html: t("landing.hero.title") }}
          />
          <p className="mt-6 text-base md:text-lg text-cream-50/85 max-w-md drop-shadow-md">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-9 flex items-center gap-5">
            {/* Primary CTA → sign up */}
            <Link
              href="/auth?mode=signup"
              className="inline-flex items-center gap-2 rounded-full bg-clay-500 text-white px-6 py-3.5 font-mono text-xs tracking-widest uppercase hover:bg-clay-600 transition-colors"
            >
              {t("landing.hero.startFree")}
            </Link>
            {/* Secondary → learn more (smooth-scrolls down the page) */}
            <a
              href="#mentorship"
              className="font-mono text-xs tracking-widest uppercase text-cream-50 hover:text-clay-300 transition-colors underline underline-offset-4 decoration-cream-50/40"
            >
              {t("landing.hero.meetNetwork")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
