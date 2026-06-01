import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { query, queryOne } from "../db";
import { signToken, requireAuth, verifyPurposeToken, clearTokenVersionCache } from "../middleware/auth";
import { HttpError } from "../middleware/error";

export const authRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Too many registration attempts from this IP." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
  full_name: z.string().min(2),
  role: z.enum(["student", "mentor", "employer"]).default("student"),
  country_of_origin: z.string().min(2, "Country is required"),
});

authRouter.post("/register", registerLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [body.email]
    );
    if (existing) throw new HttpError(409, "Email already registered");

    const password_hash = await bcrypt.hash(body.password, 10);

    const user = await queryOne<{ id: string; email: string; role: string; full_name: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, country_of_origin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, full_name`,
      [body.email, password_hash, body.full_name, body.role, body.country_of_origin]
    );

    if (!user) throw new HttpError(500, "Failed to create user");

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as "student" | "mentor" | "employer",
    });

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      role: string;
      full_name: string;
    }>("SELECT id, email, password_hash, role, full_name FROM users WHERE email = $1", [email]);

    if (!user) throw new HttpError(401, "Invalid credentials");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new HttpError(401, "Invalid credentials");

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as "student" | "mentor" | "employer" | "admin",
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne(
      `SELECT id, email, full_name, role, country_of_origin, country_of_residence,
              avatar_url, bio, trust_score, verification_status, preferred_language
       FROM users WHERE id = $1`,
      [req.user!.sub]
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET token_version = token_version + 1 WHERE id = $1`,
      [req.user!.sub]
    );
    clearTokenVersionCache(req.user!.sub);
    res.json({ ok: true, message: "Signed out. Token invalidated." });
  } catch (err) {
    next(err);
  }
});

// ===== Email verification =====

authRouter.post("/send-verification", requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne<{ id: string; email: string; email_verified: boolean }>(
      `SELECT id, email, email_verified FROM users WHERE id = $1`,
      [req.user!.sub]
    );
    if (!user) throw new HttpError(404, "User not found");
    if (user.email_verified) return res.json({ ok: true, message: "Email already verified" });

    const token = await signToken({ sub: user.id, email: user.email, role: req.user!.role }, "email-verify");
    const verifyUrl = `${process.env.CORS_ORIGIN || "http://localhost:3000"}/verify-email?token=${token}`;

    console.log(`[DEV] Verification email for ${user.email}: ${verifyUrl}`);

    res.json({ ok: true, message: "Verification email sent (check server console in dev)" });
  } catch (err) {
    next(err);
  }
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

authRouter.post("/verify-email", requireAuth, async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const payload = verifyPurposeToken(token, "email-verify");
    if (payload.sub !== req.user!.sub) {
      throw new HttpError(403, "Token does not match authenticated user");
    }
    await query(
      `UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`,
      [req.user!.sub]
    );
    res.json({ ok: true, message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
});

// ===== Password reset =====

const forgotSchema = z.object({
  email: z.string().email(),
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);

    const user = await queryOne<{ id: string; email: string; role: "student" | "mentor" | "employer" | "admin" }>(
      `SELECT id, email, role FROM users WHERE email = $1`,
      [email]
    );

    // Always return ok to prevent email enumeration
    if (!user) return res.json({ ok: true, message: "If the email exists, a reset link has been sent." });

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as "student" | "mentor" | "employer" | "admin",
    }, "password-reset");

    const resetUrl = `${process.env.CORS_ORIGIN || "http://localhost:3000"}/reset-password?token=${token}`;

    console.log(`[DEV] Password reset for ${user.email}: ${resetUrl}`);

    res.json({ ok: true, message: "If the email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
});

const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);

    let payload: { sub: string; email: string };
    try {
      payload = verifyPurposeToken(token, "password-reset");
    } catch {
      throw new HttpError(400, "Invalid or expired reset token");
    }

    const password_hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND email = $3`,
      [password_hash, payload.sub, payload.email]
    );

    res.json({ ok: true, message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
});
