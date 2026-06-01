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

  const validOrigin = origin ? allowedOrigins.has(origin) : false;
  const validReferer = referer ? allowedOrigins.has(extractOrigin(referer) || "") : false;

  if (!validOrigin && !validReferer) {
    return res.status(403).json({ error: "CSRF validation failed" });
  }

  next();
}
