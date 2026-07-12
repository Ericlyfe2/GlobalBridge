"use client";

import { useEffect } from "react";

/**
 * Honors prefers-reduced-motion for decorative background videos (WCAG 2.2.2):
 * when the user prefers reduced motion, autoplaying <video> elements are paused
 * (and kept paused if something tries to resume them). Renders nothing.
 *
 * The check runs at play-event time via a capture-phase listener, so it also
 * covers videos that mount after this component and reacts if the OS setting
 * changes without a reload.
 */
export function ReducedMotionGuard() {
  useEffect(() => {
    const prefersReduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pauseAllVideos = () => {
      document.querySelectorAll("video").forEach((v) => {
        v.pause();
      });
    };

    // Catch any video's play attempt (capture phase reaches all elements).
    const onPlay = (e: Event) => {
      if (prefersReduced() && e.target instanceof HTMLVideoElement) {
        e.target.pause();
      }
    };
    document.addEventListener("play", onPlay, true);

    if (prefersReduced()) pauseAllVideos();

    // React to the user toggling the OS setting.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      if (mq.matches) pauseAllVideos();
    };
    mq.addEventListener("change", onChange);

    return () => {
      document.removeEventListener("play", onPlay, true);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return null;
}
