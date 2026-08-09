"use client";

/**
 * Where Atlas appears, and what it says.
 *
 * Two layouts:
 *   dock   — a corner companion (dashboard, assistant, scam shield)
 *   travel — a full-width band Atlas flies across as you scroll (home page)
 *
 * The speech bubble is driven entirely by the mascot engine, so this component
 * has no opinions about *when* to speak — only how it looks.
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { useMascot } from "@/mascot/MascotProvider";
import { MODE_COLOR, PRIORITY } from "@/mascot/types";

/** Flat Atlas — shown while the 3D chunk loads, and on machines without WebGL. */
function AtlasFallback({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/mascot/atlas.png"
      alt="Atlas, the GlobalBridge AI assistant"
      width={128}
      height={128}
      className={`h-full w-full object-contain ${className}`}
      priority={false}
    />
  );
}

const AtlasCanvas = dynamic(() => import("./AtlasCanvas"), {
  ssr: false,
  loading: () => <AtlasFallback />,
});

/**
 * WebGL can be missing (old hardware, blocklisted drivers, some VMs). Detect it
 * once so Atlas degrades to the flat portrait instead of leaving an empty hole.
 */
function useWebGLSupported() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setSupported(
        !!(canvas.getContext("webgl2") || canvas.getContext("webgl")),
      );
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

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

/** Scroll progress (0→1) of an element travelling through the viewport. */
function useScrollTravel(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(-1);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the band first enters the viewport, 1 as it leaves.
        const p = 1 - (r.top + r.height) / (vh + r.height);
        setTravel(Math.max(-1, Math.min(1, p * 2.4 - 1.1)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return { ref, travel };
}

export function AtlasStage({ variant = "dock" }: { variant?: "dock" | "travel" }) {
  const { emotion, mode, message, cta, priority, dismiss, ready } = useMascot();
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLSupported();
  const inputActive = useInputActive();
  const { isMobile } = useViewport();
  const rtl = useIsRTL();
  const isTravel = variant === "travel";
  const { ref, travel } = useScrollTravel(isTravel);
  const [open, setOpen] = useState(true);

  // A critical alert always reopens the bubble — the user must not miss a
  // scam warning just because they closed a previous tip.
  useEffect(() => {
    if (priority >= PRIORITY.warning) setOpen(true);
  }, [priority, message]);

  // Nothing renders until mounted, so SSR and first client paint agree.
  if (!ready) return null;

  const accent = MODE_COLOR[mode];

  if (isTravel) {
    return (
      <div ref={ref} className="relative h-[46vh] w-full overflow-hidden" aria-hidden>
        {webgl === false ? (
          <div
            className="flex h-full items-center transition-transform duration-500"
            style={{ transform: `translateX(${travel * 38}%)` }}
          >
            <div className="mx-auto h-40 w-40"><AtlasFallback /></div>
          </div>
        ) : (
          <AtlasCanvas
            emotion={emotion} mode={mode} travel={travel}
            followPointer={false} reducedMotion={reduced}
          />
        )}
      </div>
    );
  }

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
        className="pointer-events-auto rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        // Minimum 44px touch target is satisfied at both sizes.
        style={{ width: dockSize, height: dockSize, ["--tw-ring-color" as string]: accent }}
      >
        {webgl === false ? (
          <AtlasFallback className="animate-float-bob drop-shadow-lg" />
        ) : (
          <AtlasCanvas emotion={emotion} mode={mode} followPointer reducedMotion={reduced} />
        )}
      </button>
    </div>
  );
}
