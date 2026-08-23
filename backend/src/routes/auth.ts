import { Router } from "express";
import { z } from "zod";
import { requireAuth, clearUserCache } from "../middleware/auth";
import { recordAudit } from "../lib/audit";
import { adminAuth } from "../lib/firebase-admin";
import { query, queryOne } from "../db";

export const authRouter = Router();

const ALLOWED_SELF_ROLES = ["student", "mentor", "employer"] as const;
type AllowedSelfRole = (typeof ALLOWED_SELF_ROLES)[number];

const profileSchema = z.object({
  full_name: z.string().min(2),
  role: z.enum(ALLOWED_SELF_ROLES).default("student"),
  country_of_origin: z.string().min(2, "Country is required"),
});

const PROFILE_COLUMNS = `id, email, full_name, role, country_of_origin, country_of_residence,
  avatar_url, bio, trust_score, verification_status, preferred_language, created_at`;

// Called once right after client-side createUserWithEmailAndPassword.
// Upserts the Postgres users row (keyed by firebase_uid) and sets the role custom claim.
// requireAuth has already ensured a row exists; this fills in the real profile fields.
authRouter.post("/register-profile", requireAuth, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const firebaseUid = req.user!.firebaseUid;

    const safeRole = ALLOWED_SELF_ROLES.includes(body.role as typeof ALLOWED_SELF_ROLES[number])
      ? body.role
      : "student";

    // ── one-shot ────────────────────────────────────────────────────────────
    // This endpoint is documented as "called once right after signup", but it
    // was a plain upsert with `role = EXCLUDED.role`. Any account could POST it
    // again and reassign its own role: student -> employer, then post job
    // listings to the audience; student -> mentor, then get a mentor profile
    // row. No audit entry was written for any of it.
    //
    // Row existence cannot gate this, because requireAuth self-heals a minimal
    // users row on first sight — so by the time we get here a row always
    // exists. profile_completed_at is the explicit marker instead.
    const existing = await queryOne<{ id: string; role: string; profile_completed_at: string | null }>(
      `SELECT id, role, profile_completed_at FROM users WHERE firebase_uid = $1`,
      [firebaseUid],
    );
    const alreadyCompleted = Boolean(existing?.profile_completed_at);

    if (alreadyCompleted && body.role !== existing!.role) {
      // Not a silent drop: the caller asked for something we refuse, and a
      // repeated attempt is exactly the signal an operator wants to see.
      await recordAudit({
        adminId: existing!.id,
        action: "auth.role_change_rejected",
        targetType: "user",
        targetId: existing!.id,
        metadata: { attempted_role: body.role, current_role: existing!.role, via: "register-profile" },
      });
    }

    // On a replay the role column keeps whatever it already had.
    const user = await queryOne(
      `INSERT INTO users (firebase_uid, email, full_name, role, country_of_origin, profile_completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (firebase_uid) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = CASE WHEN users.profile_completed_at IS NULL
                     THEN EXCLUDED.role ELSE users.role END,
         country_of_origin = EXCLUDED.country_of_origin,
         profile_completed_at = COALESCE(users.profile_completed_at, NOW()),
         updated_at = NOW()
       RETURNING ${PROFILE_COLUMNS}`,
      [firebaseUid, req.user!.email, body.full_name, safeRole, body.country_of_origin],
    );

    // Everything below keys off the role that actually landed, not the request.
    const effectiveRole = (user as { role: AllowedSelfRole } | null)?.role ?? safeRole;

    // A mentor with no mentor_profiles row is invisible everywhere that
    // matters — the admin verification queue and the public mentor
    // directory both INNER JOIN this table. Nothing else creates it, so it
    // has to happen here or every new mentor silently vanishes from the app.
    if (effectiveRole === "mentor" && user) {
      await query(
        `INSERT INTO mentor_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [(user as { id: string }).id],
      );
    }
    // Same bug, same fix, for employers — the admin employer-verification
    // queue also INNER JOINs employer_profiles. company_name is NOT NULL
    // there, so seed a placeholder the employer can rename later.
    if (effectiveRole === "employer" && user) {
      await query(
        `INSERT INTO employer_profiles (user_id, company_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
        [(user as { id: string }).id, `${body.full_name}'s company`],
      );
    }

    // The claim mirrors the stored role, so a refused change cannot leak into
    // the token and fool client-side role guards.
    await adminAuth.setCustomUserClaims(firebaseUid, { role: effectiveRole });
    clearUserCache(firebaseUid); // role may have changed

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne(
      `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`,
      [req.user!.sub],
    );
    if (!user) return res.status(404).json({ error: "Profile not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
