import { MetadataRoute } from "next";
import { DEFAULT_LANG, SUPPORTED_LANGUAGES } from "@/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://globalbridge.app";

// Only genuinely public, indexable pages belong in the sitemap. Everything
// under the (app) route group is wrapped in <AuthGuard> and redirects
// anonymous crawlers to /auth, so those routes are intentionally excluded.
// /ping (health) and /unauthorized (error) are also excluded as non-content.
const publicRoutes = [
  "",
  "/about",
  "/pricing",
  "/help",
  "/contact",
  "/privacy",
  "/terms",
  "/auth",
];

const allRoutes = publicRoutes;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of allRoutes) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const localizedPath =
        lang.code === DEFAULT_LANG
          ? route || "/"
          : `/${lang.code}${route || ""}`;

      entries.push({
        url: `${SITE_URL}${localizedPath}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "weekly" as const : "monthly" as const,
        priority: route === "" ? 1.0 : 0.8,
      });
    }
  }

  return entries;
}
