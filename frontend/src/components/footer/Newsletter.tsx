"use client";
import { useState, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useTranslation } from "@/i18n/hooks/useTranslation";

export default function Newsletter() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const checkRef = useRef<SVGPathElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setTimeout(() => {
      setStatus("success");
      if (checkRef.current) {
        gsap.fromTo(checkRef.current, { strokeDasharray: 20, strokeDashoffset: 20 }, { strokeDashoffset: 0, duration: 0.5, ease: "none" });
      }
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm w-full">
      {status === "success" ? (
        <div className="flex items-center gap-2 text-clay-500 text-sm font-mono tracking-wide uppercase px-4 py-3 bg-clay-500/10 rounded-full w-full border border-clay-500/20">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
            <path ref={checkRef} d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("landing.footer.checklistSent")}
        </div>
      ) : (
        <>
          <input 
            type="email" 
            placeholder={t("landing.footer.getChecklist")} 
            required
            className="flex-1 bg-white border border-cream-200 rounded-full px-5 py-3.5 text-sm focus:outline-none focus:border-clay-500 transition-colors"
          />
          <button 
            type="submit" 
            disabled={status === "submitting"}
            className="w-12 h-12 shrink-0 rounded-full bg-clay-500 text-white flex items-center justify-center hover:bg-clay-600 transition-colors disabled:opacity-50 font-mono text-lg"
          >
            →
          </button>
        </>
      )}
    </form>
  );
}
