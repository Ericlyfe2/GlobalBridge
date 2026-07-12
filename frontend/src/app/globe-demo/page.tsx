"use client";

import { Component as Globe } from "@/components/ui/interactive-globe";

export default function GlobeDemoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-8">
      <div className="w-full max-w-5xl rounded-2xl border border-cream-200 bg-[var(--color-surface)] overflow-hidden relative">
        {/* Ambient glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Left content */}
          <div className="flex-1 flex flex-col justify-center p-10 md:p-14 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cream-200 bg-cream-100/60 px-3 py-1 text-xs text-ink-500 mb-6 w-fit">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-ink-900 leading-[1.1] mb-4">
              Global Edge
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Network
              </span>
            </h1>

            <p className="text-sm md:text-base text-ink-500 max-w-md leading-relaxed mb-8">
              Deployed across 150+ points of presence worldwide.
              Your data served from the nearest node in under 50ms.
              Drag the globe to explore.
            </p>

            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-ink-900">150+</p>
                <p className="text-xs text-ink-500">Edge Nodes</p>
              </div>
              <div className="w-px h-8 bg-cream-200" />
              <div>
                <p className="text-2xl font-bold text-ink-900">&lt;50ms</p>
                <p className="text-xs text-ink-500">Avg Latency</p>
              </div>
              <div className="w-px h-8 bg-cream-200" />
              <div>
                <p className="text-2xl font-bold text-ink-900">99.99%</p>
                <p className="text-xs text-ink-500">Uptime</p>
              </div>
            </div>
          </div>

          {/* Right — Globe */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-0 min-h-[400px]">
            <Globe size={460} />
          </div>
        </div>
      </div>
    </div>
  );
}
