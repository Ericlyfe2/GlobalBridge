"use client";

// A one-time guided tour shown right after a student/mentor/employer's first
// signup. Fires off the "gb-tour-pending" flag register() sets (see
// lib/auth.ts) — a returning login never sets that flag, so this only ever
// runs once, on the first dashboard load after account creation.

import { useEffect, useLayoutEffect, useState } from "react";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { getUser } from "@/lib/auth";

const TOUR_PENDING_KEY = "gb-tour-pending";
const TOUR_DONE_KEY = "gb-tour-done";

export type TourStep = { target: string; title: string; body: string };
export type TourRole = "student" | "mentor" | "employer";

export const STUDENT_TOUR_STEPS: TourStep[] = [
  {
    target: "welcome-header",
    title: "Welcome to GlobalBridge 👋",
    body: "This is your dashboard — everything about your journey abroad lives here. Let's take a quick look around.",
  },
  {
    target: "profile-card",
    title: "Your profile",
    body: "Keep this complete — mentor matching, scholarships, and job recommendations all depend on it.",
  },
  {
    target: "quick-actions",
    title: "Quick actions",
    body: "Jump straight into opportunities, housing, mentors, the AI assistant, and your resume builder.",
  },
  {
    target: "visa-roadmap",
    title: "Visa Roadmap",
    body: "Track every step of your visa journey here, from application to arrival.",
  },
  {
    target: "ai-suite",
    title: "AI Intelligence Suite",
    body: "Try Scam Shield, the Visa Roadmap tool, and your Readiness Score — built for your journey.",
  },
  {
    target: "safety-banner",
    title: "Stay safe",
    body: "Scams targeting international students are real. Always verify listings and report anything suspicious here.",
  },
];

export const MENTOR_TOUR_STEPS: TourStep[] = [
  {
    target: "welcome-header",
    title: "Welcome to GlobalBridge 👋",
    body: "This is your mentor dashboard — everything about the students you're guiding lives here. Let's take a quick look around.",
  },
  {
    target: "stats",
    title: "Your impact at a glance",
    body: "Track your active mentees, pending requests, total sessions, and impact score here.",
  },
  {
    target: "quick-actions",
    title: "Quick actions",
    body: "Manage mentees, schedule meetings, answer community questions, and publish guides — all from here.",
  },
  {
    target: "upcoming-sessions",
    title: "Upcoming sessions",
    body: "Every mentorship session you have booked shows up here, with each student's timezone alongside yours.",
  },
  {
    target: "community-impact",
    title: "Community impact",
    body: "Answers, accepted answers, published stories, and hours mentored — your contribution, tracked.",
  },
  {
    target: "pending-requests",
    title: "Pending mentee requests",
    body: "New students asking to connect show up here — review and respond to keep your pipeline moving.",
  },
];

export const EMPLOYER_TOUR_STEPS: TourStep[] = [
  {
    target: "welcome-header",
    title: "Welcome to GlobalBridge 👋",
    body: "This is your hiring dashboard — everything about your listings and candidates lives here. Let's take a quick look around.",
  },
  {
    target: "stats",
    title: "Your hiring pipeline",
    body: "Track active listings, interested candidates, total views, and how many roles sponsor visas.",
  },
  {
    target: "quick-actions",
    title: "Quick actions",
    body: "Post a new job, manage existing listings, browse candidates, and schedule interviews — all from here.",
  },
  {
    target: "listings",
    title: "Your job listings",
    body: "Every role you've posted lives here, with interest counts and visa-sponsorship badges at a glance.",
  },
  {
    target: "sponsorship",
    title: "Visa sponsorship",
    body: "See what share of your open roles are sponsoring international talent.",
  },
];

