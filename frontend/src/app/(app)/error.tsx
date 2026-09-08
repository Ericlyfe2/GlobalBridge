"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, LayoutDashboard } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";

/**
 * Error boundary scoped to the signed-in app.
 *
 * Without this, a render error in any single page bubbled all the way to
 * app/error.tsx, which is a min-h-screen takeover — one broken page removed
 * the entire shell, including the nav the user needs to get somewhere else.
 * A segment-level boundary renders inside (app)/layout.tsx instead, so the
 * navigation stays put and only the content region reports the failure.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    // Surfaced, not swallowed — same contract as the root boundary.
    console.error("[GlobalBridge] app route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-600">
        <AlertOctagon size={26} />
      </div>

      <p className="mb-2 text-xs uppercase tracking-wider text-red-600">{t("common.error")}</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">
        {t("error.title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-gray-400">
        {t("error.description")}
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-[10px] text-ink-500">Reference: {error.digest}</p>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn-accent inline-flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> {t("common.retry")}
        </button>
        <Link
          href="/dashboard"
          className="btn-ghost inline-flex items-center gap-1.5 border border-cream-300 text-sm dark:border-gray-700"
        >
          <LayoutDashboard size={14} /> {t("nav.dashboard")}
        </Link>
      </div>
    </div>
  );
}
