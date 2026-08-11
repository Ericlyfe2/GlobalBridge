"use client";

/**
 * Offline fallback, served by the service worker when a navigation fails.
 *
 * This is a designed part of GlobalBridge, not a browser error screen. The
 * audience is often anxious and frequently on poor connections abroad, so the
 * tone is reassuring and the page states plainly what still works rather than
 * reporting a technical failure.
 *
 * Rendered without the app shell: it has to work when nothing else loaded.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, WifiOff, BookOpen, Home, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { useNetworkStatus } from "@/lib/pwa/useNetworkStatus";
import { AtlasPortrait } from "@/components/mascot/AtlasPortrait";

export default function OfflinePage() {
  const { t } = useTranslation();
  const status = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);

  // The moment we're genuinely back, leave — no need to make them tap Retry.
  //
  // Deliberately NOT location.reload(): this page is served by the service
  // worker as a fallback for a failed navigation, but its own URL is /offline.
  // Reloading would re-render /offline, detect "online" again, and reload
  // forever. Navigating away is the only way out of that loop.
  useEffect(() => {
    if (status !== "online") return;
    const to = setTimeout(() => {
      // `replace` so the dead offline page doesn't sit in history behind them.
      window.location.replace("/");
    }, 600);
    return () => clearTimeout(to);
  }, [status]);

  async function retry() {
    setRetrying(true);
    try {
      await fetch("/api/health", { method: "HEAD", cache: "no-store" });
      window.location.replace("/");
    } catch {
      // Still down. Stop the spinner so the button doesn't look stuck.
      setTimeout(() => setRetrying(false), 700);
    }
  }

  const links = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/toolkit", icon: BookOpen, label: t("nav.toolkit") },
    { href: "/scam-alerts", icon: ShieldCheck, label: t("nav.scamAlerts") },
  ];

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-cream-50 px-6 py-12 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6">
          <AtlasPortrait size={96} className="opacity-90" />
        </div>

        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-cream-100 px-3 py-1 text-xs font-medium text-ink-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <WifiOff size={12} />
          {status === "reconnecting" ? t("pwa.reconnecting") : t("pwa.offlineBadge")}
        </span>

        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">
          {t("pwa.offlineTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600 dark:text-gray-400">
          {t("pwa.offlineBody")}
        </p>

        <button
          onClick={retry}
          disabled={retrying}
          className="btn-accent mt-6 inline-flex items-center gap-2 disabled:opacity-60"
        >
          <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
          {retrying ? t("pwa.retrying") : t("pwa.retry")}
        </button>

        <div className="mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-gray-500">
            {t("pwa.stillAvailable")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cream-200 bg-[var(--color-surface)] px-3 py-2 text-sm text-ink-700 transition hover:border-clay-300 dark:border-gray-800 dark:text-gray-200"
              >
                <l.icon size={14} />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
