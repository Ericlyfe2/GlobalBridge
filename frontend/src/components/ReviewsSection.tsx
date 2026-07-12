"use client";

import Link from "next/link";
import { useRef } from "react";
import { reviews } from "@/data/reviews";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import FacetMask from "@/components/FacetMask";
import ScrubTextAnimation from "@/components/ScrubTextAnimation";

gsap.registerPlugin(useGSAP);

// Duplicate for seamless infinite loop
const LOOPED = [...reviews, ...reviews, ...reviews];

// Star rating helper
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < rating ? "text-amber-500" : "text-cream-300"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const row1 = row1Ref.current;
      const row2 = row2Ref.current;
      if (!row1 || !row2) return;

      // The single-set width (one copy of the reviews)
      const singleW = row1.scrollWidth / 3;

      // Row 1: scrolls LEFT  (x: 0 → -singleW, seamless loop)
      const t1 = gsap.fromTo(
        row1,
        { x: 0 },
        {
          x: -singleW,
          duration: 35,
          ease: "none",
          repeat: -1,
          modifiers: {
            x: gsap.utils.unitize((v) => parseFloat(v) % singleW),
          },
        }
      );

      // Row 2: scrolls RIGHT (x: -singleW → 0, seamless loop)
      const t2 = gsap.fromTo(
        row2,
        { x: -singleW },
        {
          x: 0,
          duration: 40,
          ease: "none",
          repeat: -1,
          modifiers: {
            // Negate so direction is rightward; keep within one-set width
            x: gsap.utils.unitize((v) => -(Math.abs(parseFloat(v)) % singleW)),
          },
        }
      );

      // Pause on hover
      const pause = () => { t1.pause(); t2.pause(); };
      const resume = () => { t1.resume(); t2.resume(); };
      row1.addEventListener("mouseenter", pause);
      row1.addEventListener("mouseleave", resume);
      row2.addEventListener("mouseenter", pause);
      row2.addEventListener("mouseleave", resume);
    },
    { scope: sectionRef }
  );

  const renderCard = (r: typeof reviews[number], i: number) => (
    <div
      key={`${r.id}-${i}`}
      className="group shrink-0 w-[300px] md:w-[360px] p-5 rounded-2xl bg-white dark:bg-cream-100 border border-cream-200 dark:border-cream-300/10 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 shrink-0 relative">
          <FacetMask id={`rev-${r.id}-${i}`} variant="compact" media="image" src={r.avatar} alt={r.name} />
        </div>
        <div className="min-w-0">
          <p className="facet-label truncate">{r.serviceIndex} · {t(r.serviceTitleKey)}</p>
          <p className="text-sm font-semibold text-ink-900 mt-0.5 truncate">{r.name}</p>
          <p className="text-[11px] text-ink-500 truncate">{r.route}</p>
        </div>
      </div>
      <p className="text-ink-700 leading-relaxed text-sm italic line-clamp-3">
        &ldquo;{t(r.quoteKey)}&rdquo;
      </p>
      <div className="mt-4 flex items-center justify-between">
        <Stars rating={r.rating} />
        <span className="font-mono text-xs text-ink-500">{r.rating.toFixed(1)}</span>
      </div>
    </div>
  );

  // Split into two rows for the two-lane effect
  const row1Items = LOOPED;
  const row2Items = [...LOOPED].reverse();

  return (
    <section
      ref={sectionRef}
      id="reviews"
      className="relative w-full overflow-hidden py-20 md:py-28"
      style={{ background: "var(--color-cream-50)" }}
    >
      {/* Heading */}
      <div className="relative z-10 px-6 md:px-12 mb-12 md:mb-16 text-center">
        <span className="facet-label block mb-3">{t("landing.reviews.label")}</span>
        <ScrubTextAnimation 
          as="h2"
          text={t("landing.reviews.title")}
          highlightWords={["people", "moves"]}
          className="block font-display text-3xl md:text-5xl text-ink-900"
        />
        <ScrubTextAnimation 
          as="p"
          text={t("landing.reviews.subtitle")}
          highlightWords={["immigrants", "trust"]}
          className="block mt-4 text-ink-500 text-base md:text-lg max-w-xl mx-auto"
        />
      </div>

      {/* Edge fades */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-32"
        style={{ background: "linear-gradient(to right, var(--color-cream-50), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-32"
        style={{ background: "linear-gradient(to left, var(--color-cream-50), transparent)" }}
      />

      {/* Row 1 — scrolls left */}
      <div className="overflow-hidden mb-4">
        <div
          ref={row1Ref}
          className="flex gap-4 will-change-transform"
          style={{ width: "max-content" }}
        >
          {row1Items.map((r, i) => renderCard(r, i))}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="overflow-hidden">
        <div
          ref={row2Ref}
          className="flex gap-4 will-change-transform"
          style={{ width: "max-content" }}
        >
          {row2Items.map((r, i) => renderCard(r, i + 100))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 mt-12 md:mt-16 text-center">
        <Link
          href="/auth?mode=signup"
          className="inline-flex items-center gap-2 rounded-full bg-clay-500 text-white px-7 py-3.5 font-mono text-xs tracking-widest uppercase hover:bg-clay-600 transition-colors shadow-lg"
        >
          {t("landing.reviews.cta")}
        </Link>
      </div>
    </section>
  );
}
