import { MetadataRoute } from "next";
import { DEFAULT_LANG, SUPPORTED_LANGUAGES } from "@/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://globalbridge.app";

const staticRoutes = [
  "",
  "/about",
  "/contact",
  "/help",
  "/pricing",
  "/privacy",
  "/terms",
  "/auth",
  "/unauthorized",
  "/ping",
];

const appRoutes = [
  "/dashboard",
  "/dashboard/student",
  "/dashboard/mentor",
  "/dashboard/employer",
  "/dashboard/admin",
  "/dashboard/profile",
  "/dashboard/verification",
  "/jobs",
  "/jobs/readiness",
  "/jobs/resume-builder",
  "/jobs/salary",
  "/jobs/sponsorship-tracker",
  "/housing",
  "/housing/new",
  "/opportunities",
  "/stories",
  "/forums",
  "/community",
  "/community/safe-space",
  "/messages",
  "/notifications",
  "/settings",
  "/assistant",
  "/library",
  "/scam-alerts",
  "/onboarding",
  "/toolkit",
  "/toolkit/banking",
  "/toolkit/cost",
  "/toolkit/discounts",
  "/toolkit/fund-transfer",
  "/toolkit/healthcare",
  "/toolkit/sim",
  "/toolkit/sos",
  "/toolkit/tax",
  "/toolkit/transit",
  "/tools",
  "/tools/app-coach",
  "/tools/doc-checker",
  "/tools/peer-review",
  "/tools/scholarship-matcher",
  "/tools/timeline",
  "/tools/uni-success",
];

const allRoutes = [...staticRoutes, ...appRoutes];

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
