import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { adminAuth, firestore } from "../lib/firebase-admin";

export const authRouter = Router();

const profileSchema = z.object({
  full_name: z.string().min(2),
  role: z.enum(["student", "mentor", "employer"]).default("student"),
  country_of_origin: z.string().min(2, "Country is required"),
});

// Called once right after client-side createUserWithEmailAndPassword.
// Creates the Firestore profile and sets the role custom claim (server-only).
authRouter.post("/register-profile", requireAuth, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const uid = req.user!.sub;
    const ref = firestore.collection("users").doc(uid);

    const snap = await ref.get();
    if (snap.exists) {
      // Idempotent: profile already created on an earlier attempt.
      return res.status(200).json({ user: { id: uid, ...snap.data() } });
    }

    const profile = {
      email: req.user!.email,
      full_name: body.full_name,
      role: body.role,
      country_of_origin: body.country_of_origin,
      country_of_residence: null,
      avatar_url: null,
      bio: null,
      trust_score: 0,
      verification_status: "unverified",
      preferred_language: "en",
      created_at: new Date().toISOString(),
    };

    await ref.set(profile);
    await adminAuth.setCustomUserClaims(uid, { role: body.role });

    res.status(201).json({ user: { id: uid, ...profile } });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const snap = await firestore.collection("users").doc(req.user!.sub).get();
    if (!snap.exists) return res.status(404).json({ error: "Profile not found" });
    res.json({ user: { id: req.user!.sub, ...snap.data() } });
  } catch (err) {
    next(err);
  }
});
