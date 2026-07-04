"use client";

import { useLayoutEffect, useRef } from "react";
import FacetMask from "@/components/FacetMask";
import ScrubTextAnimation from "@/components/ScrubTextAnimation";
import { ServiceData } from "@/data/services";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function ServiceSection({ service, children, disableMaskAnimation = false }: { service: ServiceData; children?: React.ReactNode; disableMaskAnimation?: boolean }) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top 60%",
            end: "top 40%",
            scrub: 0.8,
          },
        });

        // 1. FacetMask scales in (pops) if not handled externally
        const mask = root.querySelector(".facet-mask");
        if (mask) {
          if (!disableMaskAnimation) {
            tl.fromTo(mask, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, ease: "back.out(1.5)" }, 0);
          }
          
          // 4. Seam lines draw in
          const seams = mask.querySelectorAll('[data-seam="crack"]');
          const outline = mask.querySelector('[data-seam="outline"]');
          if (outline) tl.fromTo(outline, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none" }, 0);
          if (seams.length) tl.fromTo(seams, { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.1, ease: "none" }, 0);
        }

        // 2. Copy lines stagger up and fade
        const lines = root.querySelectorAll(".reveal-line");
        if (lines.length) {
          tl.fromTo(lines, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, stagger: 0.1, ease: "none" }, 0);
        }

        // 3. Bullets stagger in from side
        const bullets = root.querySelectorAll(".reveal-bullet");
        if (bullets.length) {
          const startX = service.side === "left" ? 40 : -40;
          tl.fromTo(bullets, { autoAlpha: 0, x: startX }, { autoAlpha: 1, x: 0, stagger: 0.1, ease: "none" }, 0.2);
        }

        // 5. Parallax on .facet-media-el
        const mediaEl = root.querySelector(".facet-media-el");
        if (mediaEl) {
          gsap.fromTo(mediaEl, 
            { yPercent: -15, scale: 1.2 }, 
            { 
              yPercent: 15, 
              ease: "none",
              scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true } 
            }
          );
        }

        // Specific: Housing assemble removed for Dream Bubble theme
      });
      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, [service.side]);

  return (
    <section ref={rootRef} id={service.id} className="relative w-full py-24 md:py-32 bg-cream-50 overflow-hidden">
      <div className="max-w-[1400px] w-full mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          
          {/* Text Content */}
          <div className={`order-2 ${service.side === "right" ? "md:order-1" : "md:order-2"}`}>
            <div className="reveal-line flex items-center gap-4 mb-6">
              <span className="font-mono text-sm tracking-widest text-clay-500">{service.index}</span>
              <div className="h-[1px] w-12 bg-clay-500/30" />
              <span className="facet-label">{t(service.titleKey)}</span>
            </div>
            
            <ScrubTextAnimation 
              as="h2"
              text={t(service.dekKey)}
              highlightWords={["visa", "housing", "jobs", "internships", "guesswork", "roommate", "sponsorship"]}
              className="block font-display text-4xl md:text-5xl lg:text-6xl text-ink-900 leading-tight mb-6"
            />
            
            <ScrubTextAnimation 
              as="p"
              text={t(service.detailKey)}
              highlightWords={["document", "checklist", "embassies", "landlords", "identity-checked", "resume", "sponsors"]}
              className="block text-lg text-ink-600 mb-10 max-w-lg leading-relaxed"
            />

            <ul className="space-y-4">
              {service.bullets.map((b, i) => (
                <li key={i} className="reveal-bullet flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-clay-500 shrink-0" />
                  <span className="text-ink-700">{t(b.key)}</span>
                </li>
              ))}
            </ul>

            {/* Custom section injections (e.g. Counters for Jobs, Checklist for Visa) */}
            {children}
          </div>

          {/* Media Content */}
          <div className={`order-1 ${service.side === "right" ? "md:order-2" : "md:order-1"} relative h-[50vh] md:h-[70vh] w-full`}>
            <FacetMask id={`mask-${service.id}`} className={disableMaskAnimation ? "opacity-0 invisible" : "opacity-0 invisible"} variant={service.variant} media="image" src={service.image} alt={t(service.titleKey)} />
            
            {/* Housing assemble overlay removed for Dream Bubble theme */}
          </div>
        </div>
      </div>
    </section>
  );
}
