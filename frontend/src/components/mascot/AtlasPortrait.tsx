"use client";

/**
 * Atlas's corner portrait — the canonical render.
 *
 * `atlas.png` is already a clean, chrome-free 600x600 square crop (head, ears
 * and one wing, no baked-in UI mockup from the source render) — see the git
 * history for the crop that produced it if it ever needs re-cutting. Because
 * it's square, a plain fill + object-cover is enough; no windowing maths
 * needed the way the old 693x379 landscape render required.
 */

import Image from "next/image";

export function AtlasPortrait({ size = 104, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative block overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/mascot/atlas.png"
        alt="Atlas, the GlobalBridge AI assistant"
        fill
        sizes={`${size}px`}
        // The dock is fixed-position and always in the viewport, so lazy-loading
        // buys nothing and risks a visible pop-in on first paint.
        loading="eager"
        style={{ objectFit: "cover", objectPosition: "58% 35%" }}
      />
    </span>
  );
}
