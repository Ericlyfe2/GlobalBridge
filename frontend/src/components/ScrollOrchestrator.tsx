"use client";
import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function ScrollOrchestrator() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          noReduced: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };
          const heroText = document.getElementById("hero-text");
          const heroSection = document.getElementById("hero");
          const curtain = document.getElementById("section-visa");

          if (!heroText || !heroSection || !curtain) return;

          if (reduced) {
            gsap.set([heroText], { clearProps: "all" });
            return;
          }

          gsap.set(curtain, { yPercent: 100 });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: heroSection,
              start: "top top",
              end: "+=100%",
              scrub: 0.6,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
            },
          });

          tl.to(heroText, { autoAlpha: 0, y: -50, ease: "power1.out" }, 0).to(
            curtain,
            { yPercent: 0, ease: "power2.inOut" },
            0.45
          );
        }
      );
      return () => mm.revert();
    });

    return () => ctx.revert();
  });

  return <div ref={containerRef} />;
}
