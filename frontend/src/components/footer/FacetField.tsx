"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const seeds = [
  { d: "M0,0 L1,0.1 L0.9,1 L0,0.8 Z", x: "5%", y: "10%", scale: 0.9, rotate: -8 },
  { d: "M0,0.2 L1,0 L0.8,1 L0,1 Z", x: "70%", y: "5%", scale: 1.1, rotate: 12 },
  { d: "M0.2,0 L1,0 L0.9,0.9 L0,1 Z", x: "20%", y: "60%", scale: 0.8, rotate: 45 },
  { d: "M0.1,0.1 L0.9,0 L1,0.9 L0,1 Z", x: "80%", y: "50%", scale: 1.2, rotate: -20 },
  { d: "M0,0.5 L0.5,0 L1,0.5 L0.5,1 Z", x: "40%", y: "30%", scale: 1.0, rotate: 5 },
  { d: "M0,0 L1,0.2 L0.8,1 L0.1,0.9 Z", x: "15%", y: "80%", scale: 1.3, rotate: 30 },
  { d: "M0.3,0 L1,0.1 L0.7,1 L0,0.8 Z", x: "60%", y: "85%", scale: 0.7, rotate: -15 },
];

export default function FacetField() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.to(".facet-field-seam", {
        strokeDashoffset: 0, 
        stagger: 0.15, 
        ease: "power1.out",
        scrollTrigger: { trigger: root, start: "top 90%", end: "top 50%", scrub: 0.6 },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.06]">
      {seeds.map((s, i) => (
        <svg key={i} viewBox="0 0 1 1" style={{ position: "absolute", left: s.x, top: s.y, width: 220, height: 220, transform: `rotate(${s.rotate}deg) scale(${s.scale})` }}>
          <path d={s.d} fill="none" stroke="var(--color-clay-500)" strokeWidth={0.006}
            pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} className="facet-field-seam" />
        </svg>
      ))}
    </div>
  );
}
