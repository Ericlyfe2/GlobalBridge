"use client";

import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { gsap } from "@/lib/gsap";
import FacetMask from "@/components/FacetMask";

export default function ClosingCTA() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const words = root.querySelectorAll(".assemble-word");
        const mask = root.querySelector(".facet-mask");
        
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top 60%",
            end: "top 20%",
            scrub: 0.8
          }
        });

        if (words.length) {
          tl.fromTo(words, 
            { autoAlpha: 0, y: 40, rotateX: -40 },
            { autoAlpha: 1, y: 0, rotateX: 0, stagger: 0.1, ease: "back.out(1.5)" }, 0
          );
        }

        if (mask) {
          const seams = mask.querySelectorAll('[data-seam="crack"]');
          const outline = mask.querySelector('[data-seam="outline"]');
          if (outline) tl.fromTo(outline, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none" }, 0);
          if (seams.length) tl.fromTo(seams, { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.1, ease: "none" }, 0.2);
        }
      });
      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  const titleText = t("landing.closing.title") || "Every piece, one bridge.";
  const words = titleText.split(" ");

  return (
    <section ref={rootRef} className="relative w-full py-32 md:py-48 bg-cream-50 overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 w-full h-full max-w-[1600px] mx-auto opacity-30">
        <FacetMask 
          id="closing-bg" 
          variant="wide" 
          media="image" 
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1600&auto=format&fit=crop" 
          alt="Closing" 
          glow={false}
        />
      </div>

      <div className="relative z-10 text-center px-6">
        <h2 className="font-display text-5xl md:text-7xl lg:text-8xl text-ink-900 leading-tight mb-12 flex flex-wrap justify-center gap-[0.3em]" style={{ perspective: 1000 }}>
          {words.map((w, i) => (
            <span key={i} className="assemble-word inline-block origin-bottom">{w}</span>
          ))}
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="/auth?mode=signup" className="btn-accent px-8 py-4 text-base tracking-wide shadow-xl shadow-clay-500/20">
            {t("landing.ctaButton")}
          </a>
          <a href="/auth?mode=signup" className="btn-ghost px-8 py-4 text-base tracking-wide bg-white/50 backdrop-blur border border-cream-200">
            {t("landing.ctaAssistantButton")}
          </a>
        </div>
      </div>
    </section>
  );
}