const ACCENT = {
  clay: {
    ring: "ring-clay-400",
    ringShadow: "shadow-[0_0_0_4px_rgba(216,124,74,0.25)]",
    eyebrow: "text-clay-600",
    dotActive: "bg-clay-500",
    button: "bg-clay-600 hover:bg-clay-700",
  },
  emerald: {
    ring: "ring-emerald-400",
    ringShadow: "shadow-[0_0_0_4px_rgba(16,185,129,0.25)]",
    eyebrow: "text-emerald-600",
    dotActive: "bg-emerald-500",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
} as const;

type Rect = { top: number; left: number; width: number; height: number };

export function OnboardingTour({
  role, steps, accent = "clay",
}: { role: TourRole; steps: TourStep[]; accent?: keyof typeof ACCENT }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const colors = ACCENT[accent];

  useEffect(() => {
    try {
      const u = getUser();
      const eligible =
        u?.role === role &&
        localStorage.getItem(TOUR_PENDING_KEY) === "1" &&
        localStorage.getItem(TOUR_DONE_KEY) !== "1";
      if (eligible) setActive(true);
    } catch {
      /* ignore — tour just won't show */
    }
  }, [role]);

  const step = steps[stepIndex];

  useLayoutEffect(() => {
    if (!active) return;

    let cancelled = false;
    let attempts = 0;
    setRect(null); // never render the previous step's highlight while this one measures

    // A previous step's polling loop or scroll retry must never be able to
    // write `rect` after this effect has been cleaned up for a newer step —
    // every callback below checks `cancelled` *before* touching state, not
    // just before scheduling its own next attempt.
    function measure() {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) {
        // The target may not be mounted yet on the very first paint — retry
        // for a bit rather than skipping the step.
        if (attempts++ < 30) window.setTimeout(measure, 16);
        return;
      }
      const update = () => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      };
      update();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Smooth-scroll duration isn't observable from here, so keep re-measuring
      // for a bit rather than guessing one delay — a `scroll` listener alone
      // can miss the final settled position if the animation runs longer than
      // expected. setTimeout rather than requestAnimationFrame here: rAF is
      // suspended entirely on a hidden/backgrounded tab, so a rAF-only loop
      // would freeze on the previous step's position for anyone who tabbed
      // away mid-scroll.
      const deadline = Date.now() + 1200;
      const tick = () => {
        if (cancelled) return;
        update();
        if (Date.now() < deadline) window.setTimeout(tick, 50);
      };
      window.setTimeout(tick, 50);
    }
    measure();

    function onReflow() {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [active, step]);

  function finish() {
    try {
      localStorage.setItem(TOUR_DONE_KEY, "1");
      localStorage.removeItem(TOUR_PENDING_KEY);
    } catch {
      /* ignore */
    }
    setActive(false);
  }

  function next() {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else finish();
  }

  function back() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  if (!active) return null;

  const pad = 6;
  const clip = rect
    ? `polygon(0% 0%,0% 100%,${rect.left - pad}px 100%,${rect.left - pad}px ${rect.top - pad}px,${
        rect.left + rect.width + pad
      }px ${rect.top - pad}px,${rect.left + rect.width + pad}px ${rect.top + rect.height + pad}px,${
        rect.left - pad
      }px ${rect.top + rect.height + pad}px,${rect.left - pad}px 100%,100% 100%,100% 0%)`
    : undefined;

  return (
    <>
      <div
        className="fixed inset-0 z-[200] transition-[clip-path] duration-300"
        style={{ background: "rgba(5,7,13,0.62)", clipPath: clip }}
        onClick={finish}
        aria-hidden
      />
      {rect && (
        <div
          className={`pointer-events-none fixed z-[201] rounded-xl ring-2 ${colors.ring} ${colors.ringShadow} transition-all duration-300`}
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guided tour"
        className="fixed inset-x-4 bottom-4 z-[202] mx-auto max-w-sm rounded-2xl border border-cream-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        <button
          onClick={finish}
          aria-label="Skip tour"
          className="absolute right-3 top-3 rounded-md p-1 text-ink-400 transition hover:bg-cream-100 hover:text-ink-700 dark:hover:bg-gray-800"
        >
          <X size={15} />
        </button>

        <p className={`text-[11px] font-semibold uppercase tracking-wider ${colors.eyebrow}`}>
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="mt-1 pr-6 text-base font-semibold text-ink-900 dark:text-white">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-gray-400">{step.body}</p>

        <div className="mt-4 flex gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? colors.dotActive : "bg-cream-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={back}
            disabled={stepIndex === 0}
            className="btn-ghost border border-cream-300 text-xs disabled:opacity-30 dark:border-gray-700"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <button onClick={finish} className="text-xs font-medium text-ink-500 hover:text-ink-700 dark:text-gray-400">
            Skip tour
          </button>
          <button
            onClick={next}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-xs font-medium text-white transition-all ${colors.button}`}
          >
            {stepIndex === steps.length - 1 ? "Get started" : "Next"} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </>
  );
}
