"use client";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useTranslation } from "@/i18n/hooks/useTranslation";

export default function LiveCounter({ base = 18342 }: { base?: number }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      let val = base - 500;
      const obj = { val };
      
      gsap.to(obj, {
        val: base,
        scrollTrigger: { trigger: el, start: "top 95%", end: "top 70%", scrub: 0.6 },
        onUpdate: () => { 
          val = Math.round(obj.val);
          el.textContent = val.toLocaleString(); 
        },
      });

      let timeout: NodeJS.Timeout;
      const tick = () => {
        if (!document.hidden) {
          val += 1;
          gsap.fromTo(el, { scale: 1.15 }, { scale: 1, duration: 0.4, ease: "back.out(2)" });
          el.textContent = val.toLocaleString();
        }
        timeout = setTimeout(tick, 6000 + Math.random() * 8000);
      };

      timeout = setTimeout(tick, 6000 + Math.random() * 8000);
      return () => clearTimeout(timeout);
    }, el);
    return () => ctx.revert();
  }, [base]);

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-clay-500 animate-pulse" />
      <div className="font-mono text-ink-900 flex items-center gap-2">
        <span ref={ref}>{(base - 500).toLocaleString()}</span> {t("landing.footer.bridgesBuilt")}
      </div>
    </div>
  );
}
