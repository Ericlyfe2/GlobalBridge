import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { pool } from "../db";

const tokenVersionCache = new Map<string, { ver: number; expires: number }>();
const CACHE_TTL = 60_000;

async function getTokenVersion(userId: string): Promise<number> {
  const cached = tokenVersionCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.ver;
  const result = await pool.query("SELECT token_version FROM users WHERE id = $1", [userId]);
  if (!result.rows[0]) {
    tokenVersionCache.set(userId, { ver: -1, expires: Date.now() + CACHE_TTL });
    return -1;
  }
  const ver = result.rows[0].token_version;
  tokenVersionCache.set(userId, { ver, expires: Date.now() + CACHE_TTL });
  return ver;
}

export function clearTokenVersionCache(userId: string) {
  tokenVersionCache.delete(userId);
}

export type JWTPayload = {
  sub: string;
  email: string;
  role: "student" | "mentor" | "employer" | "admin";
  purpose?: string;
  ver?: number;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

function getSecret(purpose?: string): string {
  const base = process.env.JWT_SECRET!;
  if (!purpose || purpose === "auth") return base;
  return base + ":" + purpose;
}

export async function signToken(payload: JWTPayload, purpose?: string): Promise<string> {
  let ver = 0;
  if (!purpose || purpose === "auth") {
    ver = await getTokenVersion(payload.sub);
  }
  return jwt.sign({ ...payload, purpose: purpose || "auth", ver }, getSecret(purpose), {
    expiresIn: purpose === "email-verify" || purpose === "password-reset" ? "1h" : process.env.JWT_EXPIRES_IN || "7d",
  } as jwt.SignOptions);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const payload = jwt.verify(token, getSecret()) as JWTPayload;
    if (payload.purpose && payload.purpose !== "auth") {
      return res.status(401).json({ error: "Invalid token purpose" });
    }

    const currentVer = await getTokenVersion(payload.sub);
    if (currentVer === -1) {
      return res.status(401).json({ error: "User not found" });
    }
    if (currentVer !== payload.ver) {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    next(err);
  }
}

export function verifyPurposeToken(token: string, purpose: string): JWTPayload {
  return jwt.verify(token, getSecret(purpose)) as JWTPayload;
}

export function requireRole(...roles: JWTPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
