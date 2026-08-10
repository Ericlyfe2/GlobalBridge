import type { MetadataRoute } from "next";

/**
 * Web App Manifest — served by Next at /manifest.webmanifest.
 *
 * Installability notes:
 *  - Chrome requires at least one PNG icon at 192px and one at 512px. An
 *    SVG-only icon set parses fine but silently suppresses the install prompt,
 *    which is why the PNGs below are not optional.
 *  - `maskable` icons are a separate entry, not a replacement: Android crops
 *    them to a circle at 80% diameter, so the glyph is inset with the brand
 *    background bleeding to the edges. Serving only maskable icons would make
 *    the glyph look shrunken everywhere else.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GlobalBridge — Your Trusted Guide Abroad",
    short_name: "GlobalBridge",
    description:
      "AI-powered platform for international students and immigrants. Verified visa guidance, housing, mentorship, jobs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // `any` rather than portrait-locked: the app is used on tablets and desktop
    // where forcing portrait would be actively worse.
    orientation: "any",
    background_color: "#0f172a",
    // Matches --color-clay-500, the actual primary in globals.css. The previous
    // value (#10b981) belonged to no token in the design system.
    theme_color: "#0d9488",
    categories: ["education", "travel", "productivity"],
    lang: "en",
    dir: "auto",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
  };
}
