"use client";

import { useLayoutEffect, useRef } from "react";
import ScrubTextAnimation from "@/components/ScrubTextAnimation";
import { lifeSupportData } from "@/data/services";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { gsap } from "@/lib/gsap";

export default function LifeSupportSection() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tiles = root.querySelectorAll(".life-tile");
        
        gsap.from(tiles, {
          autoAlpha: 0,
          y: 20,
          stagger: { each: 0.1, grid: [2, 2], from: "start" },
          scrollTrigger: { trigger: root, start: "top 60%", end: "top 30%", scrub: 0.8 },
        });

        // SOS pulse is infinite yoyo handled via CSS animation or simple GSAP
        const sosTile = root.querySelector(".sos-tile");
        if (sosTile) {
          gsap.to(sosTile, {
            boxShadow: "0 0 0 12px rgba(217, 119, 6, 0)",
            duration: 1.5,
            repeat: -1,
            ease: "power1.inOut"
          });
        }
      });
      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="lifesupport" className="relative w-full py-24 md:py-32 bg-cream-100">
      <div className="max-w-[1400px] w-full mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="font-mono text-sm tracking-widest text-clay-500">{lifeSupportData.index}</span>
              <div className="h-[1px] w-12 bg-clay-500/30" />
              <span className="facet-label">{t(lifeSupportData.titleKey)}</span>
            </div>
            
            <ScrubTextAnimation 
              as="h2"
              text={t(lifeSupportData.dekKey)}
              highlightWords={["flight", "lands"]}
              className="block font-display text-4xl md:text-5xl lg:text-6xl text-ink-900 leading-tight mb-6"
            />
            
            <ScrubTextAnimation 
              as="p"
              text={t(lifeSupportData.detailKey)}
              highlightWords={["calculators", "healthcare", "banking", "emergency"]}
              className="block text-lg text-ink-600 mb-10 max-w-lg leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {lifeSupportData.tools.map((tool, i) => (
              <div 
                key={i} 
                className={`life-tile p-6 rounded-xl border flex flex-col justify-between aspect-square transition-colors ${
                  tool.sos
                    ? "sos-tile bg-white border-amber-500/30 shadow-[0_0_0_0_rgba(217,119,6,0.3)] hover:border-amber-500"
                    : "bg-white border-slate-200 hover:border-clay-500/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tool.sos ? "bg-amber-500/10 text-amber-500" : "bg-slate-100 text-slate-600"}`}>
                  {tool.sos ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className={`font-medium mb-1 ${tool.sos ? "text-amber-500" : "text-slate-900"}`}>{t(tool.labelKey)}</h3>
                  <p className="text-sm text-slate-500">{t(tool.noteKey)}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
