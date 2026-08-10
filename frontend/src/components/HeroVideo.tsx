"use client";

/**
 * The hero background video, loaded conditionally.
 *
 * The original was a 2560×1440 / 12.9 Mbps / 23.9 MB clip with an AAC track on a
 * muted element — roughly 24 MB of download for a decorative background that
 * sits behind gradient overlays and is barely legible.
 *
 * Beyond raw weight, *who* pays for it matters here. This audience is
 * disproportionately on metered mobile data, often roaming in a country they
 * just arrived in, where a 24 MB autoplaying background is a real cost. So the
 * video is now opt-out by default in the conditions where it would hurt:
 *
 *   - Save-Data enabled          → poster only
 *   - 2G/3G or slow connection   → poster only
 *   - prefers-reduced-motion     → poster only (also an accessibility rule)
 *   - small viewport             → 480p variant instead of 720p
 *
 * The poster renders immediately in every case, so the hero never appears
 * broken or empty while a decision is pending.
 */

import { useEffect, useState } from "react";

const POSTER = "/video/hero-poster.jpg";
const SRC_720 = "/video/hero-loop-720.mp4";
const SRC_480 = "/video/hero-loop-480.mp4";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
};

export default function HeroVideo() {
  // Starts null so SSR and first client paint agree: poster only, no video tag.
  // The decision needs browser APIs that don't exist on the server.
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const effective = conn?.effectiveType;

    // Explicit user signals always win — these are requests, not hints.
    if (conn?.saveData === true) return;                                    // poster only
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // poster only

    // 2G can't carry even the small file in reasonable time.
    if (effective === "slow-2g" || effective === "2g") return;              // poster only

    // 3G gets the 480p cut (~660KB) rather than nothing. A large share of this
    // audience is on 3G in their destination country, and excluding them
    // entirely — which an earlier version of this rule did — meant they never
    // saw the hero at all. 660KB is a few seconds on 3G, and it streams.
    if (effective === "3g") {
      setSrc(SRC_480);
      return;
    }

    setSrc(window.innerWidth < 768 ? SRC_480 : SRC_720);
  }, []);

  return (
    <>
      {/* Always painted, so there is never an empty hero. Also acts as the
          first frame the video fades in over. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${POSTER})` }}
      />
      {src && (
        <video
          autoPlay
          loop
          muted
          playsInline
          // `metadata` rather than `auto`: start the pipeline without
          // committing to the whole file before it's known to be needed.
          preload="metadata"
          poster={POSTER}
          src={src}
          aria-hidden
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
      )}
    </>
  );
}
