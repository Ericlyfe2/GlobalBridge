import type { NextConfig } from "next";
import path from "node:path";

/** Backend API URL. Set NEXT_PUBLIC_API_URL on Vercel to your deployed backend URL. */
const API = process.env.NEXT_PUBLIC_API_URL;

// Only apply rewrites when API is configured and reachable.
// In dev, set NEXT_PUBLIC_API_URL=http://localhost:4000 in .env.local.
// On Vercel, set it to your deployed backend (e.g. https://api.globalbridge.com).
const REWRITE_PATHS = API
  ? [
      "/api/auth/:path*",
      "/api/users/:path*",
      "/api/opportunities/:path*",
      "/api/housing/:path*",
      "/api/forums/:path*",
      "/api/messages/:path*",
      "/api/moderation/:path*",
      "/api/content/:path*",
      "/api/uploads/:path*",
      "/api/admin/:path*",
      "/api/knowledge/:path*",
      "/api/rag/:path*",
      "/api/ai/:path*",
      "/api/jobs/:path*",
      "/api/safe-space/:path*",
      "/api/library/:path*",
      "/api/peer-review/:path*",
    ].map((source) => ({ source, destination: `${API}${source}` }))
  : [];

/**
 * Security headers for the origin users actually load.
 *
 * Helmet in backend/src/index.ts only ever covered Express's own JSON responses.
 * This app — where scripts execute and the Firebase session lives — was shipping
 * with no CSP, no HSTS, no frame protection, no nosniff and no Referrer-Policy.
 *
 * ── On script-src 'unsafe-inline' ───────────────────────────────────────────
 * Not an oversight, and not the end state. The layout ships inline bootstrap
 * scripts (theme and language, which must run before first paint to avoid a
 * flash) and Next injects its own inline hydration payload. Locking script-src
 * down properly means per-request nonces generated in middleware and threaded
 * through every inline script — worth doing, but it is a behavioural change that
 * needs its own verification pass, not something to slip into a header commit.
 *
 * Everything else here is already restrictive and carries real weight without
 * that work: object-src and frame-ancestors are 'none', base-uri and form-action
 * are locked to self, and connect-src is an explicit allow-list, so an injected
 * script cannot exfiltrate to an arbitrary host.
 */
const API_ORIGIN = (() => {
  try {
    return API ? new URL(API).origin : "";
  } catch {
    return "";
  }
})();
const WS_ORIGIN = process.env.NEXT_PUBLIC_WS_URL ?? "";

const CSP = [
  "default-src 'self'",
  // See the note above — inline scripts are required by the current bootstrap.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind and the animation layer both set styles inline.
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts at build time, so no external font origin is needed.
  "font-src 'self' data:",
  `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://unpkg.com`,
  "media-src 'self'",
  [
    "connect-src 'self'",
    API_ORIGIN,
    WS_ORIGIN,
    // Firebase Auth token exchange and identity endpoints.
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://www.googleapis.com",
    // Globe texture.
    "https://unpkg.com",
  ].filter(Boolean).join(" "),
  // Firebase Auth uses an iframe for some sign-in flows.
  "frame-src 'self' https://*.firebaseapp.com",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // Two years, preload-eligible. Vercel terminates TLS, so this is safe to assert.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Belt-and-braces alongside frame-ancestors for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Without this, full URLs — /messages?c=<conversation-uuid>, /housing/<id> —
  // leak to every third-party image host the page loads.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Version disclosure serves no purpose.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Proxy backend routes through Next so frontend can call /api/* without CORS hassles.
  async rewrites() {
    return REWRITE_PATHS;
  },
  // Pin the workspace root to this app so Next doesn't infer it from the stray
  // orphan lockfile at the repo root (silences the multiple-lockfiles warning).
  outputFileTracingRoot: path.join(__dirname),
  // Remove unused EXPORT details from client bundle
  outputFileTracingIncludes: {},
  // TypeScript errors now fail the build — the codebase typechecks clean, so this
  // restores type-safety as a CI gate instead of masking regressions.
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
