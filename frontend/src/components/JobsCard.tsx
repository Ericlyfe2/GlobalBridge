"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export default function JobsCard() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      // 1. Stat numbers count up
      const nums = root.querySelectorAll("[data-target]");
      nums.forEach((el) => {
        const target = Number((el as HTMLElement).dataset.target ?? 0);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          scrollTrigger: { trigger: el, start: "top 85%", end: "top 50%", scrub: 0.6 },
          onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString(); },
        });
      });

      // 2. Resume card pseudo-3D tilt
      const card = root.querySelector(".resume-card");
      if (card) {
        gsap.fromTo(card,
          { rotateY: 22, rotateX: 8, y: 60, autoAlpha: 0 },
          { rotateY: 0, rotateX: 0, y: 0, autoAlpha: 1, ease: "none",
            scrollTrigger: { trigger: root, start: "top 70%", end: "top 25%", scrub: 0.8 } }
        );
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="mt-12 grid grid-cols-2 gap-6 items-end" style={{ perspective: 800 }}>
      <div className="space-y-6">
        <div>
          <div className="text-4xl font-display font-medium text-clay-500 mb-1 flex items-baseline">
            <span data-target="12400">0</span>
            <span className="text-2xl ml-1">+</span>
          </div>
          <p className="text-xs font-mono tracking-wide text-ink-500 uppercase">Sponsor Roles</p>
        </div>
        <div>
          <div className="text-4xl font-display font-medium text-clay-500 mb-1 flex items-baseline">
            <span data-target="86">0</span>
            <span className="text-2xl ml-1">%</span>
          </div>
          <p className="text-xs font-mono tracking-wide text-ink-500 uppercase">Interview Lift</p>
        </div>
      </div>

      <div className="resume-card bg-white p-4 rounded-xl border border-cream-200 shadow-xl shadow-clay-500/10 origin-bottom-left">
        <div className="w-10 h-10 rounded-full bg-cream-100 mb-4" />
        <div className="space-y-2">
          <div className="w-3/4 h-2 bg-cream-200 rounded" />
          <div className="w-1/2 h-2 bg-cream-200 rounded" />
          <div className="w-full h-2 bg-cream-100 rounded mt-4" />
          <div className="w-5/6 h-2 bg-cream-100 rounded" />
        </div>
        <div className="mt-6 flex gap-2">
          <div className="px-2 py-1 bg-clay-500/10 text-clay-600 rounded text-[10px] font-mono">VISA-SPONSOR</div>
        </div>
      </div>
    </div>
  );
}
