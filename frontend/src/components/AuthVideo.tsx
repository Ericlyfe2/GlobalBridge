"use client";

/**
 * Background video for the auth page's desktop brand panel.
 *
 * Same network-awareness rules as HeroVideo — this audience is
 * disproportionately on metered mobile data, and it's decorative, so it's
 * opt-out wherever it would cost someone real money or time:
 *
 *   - Save-Data enabled          → poster only
 *   - 2G/3G or slow connection   → poster only
 *   - prefers-reduced-motion     → poster only
 *   - narrow viewport            → 480p variant (the panel itself is
 *     `md:flex` only, so this mainly matters for tablet widths)
 *
 * The poster paints immediately in every case so the panel is never empty
 * while the network check resolves.
 */

import { useEffect, useState } from "react";

const POSTER = "/video/auth-poster.jpg";
const SRC_720 = "/video/auth-loop-720.mp4";
const SRC_480 = "/video/auth-loop-480.mp4";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
};

export default function AuthVideo() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const effective = conn?.effectiveType;

    if (conn?.saveData === true) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (effective === "slow-2g" || effective === "2g") return;

    if (effective === "3g") {
      setSrc(SRC_480);
      return;
    }

    setSrc(window.innerWidth < 1024 ? SRC_480 : SRC_720);
  }, []);

  return (
    <>
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
