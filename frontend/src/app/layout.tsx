import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthSync } from "@/components/AuthSync";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <LanguageProvider>
          <ToastProvider>
            <AuthSync />
            {children}
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
