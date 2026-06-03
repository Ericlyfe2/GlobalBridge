import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin";
import { query, queryOne } from "../db";

export type AuthUser = {
  /** Postgres users.id (UUID) — what every domain table FKs to. */
  sub: string;
  /** Firebase Auth UID — the identity from the verified token. */
  firebaseUid: string;
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

// Cache firebase_uid -> { id, role } so we don't hit Postgres on every request.
const userCache = new Map<string, { id: string; role: AuthUser["role"]; expires: number }>();
const CACHE_TTL = 60_000;

export function clearUserCache(firebaseUid: string) {
  userCache.delete(firebaseUid);
}

/**
 * Resolve a verified Firebase user to their Postgres users row, creating a
 * minimal row on first sight (self-healing for users who never called
 * /register-profile). Returns the Postgres UUID + role.
 */
async function resolvePostgresUser(
  firebaseUid: string,
  email: string,
  name: string | undefined,
  claimRole: AuthUser["role"],
): Promise<{ id: string; role: AuthUser["role"] }> {
  const cached = userCache.get(firebaseUid);
  if (cached && cached.expires > Date.now()) return { id: cached.id, role: cached.role };

  let row = await queryOne<{ id: string; role: AuthUser["role"] }>(
    `SELECT id, role FROM users WHERE firebase_uid = $1`,
    [firebaseUid],
  );

  if (!row) {
    const fullName = (name && name.trim()) || email.split("@")[0] || "User";
    await query(
      `INSERT INTO users (firebase_uid, email, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (firebase_uid) DO NOTHING`,
      [firebaseUid, email, fullName, claimRole],
    );
    row = await queryOne<{ id: string; role: AuthUser["role"] }>(
      `SELECT id, role FROM users WHERE firebase_uid = $1`,
      [firebaseUid],
    );
  }

  if (!row) throw new Error("Failed to resolve Postgres user for Firebase uid");

  userCache.set(firebaseUid, { id: row.id, role: row.role, expires: Date.now() + CACHE_TTL });
  return row;
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
    const claimRole = (typeof rawRole === "string" && VALID_ROLES.has(rawRole)
      ? rawRole
      : "student") as AuthUser["role"];
    const email = decoded.email ?? "";
    const name = (decoded as { name?: string }).name;

    const pgUser = await resolvePostgresUser(decoded.uid, email, name, claimRole);

    req.user = { sub: pgUser.id, firebaseUid: decoded.uid, email, role: pgUser.role };
    next();
  } catch (err) {
    console.error("requireAuth failed:", err);
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
