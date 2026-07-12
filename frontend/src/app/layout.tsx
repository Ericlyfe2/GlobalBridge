import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/i18n/provider";
import { ToastProvider } from "@/components/Toast";
import { AuthSync } from "@/components/AuthSync";
import { ReducedMotionGuard } from "@/components/ReducedMotionGuard";
import { HreflangMeta } from "@/components/HreflangMeta";
import { SUPPORTED_LANGUAGES, type Lang } from "@/i18n/config";
import SmoothScroll from "@/components/SmoothScroll";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://globalbridge.app";
const SITE_NAME = "GlobalBridge";
const TITLE = "GlobalBridge — Your Trusted Guide Abroad";
const DESCRIPTION =
  "AI-powered platform for international students and immigrants. Verified visa guidance, housing, mentorship, jobs.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · GlobalBridge",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "study abroad",
    "student visa",
    "immigration",
    "international students",
    "verified housing",
    "scholarships",
    "mentorship",
    "visa guidance",
  ],
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
  },
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1a" },
  ],
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

const rtlCodes = SUPPORTED_LANGUAGES.filter((l) => l.rtl).map((l) => l.code);
const langInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('gb-lang');
    if (stored) {
      document.documentElement.lang = stored;
      var rtl = ${JSON.stringify(rtlCodes)}.includes(stored);
      document.documentElement.dir = rtl ? "rtl" : "ltr";
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("gb-lang")?.value as Lang) || "en";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + langInitScript }} />
      </head>
      <body>
        <HreflangMeta />
        <LocaleProvider initialLang={lang}>
          <ToastProvider>
            <AuthSync />
            <ReducedMotionGuard />
            <SmoothScroll>
              {children}
            </SmoothScroll>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
