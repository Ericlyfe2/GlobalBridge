"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { GLOBE_MARKERS, GLOBE_CONNECTIONS } from "@/data/globeNetwork";

// Canvas globe is client-only (uses requestAnimationFrame / devicePixelRatio) —
// load it lazily so it never runs during SSR and is code-split from the hero.
const Globe = dynamic(
  () => import("@/components/ui/interactive-globe").then((m) => m.Component),
  { ssr: false },
);

// ── Carousel card definitions ────────────────────────────────────────────────
interface CarouselCard {
  id: string;
  title: string;
  tag?: string;
  image: string;
  accent?: string;
}

const CARDS: CarouselCard[] = [
  {
    id: "tokyo",
    title: "Tokyo",
    tag: "Japan — Asia Pacific",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=900&h=1200&fit=crop&auto=format",
    accent: "#1a1a2e",
  },
  {
    id: "berlin",
    title: "Berlin",
    tag: "Germany — Europe",
    image:
      "https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=900&h=1200&fit=crop&auto=format",
    accent: "#0d1117",
  },
  {
    id: "toronto",
    title: "Toronto",
    tag: "Canada — North America",
    image:
      "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?q=80&w=900&h=1200&fit=crop&auto=format",
    accent: "#1c1c2e",
  },
  {
    id: "dubai",
    title: "Dubai",
    tag: "UAE — Middle East",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=900&h=1200&fit=crop&auto=format",
    accent: "#1a1200",
  },
  {
    id: "london",
    title: "London",
    tag: "United Kingdom — Europe",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=900&h=1200&fit=crop&auto=format",
    accent: "#111827",
  },
];

/**
 * Slot layout — pure function of signed offset from the active card.
 *
 *   offset:  +1 (queued, off-screen right)  0 (active)  -1  -2  -3  -4  <= -5 (parked)
 */
const VISIBLE_DEPTH = 4;

function slotFor(offset: number) {
  if (offset === 0) {
    return { xPercent: 0, scale: 1, opacity: 1, zIndex: 50 };
  }
  if (offset === 1) {
    // Pre-sized at final scale while still fully off-screen → pure slide entrance
    return { xPercent: 120, scale: 1, opacity: 0, zIndex: 60 };
  }
  if (offset < 0 && offset >= -VISIBLE_DEPTH) {
    const steps = [
      { xPercent: -85, scale: 0.8, opacity: 0.95 },
      { xPercent: -150, scale: 0.62, opacity: 0.85 },
      { xPercent: -200, scale: 0.46, opacity: 0.7 },
      { xPercent: -245, scale: 0.32, opacity: 0.5 },
    ];
    const s = steps[-offset - 1];
    return { ...s, zIndex: 40 + offset };
  }
  if (offset > 0) return { xPercent: 150, scale: 1, opacity: 0, zIndex: 0 };
  return { xPercent: -320, scale: 0.28, opacity: 0, zIndex: 0 };
}

function signedOffset(cardIndex: number, activeIndex: number, total: number) {
  const raw = (cardIndex - activeIndex + total) % total;
  return raw > total / 2 ? raw - total : raw;
}

const STEP_DURATION = 0.9;
const STAGGER = 0.06;
const AUTOPLAY_DELAY = 4200;


