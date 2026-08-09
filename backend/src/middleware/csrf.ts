import type { Request, Response, NextFunction } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function extractOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((s) => s.trim())
);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Browsers always attach Origin (or at least Referer) to cross-site requests and JS
  // cannot forge or suppress it — that's what makes origin-checking work as CSRF defense.
  // A request with neither header is not a browser request (server-to-server calls, e.g.
  // the Next.js BFF layer calling this API directly) and so isn't a CSRF vector; it still
  // has to pass normal auth (Bearer token) to do anything.
  if (!origin && !referer) return next();

  const validOrigin = origin ? allowedOrigins.has(origin) : false;
  const validReferer = referer ? allowedOrigins.has(extractOrigin(referer) || "") : false;

  if (!validOrigin && !validReferer) {
    return res.status(403).json({ error: "CSRF validation failed" });
  }

  next();
}
