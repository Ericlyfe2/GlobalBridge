"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { GLOBE_MARKERS, GLOBE_CONNECTIONS } from "@/data/globeNetwork";

// Canvas globe is client-only (uses requestAnimationFrame / devicePixelRatio) —
// load it lazily so it never runs during SSR and is code-split from the hero.
const Globe = dynamic(
  () => import("@/components/ui/interactive-globe").then((m) => m.Component),
  { ssr: false },
);

export default function Hero() {
  const { t } = useTranslation();

  // ── Responsive globe size ─────────────────────────────────────────────────
  // The canvas globe takes a fixed pixel size, so derive it from the viewport
  // (its inline width/height would otherwise override any responsive CSS).
  const [globeSize, setGlobeSize] = useState(600);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setGlobeSize(
        w < 400 ? 300 : w < 640 ? 360 : w < 768 ? 440 : w < 1024 ? 500 : w < 1280 ? 580 : 640,
      );
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

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

      {/* ── Interactive globe ──
          Sits above the video (z-0) but below the gradient/grain overlays (z-10)
          so the color blooms and bottom fade blend it into the scene. Visible on
          every screen: centered + dimmed on mobile, anchored right on desktop.
          Only the canvas is interactive (drag to rotate); the wrapper ignores
          pointer events. */}
      <div
        className="absolute inset-0 z-[5] flex items-center justify-center lg:justify-end lg:pr-[4%] pointer-events-none"
        aria-hidden="true"
      >
        <Globe
          size={globeSize}
          className="pointer-events-auto opacity-40 md:opacity-60 lg:opacity-95"
          markers={GLOBE_MARKERS}
          connections={GLOBE_CONNECTIONS}
          dotColor="rgba(45, 212, 191, ALPHA)"
          arcColor="rgba(56, 189, 248, 0.45)"
          markerColor="rgba(94, 234, 212, 1)"
        />
      </div>

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

      {/* ── Text overlay ──
          pointer-events-none lets globe drags pass through the empty right side;
          the content block re-enables events so the CTAs stay clickable. */}
      <div
        id="hero-text"
        className="relative z-20 h-full w-full max-w-[1400px] mx-auto px-6 md:px-10 flex flex-col justify-center pb-32 md:pb-40 pointer-events-none"
      >
        <div className="max-w-xl pointer-events-auto">
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
