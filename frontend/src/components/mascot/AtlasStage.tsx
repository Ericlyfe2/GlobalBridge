"use client";

/**
 * Where Atlas appears, and what it says.
 *
 * He lives in the corner as a persistent companion. The speech bubble is driven
 * entirely by the mascot engine, so this component has no opinions about *when*
 * he speaks — only how he looks.
 *
 * The corner art is the canonical render (AtlasPortrait) rather than live 3D:
 * at 60-104px a rendered illustration reads far better than primitives, and it
 * matches the brand sheet exactly. Emotion is still visible — it drives the glow
 * ring colour, the float intensity and of course the message itself.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { useMascot } from "@/mascot/MascotProvider";
import { MODE_COLOR, PRIORITY, type MascotEmotion } from "@/mascot/types";
import { AtlasPortrait } from "./AtlasPortrait";

/** How energetically he bobs, per emotion. Guardian states go still (Part 12). */
const FLOAT_BY_EMOTION: Record<MascotEmotion, string> = {
  idle: "animate-float-bob",
  happy: "animate-float-bob",
  excited: "animate-float-bob",
  proud: "animate-float-bob",
  winking: "animate-float-bob",
  surprised: "animate-float-bob",
  celebrating: "animate-float-bob",
  thinking: "animate-float-bob",
  confused: "animate-float-bob",
  // Stillness is the alarm signal — never bob during a warning.
  scanning: "",
  concerned: "",
  alert: "",
  serious: "",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Atlas must never sit on top of what the user is actually doing
 * (docs/MASCOT.md Part 21).
 *
 * Two independent signals, because neither alone is sufficient:
 *  1. Focus — an input/textarea/contenteditable is focused. Covers desktop
 *     forms, and fires immediately on tap.
 *  2. Visual viewport shrink — the *actual* on-screen keyboard signal on
 *     mobile. Focus is only a proxy for this: a field can be focused with no
 *     keyboard (hardware keyboard, autofill) and the viewport can shrink
 *     without a focus event we caught.
 */
function useInputActive() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const isTyping = (el: Element | null) =>
      !!el && (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        (el as HTMLElement).isContentEditable
      );

    // The keyboard covers a large slice of the viewport; 25% is comfortably
    // past browser chrome changes but well under any real keyboard.
    const keyboardOpen = () => {
      const vv = window.visualViewport;
      return !!vv && vv.height < window.innerHeight * 0.75;
    };

    const check = () => setActive(isTyping(document.activeElement) || keyboardOpen());

    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    window.visualViewport?.addEventListener("resize", check);
    check();

    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
      window.visualViewport?.removeEventListener("resize", check);
    };
  }, []);

  return active;
}

/** Coarse breakpoint, so the dock can shrink on phones. */
function useViewport() {
  const [w, setW] = useState(1280);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024 };
}

/** Mirrors the dock for RTL locales (Arabic) — see docs/MASCOT.md Part 20. */
function useIsRTL() {
  const [rtl, setRtl] = useState(false);
  useEffect(() => {
    const read = () => setRtl(document.documentElement.dir === "rtl");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => obs.disconnect();
  }, []);
  return rtl;
}

export function AtlasStage({ variant = "dock" }: { variant?: "dock" }) {
  const { emotion, mode, message, cta, priority, dismiss, ready } = useMascot();
  const reduced = usePrefersReducedMotion();
  const inputActive = useInputActive();
  const { isMobile } = useViewport();
  const rtl = useIsRTL();
  const [open, setOpen] = useState(true);

  // A critical alert always reopens the bubble — the user must not miss a
  // scam warning just because they closed a previous tip.
  useEffect(() => {
    if (priority >= PRIORITY.warning) setOpen(true);
  }, [priority, message]);

  // Nothing renders until mounted, so SSR and first client paint agree.
  if (!ready) return null;

  const accent = MODE_COLOR[mode];

  // On mobile the keyboard eats the viewport and the dock would sit on the
  // input. Hiding entirely beats shuffling him around. A critical alert still
  // wins — safety must interrupt even mid-typing.
  if (inputActive && isMobile && priority < PRIORITY.warning) return null;

  const dockSize = isMobile ? 60 : 104;

  return (
    <div
      className={`pointer-events-none fixed z-[60] flex items-end gap-2 ${
        rtl ? "left-3 flex-row-reverse" : "right-3"
      }`}
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {message && open && (
        <div
          role="status"
          aria-live={priority >= PRIORITY.warning ? "assertive" : "polite"}
          className="animate-fade-up pointer-events-auto mb-6 rounded-2xl border bg-[var(--color-surface)] p-3.5 shadow-2xl"
          // Width is derived from the actual dock size so the bubble never
          // overflows the viewport on small screens.
          style={{
            borderColor: `${accent}55`,
            width: `min(290px, calc(100vw - ${dockSize + 40}px))`,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: `${accent}1a`, color: accent }}
            >
              <Sparkles size={10} /> Atlas
            </span>
            <button
              onClick={() => { setOpen(false); dismiss(); }}
              aria-label="Dismiss"
              className="rounded p-0.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700 dark:hover:bg-gray-800"
            >
              <X size={13} />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-800 dark:text-gray-100">{message}</p>
          {cta && (
            <Link
              href={cta.href}
              className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: accent }}
            >
              {cta.label}
            </Link>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide Atlas's message" : "Show Atlas"}
        className="group pointer-events-auto relative shrink-0 rounded-full outline-none transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2"
        // Minimum 44px touch target is satisfied at both sizes.
        style={{ width: dockSize, height: dockSize, ["--tw-ring-color" as string]: accent }}
      >
        {/* Mode-coloured halo. This is how emotion stays legible now that the
            face is a fixed render rather than a live screen. */}
        <span
          aria-hidden
          className="absolute -inset-1 rounded-full blur-md transition-colors duration-500"
          style={{ background: accent, opacity: 0.3 }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full ring-2 transition-colors duration-500"
          style={{ ["--tw-ring-color" as string]: accent }}
        />
        <AtlasPortrait
          size={dockSize}
          className={`relative bg-[var(--color-surface)] shadow-lg ${
            reduced ? "" : FLOAT_BY_EMOTION[emotion]
          }`}
        />
      </button>
    </div>
  );
}
