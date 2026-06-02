import { Router } from "express";
import { z } from "zod";
import { requireAuth, clearUserCache } from "../middleware/auth";
import { adminAuth } from "../lib/firebase-admin";
import { queryOne } from "../db";

export const authRouter = Router();

const profileSchema = z.object({
  full_name: z.string().min(2),
  role: z.enum(["student", "mentor", "employer"]).default("student"),
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

    const user = await queryOne(
      `INSERT INTO users (firebase_uid, email, full_name, role, country_of_origin)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         country_of_origin = EXCLUDED.country_of_origin,
         updated_at = NOW()
       RETURNING ${PROFILE_COLUMNS}`,
      [firebaseUid, req.user!.email, body.full_name, body.role, body.country_of_origin],
    );

    await adminAuth.setCustomUserClaims(firebaseUid, { role: body.role });
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
