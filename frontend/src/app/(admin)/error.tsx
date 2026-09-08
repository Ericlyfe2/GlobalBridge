"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, LayoutDashboard } from "lucide-react";

/**
 * Error boundary scoped to the admin console.
 *
 * Same reasoning as (app)/error.tsx: without a segment-level boundary a render
 * error in one admin page fell through to the root min-h-screen takeover and
 * removed the admin nav with it, which is the worst moment to lose the way out
 * of a broken screen. Deliberately not translated — the admin console is
 * English-only throughout, unlike the signed-in app.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced, not swallowed.
    console.error("[GlobalBridge] admin route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-600">
        <AlertOctagon size={26} />
      </div>

      <p className="mb-2 text-xs uppercase tracking-wider text-red-600">Error</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">
        This admin page failed to load.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-gray-400">
        Nothing was changed. Retry, or head back to the admin overview.
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-[10px] text-ink-500">Reference: {error.digest}</p>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn-accent inline-flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Retry
        </button>
        <Link
          href="/admin"
          className="btn-ghost inline-flex items-center gap-1.5 border border-cream-300 text-sm dark:border-gray-700"
        >
          <LayoutDashboard size={14} /> Admin overview
        </Link>
      </div>
    </div>
  );
}
