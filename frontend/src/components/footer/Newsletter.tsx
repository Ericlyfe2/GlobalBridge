"use client";
import { useState, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useTranslation } from "@/i18n/hooks/useTranslation";

// Generic pre-departure checklist. Not personalized (no destination/origin is
// known on the logged-out marketing footer) — the personalized version lives
// in the AI Assistant's own checklist tool once a user is signed in and chatting.
const GENERIC_CHECKLIST = `GlobalBridge — Pre-departure checklist

== Before you apply ==
[ ] Valid passport (6+ months past your planned arrival date)
[ ] Proof of funds / financial statements
[ ] Academic transcripts and certificates
[ ] Letters of recommendation (if required)

== Visa & documents ==
[ ] Acceptance letter from your institution or employer
[ ] Visa application submitted
[ ] Biometrics appointment booked
[ ] Health/travel insurance arranged

== Before you fly ==
[ ] Housing arranged or shortlisted
[ ] Flights booked
[ ] Local bank account research done
[ ] Emergency contacts and embassy info saved

Personalize this for your destination with GlobalBridge's AI Assistant after you sign up.
`;

function downloadChecklist() {
  const blob = new Blob([GENERIC_CHECKLIST], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "globalbridge-pre-departure-checklist.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Newsletter() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const checkRef = useRef<SVGPathElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.currentTarget as HTMLFormElement).email.value;
    setStatus("submitting");
    // The checklist download doesn't depend on the signup call succeeding —
    // a backend hiccup here shouldn't stop the user getting what they asked for.
    downloadChecklist();
    try {
      await fetch("/api/content/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* best-effort */ }
    setStatus("success");
    if (checkRef.current) {
      gsap.fromTo(checkRef.current, { strokeDasharray: 20, strokeDashoffset: 20 }, { strokeDashoffset: 0, duration: 0.5, ease: "none" });
    }
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
            name="email"
            placeholder={t("landing.footer.getChecklist")}
            required
            className="flex-1 bg-white dark:bg-[var(--color-surface)] border border-cream-200 rounded-full px-5 py-3.5 text-sm focus:outline-none focus:border-clay-500 transition-colors"
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
