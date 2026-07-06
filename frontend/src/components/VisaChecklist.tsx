"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export default function VisaChecklist() {
  const listRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ctx = gsap.context(() => {
      const items = list.querySelectorAll(".checklist-item");
      const paths = list.querySelectorAll(".checklist-path");
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: list,
          start: "top 55%",
          end: "bottom 60%",
          scrub: 0.6,
        }
      });

      tl.fromTo(items, { backgroundColor: "rgba(20, 184, 166, 0)" }, { backgroundColor: "rgba(20, 184, 166, 0.05)", stagger: 0.25, ease: "none" }, 0)
        .fromTo(paths, { strokeDasharray: 20, strokeDashoffset: 20 }, { strokeDashoffset: 0, stagger: 0.25, ease: "none" }, 0);
    }, list);

    return () => ctx.revert();
  }, []);

  const steps = [
    "University Acceptance Letter",
    "Proof of Financial Support",
    "Passport Validity Check",
    "Biometrics Appointment",
  ];

  return (
    <ul ref={listRef} className="mt-10 space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="checklist-item flex items-center gap-3 p-3 rounded-lg border border-clay-500/10 transition-colors">
          <svg className="w-5 h-5 text-clay-500 shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
            <path className="checklist-path" d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-ink-800">{step}</span>
        </li>
      ))}
    </ul>
  );
}