export default function Hero() {
  const { t } = useTranslation();

  // ── Carousel state ────────────────────────────────────────────────────────
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIndex = useRef(0);
  const isAnimating = useRef(false);
  const autoplayId = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = CARDS.length;
  const [, forceRerender] = useState(0);

  const applyImmediate = useCallback(() => {
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const offset = signedOffset(i, activeIndex.current, total);
      const target = slotFor(offset);
      gsap.set(el, {
        xPercent: target.xPercent,
        scale: target.scale,
        opacity: target.opacity,
        zIndex: target.zIndex,
        transformOrigin: "bottom right",
      });
    });
  }, [total]);

  useEffect(() => {
    applyImmediate();
  }, [applyImmediate]);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      activeIndex.current = (activeIndex.current + direction + total) % total;

      const tl = gsap.timeline({
        defaults: { duration: STEP_DURATION, ease: "power3.out" },
        onComplete: () => {
          isAnimating.current = false;
        },
      });

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const offset = signedOffset(i, activeIndex.current, total);
        const target = slotFor(offset);
        const delay =
          Math.min(Math.abs(offset), VISIBLE_DEPTH + 1) * STAGGER;

        tl.to(
          el,
          {
            xPercent: target.xPercent,
            scale: target.scale,
            opacity: target.opacity,
            zIndex: target.zIndex,
          },
          delay
        );
      });

      forceRerender((n) => n + 1);
    },
    [total]
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  useEffect(() => {
    autoplayId.current = setInterval(next, AUTOPLAY_DELAY);
    return () => {
      if (autoplayId.current) clearInterval(autoplayId.current);
    };
  }, [next]);

  const pauseAutoplay = () => {
    if (autoplayId.current) clearInterval(autoplayId.current);
  };
  const resumeAutoplay = () => {
    pauseAutoplay();
    autoplayId.current = setInterval(next, AUTOPLAY_DELAY);
  };

  return (
    <section
      id="hero"
      className="relative w-full h-screen overflow-hidden bg-ink-900"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={resumeAutoplay}
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

      {/* ── Carousel cards (rendered behind text) ── 
      <div className="absolute inset-0 z-10 pointer-events-none">
        {CARDS.map((card, i) => (
          <div
            key={card.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="absolute bottom-0 right-0 h-[60%] w-[38%] origin-bottom-right overflow-hidden rounded-sm will-change-transform"
            style={{ backgroundColor: card.accent ?? "#111" }}
          >
            <img
              src={card.image}
              alt={card.title}
              className="h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <span className="text-xs uppercase tracking-widest text-white/70">
                {card.tag}
              </span>
              <h3 className="text-2xl font-medium leading-tight text-white">
                {card.title}
              </h3>
            </div>
          </div>
        ))}
      </div>*/}

      {/* ── Interactive globe (right side, desktop) ──
          Sits above the video (z-0) but below the gradient/grain overlays (z-10)
          so the color blooms and bottom fade blend it into the scene. Only the
          canvas is interactive (drag to rotate); the wrapper ignores pointer events. */}
      <div
        className="absolute inset-y-0 right-0 z-[5] hidden lg:flex items-center justify-center w-1/2 xl:w-[55%] pointer-events-none"
        aria-hidden="true"
      >
        <Globe
          size={620}
          className="pointer-events-auto opacity-95"
          markers={GLOBE_MARKERS}
          connections={GLOBE_CONNECTIONS}
          dotColor="rgba(45, 212, 191, ALPHA)"
          arcColor="rgba(56, 189, 248, 0.45)"
          markerColor="rgba(94, 234, 212, 1)"
        />
      </div>

      {/* ── Gradients for text legibility & aesthetic ── */}
      {/* Desktop/Base legibility: Dark behind text on the left, clear on the right for the carousel */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, color-mix(in srgb, var(--color-ink-900) 95%, transparent) 0%, color-mix(in srgb, var(--color-ink-900) 80%, transparent) 40%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Mobile-specific overlay: Extra darkening at the top/left where text naturally sits on narrow screens, avoiding carousel at bottom right */}
      <div
        className="absolute inset-0 z-10 pointer-events-none md:hidden"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--color-ink-900) 95%, transparent) 0%, color-mix(in srgb, var(--color-ink-900) 60%, transparent) 60%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Dynamic color blooms to bring it to life */}
      <div
        className="absolute inset-0 z-10 pointer-events-none mix-blend-screen"
        style={{
          background: `
            radial-gradient(circle at 15% 25%, color-mix(in srgb, var(--color-clay-500) 35%, transparent) 0%, transparent 45%),
            radial-gradient(circle at 35% 65%, color-mix(in srgb, var(--color-sky-500) 25%, transparent) 0%, transparent 50%)
          `,
          filter: "blur(60px)",
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
            <a
              href="#visa"
              className="inline-flex items-center gap-2 rounded-full bg-clay-500 text-white px-6 py-3.5 font-mono text-xs tracking-widest uppercase hover:bg-clay-600 transition-colors"
            >
              {t("landing.hero.startFree")}
            </a>
            <a
              href="#mentorship"
              className="font-mono text-xs tracking-widest uppercase text-cream-50 hover:text-clay-300 transition-colors underline underline-offset-4 decoration-cream-50/40"
            >
              {t("landing.hero.meetNetwork")}
            </a>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      
    </section>
  );
}