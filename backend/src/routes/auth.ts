import { Router } from "express";
import { z } from "zod";
import { requireAuth, clearUserCache } from "../middleware/auth";
import { adminAuth } from "../lib/firebase-admin";
import { query, queryOne } from "../db";

export const authRouter = Router();

const ALLOWED_SELF_ROLES = ["student", "mentor", "employer"] as const;

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

    const user = await queryOne(
      `INSERT INTO users (firebase_uid, email, full_name, role, country_of_origin)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         country_of_origin = EXCLUDED.country_of_origin,
         updated_at = NOW()
       RETURNING ${PROFILE_COLUMNS}`,
      [firebaseUid, req.user!.email, body.full_name, safeRole, body.country_of_origin],
    );

    // A mentor with no mentor_profiles row is invisible everywhere that
    // matters — the admin verification queue and the public mentor
    // directory both INNER JOIN this table. Nothing else creates it, so it
    // has to happen here or every new mentor silently vanishes from the app.
    if (safeRole === "mentor" && user) {
      await query(
        `INSERT INTO mentor_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [(user as { id: string }).id],
      );
    }
    // Same bug, same fix, for employers — the admin employer-verification
    // queue also INNER JOINs employer_profiles. company_name is NOT NULL
    // there, so seed a placeholder the employer can rename later.
    if (safeRole === "employer" && user) {
      await query(
        `INSERT INTO employer_profiles (user_id, company_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
        [(user as { id: string }).id, `${body.full_name}'s company`],
      );
    }

    await adminAuth.setCustomUserClaims(firebaseUid, { role: safeRole });
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
