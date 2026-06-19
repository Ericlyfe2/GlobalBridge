import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/i18n/provider";
import { ToastProvider } from "@/components/Toast";
import { AuthSync } from "@/components/AuthSync";
import { HreflangMeta } from "@/components/HreflangMeta";
import { SUPPORTED_LANGUAGES, type Lang } from "@/i18n/config";

export const metadata: Metadata = {
  title: "GlobalBridge — Your Trusted Guide Abroad",
  description: "AI-powered platform for international students and immigrants. Verified visa guidance, housing, mentorship, jobs.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
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
            {children}
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
