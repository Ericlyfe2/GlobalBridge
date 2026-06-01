"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home, Bot } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalBridge] route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-cream-50">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center mb-6">
          <AlertOctagon size={28} />
        </div>

        <p className="text-xs uppercase tracking-wider text-red-600 mb-2">Something broke</p>
        <h1 className="text-3xl md:text-4xl font-display font-semibold text-ink-900">
          Sorry — this page misbehaved.
        </h1>
        <p className="text-sm text-ink-600 mt-3 leading-relaxed">
          Don&apos;t worry, your data is safe. Try the retry button. If it keeps failing, ping us via Help.
        </p>

        {error.digest && (
          <p className="mt-4 text-[10px] font-mono text-ink-500">Reference: {error.digest}</p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={reset} className="btn-accent text-sm">
            <RefreshCw size={14} /> Try again
          </button>
          <Link href="/" className="btn-ghost border border-cream-300 text-sm">
            <Home size={14} /> Home
          </Link>
          <Link href="/assistant" className="btn-ghost border border-cream-300 text-sm">
            <Bot size={14} /> Ask AI
          </Link>
        </div>
      </div>
    </div>
  );
}
