import type { MetadataRoute } from "next";

// Web App Manifest — makes GlobalBridge installable as a PWA.
// Served by Next.js at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GlobalBridge — Your Trusted Guide Abroad",
    short_name: "GlobalBridge",
    description:
      "AI-powered platform for international students and immigrants. Verified visa guidance, housing, mentorship, jobs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0f1a",
    theme_color: "#10b981",
    categories: ["education", "travel", "productivity"],
    icons: [
      {
        src: "/favicon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
