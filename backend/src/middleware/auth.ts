import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin";

export type AuthUser = {
  sub: string;
  email: string;
  role: "student" | "mentor" | "employer" | "admin";
};

const VALID_ROLES = new Set(["student", "mentor", "employer", "admin"]);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const rawRole = (decoded as Record<string, unknown>).role;
    const role = (typeof rawRole === "string" && VALID_ROLES.has(rawRole)
      ? rawRole
      : "student") as AuthUser["role"];
    req.user = { sub: decoded.uid, email: decoded.email ?? "", role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
