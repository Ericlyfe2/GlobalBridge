import { Router } from "express";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

function sanitize(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

function sanitizeObject(obj: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    const v = obj[k];
    if (v !== undefined) {
      out[k] = typeof v === "string" ? sanitize(v) : v;
    }
  }
  return out;
}

export const usersRouter = Router();

usersRouter.get("/mentors", async (_req, res, next) => {
  try {
    const mentors = await query(
      `SELECT u.id, u.full_name, u.avatar_url, u.country_of_residence, u.country_of_origin,
              u.bio, u.trust_score, mp.expertise_areas, mp.years_abroad, mp.languages_spoken
       FROM users u
       JOIN mentor_profiles mp ON mp.user_id = u.id
       WHERE u.role = 'mentor' AND u.verification_status = 'verified'
         AND mp.available_for_mentoring = TRUE
       ORDER BY u.trust_score DESC
       LIMIT 50`
    );
    res.json({ mentors });
  } catch (err) {
    next(err);
  }
});

// Admin: list all users with filters (must be before /:id)
usersRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }
    if (status) {
      if (status === "suspended") conditions.push(`u.verification_status = 'rejected'`);
      else conditions.push(`u.verification_status = $${idx++}`); params.push(status);
    }
    if (search) { conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params);
    const total = countResult?.total ?? 0;

    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.verification_status,
              u.country_of_residence, u.created_at, u.trust_score, u.email_verified,
              COALESCE(mp.verified_at IS NOT NULL, FALSE) AS is_verified_mentor
       FROM users u
       LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ users, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// Admin: platform summary stats (must be before /:id)
usersRouter.get("/summary/all", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const [totalUsers, verifications, reports, listings] = await Promise.all([
      queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM users`),
      queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM users WHERE verification_status = 'pending'`),
      queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM reports WHERE status = 'pending'`),
      queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM housing_listings WHERE status = 'active'`),
    ]);
    res.json({
      stats: {
        total_users: totalUsers?.count ?? 0,
        pending_verifications: verifications?.count ?? 0,
        open_reports: reports?.count ?? 0,
        active_listings: listings?.count ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await queryOne(
      `SELECT id, full_name, avatar_url, role, country_of_origin, country_of_residence,
              bio, trust_score, verification_status
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const allowed = ["full_name", "bio", "country_of_residence", "avatar_url", "preferred_language"];
    const safe = sanitizeObject(req.body, allowed);
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const k of allowed) {
      if (safe[k] !== undefined) {
        updates.push(`${k} = $${i++}`);
        values.push(safe[k]);
      }
    }
    if (!updates.length) return res.json({ ok: true });
    values.push(req.user!.sub);
    const user = await queryOne(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${i}
       RETURNING id, email, full_name, role, country_of_origin, country_of_residence,
                 avatar_url, bio, trust_score, verification_status, preferred_language`,
      values
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/:id/verify", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Admin: update user status (suspend / reinstate)
usersRouter.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Use: pending, verified, rejected" });
    }
    await query(`UPDATE users SET verification_status = $1 WHERE id = $2`, [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
