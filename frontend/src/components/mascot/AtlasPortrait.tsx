"use client";

/**
 * Atlas's corner portrait — the canonical render, framed to head-and-shoulders.
 *
 * Why the crop maths rather than a plain <Image>:
 * `atlas.png` is a 693x379 landscape render with two grey export-chrome buttons
 * baked into the top-right corner (roughly x 590-690, y 5-50). Dropping the raw
 * file into a badge would show them. So we window a square region centred on his
 * head, which frames him properly *and* puts the chrome outside the badge.
 *
 * If you later export a clean, tightly-cropped transparent portrait, replace the
 * file and set FOCUS to the full image bounds — nothing else needs to change.
 */

import Image from "next/image";

const SRC_W = 693;
const SRC_H = 379;

/** Square source window: head + shoulders, chrome-free. */
const FOCUS = { x: 270, y: 22, size: 208 } as const;

export function AtlasPortrait({ size = 104, className = "" }: { size?: number; className?: string }) {
  // Scale the whole image so the focus window exactly fills `size`, then shift
  // it so the window's top-left lands at the container's origin.
  const scale = size / FOCUS.size;

  return (
    <span
      className={`relative block overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/mascot/atlas.png"
        alt="Atlas, the GlobalBridge AI assistant"
        width={SRC_W}
        height={SRC_H}
        // The dock is fixed-position and always in the viewport, so lazy-loading
        // buys nothing and risks a visible pop-in on first paint.
        loading="eager"
        style={{
          position: "absolute",
          width: SRC_W * scale,
          height: SRC_H * scale,
          maxWidth: "none",
          left: -FOCUS.x * scale,
          top: -FOCUS.y * scale,
        }}
      />
    </span>
  );
}
