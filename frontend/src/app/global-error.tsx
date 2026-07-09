"use client";

// Last-resort error boundary for failures in the ROOT layout itself, which the
// segment-level error.tsx cannot catch. It replaces the whole document, so it
// must render its own <html>/<body> and cannot rely on app providers, i18n, or
// the global stylesheet — hence inline styles.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalBridge] root-level error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0f1a",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              margin: "0 auto 1.5rem",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              fontSize: "1.5rem",
            }}
            aria-hidden
          >
            !
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", color: "rgba(248,250,252,0.7)", lineHeight: 1.6 }}>
            An unexpected error occurred while loading GlobalBridge. Please try again.
          </p>
          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: "0.7rem", fontFamily: "monospace", color: "rgba(248,250,252,0.5)" }}>
              Reference: {error.digest}
            </p>
          )}
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={reset}
              style={{
                cursor: "pointer",
                borderRadius: "0.5rem",
                border: "none",
                background: "#10b981",
                color: "#fff",
                padding: "0.6rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: "0.5rem",
                border: "1px solid rgba(248,250,252,0.2)",
                color: "#f8fafc",
                padding: "0.6rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
