"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import FacetField from "./FacetField";
import WorldClock from "./WorldClock";
import LiveCounter from "./LiveCounter";
import Newsletter from "./Newsletter";
import FacetMask from "../FacetMask";
import { useTranslation } from "@/i18n/hooks/useTranslation";

function magnetize(el: HTMLElement, strength = 0.35) {
  const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
  
  const handleMove = (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - r.left - r.width / 2) * strength);
    yTo((e.clientY - r.top - r.height / 2) * strength);
  };
  const handleLeave = () => { xTo(0); yTo(0); };
  
  el.addEventListener("mousemove", handleMove);
  el.addEventListener("mouseleave", handleLeave);
  
  return () => {
    el.removeEventListener("mousemove", handleMove);
    el.removeEventListener("mouseleave", handleLeave);
  };
}

export function Footer() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const cleanups: (() => void)[] = [];
    if (linksRef.current) {
      const links = linksRef.current.querySelectorAll("li > a");
      links.forEach(el => cleanups.push(magnetize(el as HTMLElement)));
    }
    if (topRef.current) {
      cleanups.push(magnetize(topRef.current));
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const words = rootRef.current?.querySelectorAll(".assemble-word");
        if (words && words.length) {
          gsap.fromTo(words, 
            { autoAlpha: 0, y: 40, rotateX: -40 },
            { 
              autoAlpha: 1, 
              y: 0, 
              rotateX: 0, 
              stagger: 0.1, 
              ease: "back.out(1.5)",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 70%",
                end: "top 30%",
                scrub: 0.8
              }
            }
          );
        }
      });
      return () => mm.revert();
    }, rootRef);

    return () => {
      cleanups.forEach(c => c());
      ctx.revert();
    };
  }, []);

  const handleLogoClick = () => {
    const seams = rootRef.current?.querySelectorAll(".facet-field-seam");
    if (!seams?.length) return;
    const tl = gsap.timeline();
    tl.to(seams, { strokeDashoffset: 1, x: "random(-10, 10)", y: "random(-10, 10)", duration: 0.15 })
      .to(seams, { strokeDashoffset: 0, x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const titleText = t("landing.closing.title") || "Every piece, one bridge.";
  const words = titleText.split(" ");

  return (
    <footer ref={rootRef} className="relative w-full pt-32 pb-24 bg-cream-50 border-t border-cream-200 overflow-hidden">
      <FacetField />
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="text-center mb-32">
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl text-ink-900 leading-tight mb-12 flex flex-wrap justify-center gap-[0.3em]" style={{ perspective: 1000 }}>
            {words.map((w, i) => (
              <span key={i} className="assemble-word inline-block origin-bottom">{w}</span>
            ))}
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="/auth?mode=signup" className="btn-accent px-8 py-4 text-base tracking-wide shadow-xl shadow-clay-500/20">
              {t("landing.ctaButton")}
            </a>
            <a href="/auth?mode=signup" className="btn-ghost px-8 py-4 text-base tracking-wide bg-white/50 backdrop-blur border border-clay-200">
              {t("landing.ctaAssistantButton")}
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 mb-24 items-end">
          <div>
            <div ref={logoRef} onClick={handleLogoClick} className="cursor-pointer inline-block">
              <h3 className="font-display text-3xl md:text-4xl text-ink-900 mb-2">Global Bridge</h3>
            </div>
            <p className="text-ink-500 font-mono text-sm tracking-wide">{t("landing.footer.subtitle")}</p>
          </div>
          <div className="md:justify-self-end w-full md:w-auto">
            <Newsletter />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
          <div>
            <h4 className="font-mono text-xs tracking-widest uppercase text-clay-500 mb-6">{t("landing.footer.sitemap")}</h4>
            <ul ref={linksRef} className="space-y-4 text-sm text-ink-700">
              <li><a href="#section-visa" className="inline-block hover:text-clay-500 transition-colors py-1">01 {t("landing.visa.title")}</a></li>
              <li><a href="#housing" className="inline-block hover:text-clay-500 transition-colors py-1">02 {t("landing.housing.title")}</a></li>
              <li><a href="#mentorship" className="inline-block hover:text-clay-500 transition-colors py-1">03 {t("landing.mentorship.title")}</a></li>
              <li><a href="#jobs" className="inline-block hover:text-clay-500 transition-colors py-1">04 {t("landing.jobs.title")}</a></li>
              <li><a href="#lifesupport" className="inline-block hover:text-clay-500 transition-colors py-1">05 {t("landing.lifeSupport.title")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs tracking-widest uppercase text-clay-500 mb-6">{t("landing.footer.company")}</h4>
            <ul className="space-y-4 text-sm text-ink-700">
              <li><a href="#" className="hover:text-clay-500 transition-colors">{t("landing.footer.about")}</a></li>
              <li><a href="#" className="hover:text-clay-500 transition-colors">{t("landing.footer.careers")}</a></li>
              <li><a href="#" className="hover:text-clay-500 transition-colors">{t("landing.footer.press")}</a></li>
              <li><a href="#" className="hover:text-clay-500 transition-colors">{t("landing.footer.contact")}</a></li>
              <li><a href="#" className="hover:text-clay-500 transition-colors">{t("landing.footer.trustSafety")}</a></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-2 grid sm:grid-cols-2 gap-12">
            <div>
              <h4 className="font-mono text-xs tracking-widest uppercase text-clay-500 mb-6">{t("landing.footer.status")}</h4>
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-ink-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-leaf-500" />
                  {t("landing.footer.allSystemsLive")}
                </div>
                <LiveCounter />
              </div>
            </div>
            <div>
              <h4 className="font-mono text-xs tracking-widest uppercase text-clay-500 mb-6 opacity-0 hidden sm:block">{t("landing.footer.time")}</h4>
              <WorldClock />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-cream-200 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm font-mono text-ink-500">{t("landing.footer.copyright")}</div>
          <div className="flex gap-4">
            {['IN', 'IG', 'X', 'YT'].map((s) => (
              <a key={s} href="#" className="w-10 h-10 rounded-full border border-cream-200 flex items-center justify-center text-xs font-mono text-ink-500 hover:text-clay-500 hover:border-clay-500 transition-colors">{s}</a>
            ))}
          </div>
          <div ref={topRef} onClick={handleBackToTop} className="cursor-pointer flex items-center gap-4 p-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-500 transition-colors">{t("landing.footer.backToTop")}</span>
            <div className="w-10 h-10 relative bg-cream-50 rounded-full flex items-center justify-center">
              <FacetMask id="back-to-top" variant="compact" media="image" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" alt="Top" glow={false} />
              <div className="absolute inset-0 flex items-center justify-center text-clay-500 z-10 pointer-events-none">↑</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
