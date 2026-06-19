"use client";

import { usePathname } from "next/navigation";
import { DEFAULT_LANG, getLocalizedPath, SUPPORTED_LANGUAGES } from "@/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://globalbridge.app";

export function HreflangMeta() {
  const pathname = usePathname();

  const alternates = SUPPORTED_LANGUAGES.map((lang) => {
    const localizedPath = getLocalizedPath(pathname, lang.code);
    return {
      rel: "alternate",
      hrefLang: lang.code,
      href: `${SITE_URL}${localizedPath}`,
    };
  });

  const xDefault = {
    rel: "alternate",
    hrefLang: "x-default",
    href: `${SITE_URL}${getLocalizedPath(pathname, DEFAULT_LANG)}`,
  };

  const allLinks = [xDefault, ...alternates];

  return (
    <>
      {allLinks.map((link) => (
        <link key={link.hrefLang} rel={link.rel} hrefLang={link.hrefLang} href={link.href} />
      ))}
    </>
  );
}
