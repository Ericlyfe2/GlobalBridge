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
    ].map((source) => ({ source, destination: `${API}${source}` }))
  : [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
  // ESLint is not yet configured in this project, so linting stays disabled during
  // builds until an eslint config is added (tracked separately).
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
