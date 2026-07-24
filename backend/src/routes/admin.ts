import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { query, queryOne } from "../db";
import { requireAuth, requireRole, requireAdmin, isSuperAdmin } from "../middleware/auth";
import { collectHealth } from "../lib/health";
import { clampLimit } from "../lib/audit";
import { recordAudit } from "../lib/audit";
import { buildDailySeries, clampDays } from "../lib/analytics";

export const adminRouter = Router();

// ============================================================
// SYSTEM HEALTH
// ============================================================
adminRouter.get("/health", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const report = await collectHealth();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// AUDIT LOG
// ============================================================
adminRouter.get("/audit", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit);
    const before = typeof req.query.before === "string" ? req.query.before : null;
    const entries = await query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
              u.full_name AS admin_name, u.email AS admin_email
         FROM admin_audit_log a
         LEFT JOIN users u ON u.id = a.admin_id
        WHERE ($2::timestamptz IS NULL OR a.created_at < $2::timestamptz)
        ORDER BY a.created_at DESC
        LIMIT $1`,
      [limit, before],
    );
    const nextCursor =
      entries.length === limit
        ? (entries[entries.length - 1] as { created_at: string }).created_at
        : null;
    res.json({ entries, nextCursor });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DASHBOARD STATS
// ============================================================
adminRouter.get("/dashboard", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const result = await queryOne<{
      total_users: number; students: number; mentors: number; employers: number; admins: number;
      pending_verifications: number; approved_verifications: number; rejected_verifications: number;
      active_users: number; inactive_users: number;
      scholarships: number; housing_listings: number; jobs: number;
      forum_posts: number; messages: number; reports: number;
      scam_alerts: number; ai_conversations: number;
      daily_users: number; monthly_users: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS students,
        (SELECT COUNT(*)::int FROM users WHERE role = 'mentor') AS mentors,
        (SELECT COUNT(*)::int FROM users WHERE role = 'employer') AS employers,
        (SELECT COUNT(*)::int FROM users WHERE role IN ('admin', 'super_admin')) AS admins,
        (SELECT COUNT(*)::int FROM users WHERE verification_status = 'pending') AS pending_verifications,
        (SELECT COUNT(*)::int FROM users WHERE verification_status = 'verified') AS approved_verifications,
        (SELECT COUNT(*)::int FROM users WHERE verification_status = 'rejected') AS rejected_verifications,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS active_users,
        (SELECT COUNT(*)::int FROM users WHERE created_at < CURRENT_DATE - INTERVAL '30 days') AS inactive_users,
        (SELECT COUNT(*)::int FROM opportunities WHERE type = 'scholarship') AS scholarships,
        (SELECT COUNT(*)::int FROM housing_listings) AS housing_listings,
        (SELECT COUNT(*)::int FROM opportunities WHERE type IN ('job', 'internship')) AS jobs,
        (SELECT COUNT(*)::int FROM forum_posts) AS forum_posts,
        (SELECT COUNT(*)::int FROM messages) AS messages,
        (SELECT COUNT(*)::int FROM reports WHERE status = 'pending') AS reports,
        (SELECT COUNT(*)::int FROM scam_alerts) AS scam_alerts,
        (SELECT COUNT(*)::int FROM ai_conversations) AS ai_conversations,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= CURRENT_DATE) AS daily_users,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS monthly_users
    `);
    res.json({ stats: result ?? {} });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DAILY SIGNUPS
// ============================================================
adminRouter.get("/signups", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const days = clampDays(req.query.days);
    const rows = await query<{ day: string; count: number }>(
      `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
         FROM users
        WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1`,
      [days],
    );
    res.json({ days, series: buildDailySeries(rows, days) });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// COUNTRY STATISTICS
// ============================================================
adminRouter.get("/countries", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const countries = await query<{ country: string; count: number }>(
      `SELECT country_of_residence AS country, COUNT(*)::int AS count
         FROM users WHERE country_of_residence IS NOT NULL
        GROUP BY country_of_residence ORDER BY count DESC LIMIT 50`
    );
    res.json({ countries });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// RECENT ACTIVITY
// ============================================================
adminRouter.get("/recent-activity", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const [recentLogins, recentReports, recentErrors] = await Promise.all([
      query(
        `SELECT id, email, full_name, created_at FROM users ORDER BY created_at DESC LIMIT 10`
      ),
      query(
        `SELECT r.id, r.reason, r.status, r.created_at, u.full_name AS reporter_name
           FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
          ORDER BY r.created_at DESC LIMIT 10`
      ),
      query(
        `SELECT created_at, 'error' AS type FROM admin_audit_log
          WHERE metadata->>'error' IS NOT NULL ORDER BY created_at DESC LIMIT 10`
      ),
    ]);
    res.json({ recentLogins, recentReports, recentErrors });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// USER MANAGEMENT
// ============================================================
adminRouter.get("/users", requireAuth, requireAdmin(), async (req, res, next) => {
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

    if (role && role !== "all") { conditions.push(`u.role = $${idx++}`); params.push(role); }
    if (status && status !== "all") {
      if (status === "suspended") conditions.push(`u.verification_status = 'rejected'`);
      else if (status === "active") conditions.push(`u.verification_status = 'verified'`);
      else conditions.push(`u.verification_status = $${idx++}`); params.push(status);
    }
    if (search) { conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params);
    const total = countResult?.total ?? 0;

    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.verification_status,
              u.country_of_residence, u.country_of_origin, u.created_at, u.trust_score,
              u.avatar_url, u.bio, u.preferred_language,
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

adminRouter.get("/users/:id", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const user = await queryOne(
      `SELECT u.*,
              COALESCE(mp.expertise_areas, '{}') AS expertise_areas,
              COALESCE(mp.languages_spoken, '{}') AS languages_spoken,
              COALESCE(mp.years_abroad, 0) AS years_abroad,
              COALESCE(mp.universities_attended, '{}') AS universities_attended,
              COALESCE(ep.company_name, '') AS company_name,
              COALESCE(ep.company_website, '') AS company_website,
              COALESCE(ep.industry, '') AS industry,
              COALESCE(ep.sponsors_visas, FALSE) AS sponsors_visas
       FROM users u
       LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/users/:id", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { full_name, email, role, verification_status, country_of_residence, country_of_origin, bio, preferred_language } = req.body;

    const targetUser = await queryOne<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [req.params.id]);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (targetUser.role === "super_admin" && !isSuperAdmin(req.user!.role)) {
      return res.status(403).json({ error: "Cannot modify super admin account" });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (full_name !== undefined) { updates.push(`full_name = $${i++}`); values.push(full_name); }
    if (email !== undefined) { updates.push(`email = $${i++}`); values.push(email); }
    if (role !== undefined && isSuperAdmin(req.user!.role)) { updates.push(`role = $${i++}`); values.push(role); }
    if (verification_status !== undefined) { updates.push(`verification_status = $${i++}`); values.push(verification_status); }
    if (country_of_residence !== undefined) { updates.push(`country_of_residence = $${i++}`); values.push(country_of_residence); }
    if (country_of_origin !== undefined) { updates.push(`country_of_origin = $${i++}`); values.push(country_of_origin); }
    if (bio !== undefined) { updates.push(`bio = $${i++}`); values.push(bio); }
    if (preferred_language !== undefined) { updates.push(`preferred_language = $${i++}`); values.push(preferred_language); }

    if (!updates.length) return res.json({ ok: true });

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${i}`,
      values
    );

    await recordAudit({
      adminId: req.user!.sub,
      action: "user.update",
      targetType: "user",
      targetId: String(req.params.id),
      metadata: { updates: updates.join(", ") },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/users/:id", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const targetUser = await queryOne<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [req.params.id]);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.role === "super_admin") {
      return res.status(403).json({ error: "Cannot delete super admin account" });
    }
    await query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    await recordAudit({
      adminId: req.user!.sub,
      action: "user.delete",
      targetType: "user",
      targetId: String(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/verify", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [req.params.id]);
    await recordAudit({
      adminId: req.user!.sub, action: "user.verify", targetType: "user", targetId: String(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/suspend", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const targetUser = await queryOne<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [req.params.id]);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.role === "super_admin") {
      return res.status(403).json({ error: "Cannot suspend super admin" });
    }
    await query(`UPDATE users SET verification_status = 'rejected' WHERE id = $1`, [req.params.id]);
    await recordAudit({
      adminId: req.user!.sub, action: "user.suspend", targetType: "user", targetId: String(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/activate", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [req.params.id]);
    await recordAudit({
      adminId: req.user!.sub, action: "user.activate", targetType: "user", targetId: String(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/bulk-action", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { ids, action } = z.object({
      ids: z.array(z.string().uuid()).min(1),
      action: z.enum(["delete", "suspend", "activate", "verify"]),
    }).parse(req.body);

    const results = { succeeded: 0, failed: 0, errors: [] as string[] };

    for (const id of ids) {
      try {
        if (action === "delete") {
          const target = await queryOne<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [id]);
          if (target?.role === "super_admin") { results.failed++; continue; }
          await query(`DELETE FROM users WHERE id = $1`, [id]);
        } else if (action === "suspend") {
          await query(`UPDATE users SET verification_status = 'rejected' WHERE id = $1 AND role != 'super_admin'`, [id]);
        } else if (action === "activate" || action === "verify") {
          await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [id]);
        }
        results.succeeded++;
      } catch {
        results.failed++;
      }
    }

    await recordAudit({
      adminId: req.user!.sub,
      action: `users.bulk_${action}`,
      targetType: "users",
      targetId: ids.join(","),
      metadata: { ids, results },
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// MENTOR VERIFICATION
// ============================================================
adminRouter.get("/mentor-verifications", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const mentors = await query(
      `SELECT u.id, u.full_name, u.email, u.country_of_origin, u.country_of_residence,
              u.bio, u.verification_status, u.created_at,
              mp.expertise_areas, mp.languages_spoken, mp.years_abroad,
              mp.universities_attended, mp.available_for_mentoring,
              mp.verified_by, mp.verified_at,
              COALESCE(
                (SELECT json_agg(json_build_object('id', ud.id, 'type', ud.purpose, 'url', ud.url, 'file_name', ud.original_name, 'verified', ud.status = 'verified'))
                 FROM user_documents ud WHERE ud.user_id = u.id),
                '[]'::json
              ) AS documents
       FROM users u
       JOIN mentor_profiles mp ON mp.user_id = u.id
       WHERE u.role = 'mentor'
       ORDER BY CASE WHEN u.verification_status = 'pending' THEN 0 ELSE 1 END, u.created_at DESC`
    );
    res.json({ mentors });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/mentor-verifications/:id/approve", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET verification_status = 'verified' WHERE id = $1 AND role = 'mentor'`,
      [req.params.id]
    );
    await query(
      `UPDATE mentor_profiles SET verified_by = $1, verified_at = NOW() WHERE user_id = $2`,
      [req.user!.sub, req.params.id]
    );
    await recordAudit({
      adminId: req.user!.sub, action: "mentor.verify", targetType: "mentor", targetId: String(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/mentor-verifications/:id/reject", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    await query(
      `UPDATE users SET verification_status = 'rejected' WHERE id = $1 AND role = 'mentor'`,
      [req.params.id]
    );
    await recordAudit({
      adminId: req.user!.sub, action: "mentor.reject", targetType: "mentor",
      targetId: String(req.params.id), metadata: { reason },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/mentor-verifications/:id/reopen", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET verification_status = 'pending' WHERE id = $1 AND role = 'mentor'`,
      [req.params.id]
    );
    await recordAudit({
      adminId: req.user!.sub, action: "mentor.reopen", targetType: "mentor", targetId: String(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// EMPLOYER VERIFICATION
// ============================================================
adminRouter.get("/employer-verifications", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const employers = await query(
      `SELECT u.id, u.full_name, u.email, u.country_of_origin, u.country_of_residence,
              u.bio, u.verification_status, u.created_at,
              ep.company_name, ep.company_website, ep.company_size, ep.industry,
              ep.sponsors_visas, ep.visa_sponsorship_countries,
              COALESCE(
                (SELECT json_agg(json_build_object('id', ud.id, 'type', ud.purpose, 'url', ud.url, 'file_name', ud.original_name, 'verified', ud.status = 'verified'))
                 FROM user_documents ud WHERE ud.user_id = u.id),
                '[]'::json
              ) AS documents
       FROM users u
       JOIN employer_profiles ep ON ep.user_id = u.id
       WHERE u.role = 'employer'
       ORDER BY CASE WHEN u.verification_status = 'pending' THEN 0 ELSE 1 END, u.created_at DESC`
    );
    res.json({ employers });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/employer-verifications/:id/approve", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET verification_status = 'verified' WHERE id = $1 AND role = 'employer'`,
      [req.params.id]
    );
    await recordAudit({
      adminId: req.user!.sub, action: "employer.verify", targetType: "employer", targetId: String(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/employer-verifications/:id/reject", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    await query(
      `UPDATE users SET verification_status = 'rejected' WHERE id = $1 AND role = 'employer'`,
      [req.params.id]
    );
    await recordAudit({
      adminId: req.user!.sub, action: "employer.reject", targetType: "employer",
      targetId: String(req.params.id), metadata: { reason },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// CONTENT MODERATION
// ============================================================
adminRouter.get("/content", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (type && type !== "all") { conditions.push(`type = $${idx++}`); params.push(type); }

    const [housing, opportunities, jobs, forumPosts, stories] = await Promise.all([
      query(
        `SELECT id, title, 'housing' AS type, status, created_at, 'landlord' AS author_field FROM housing_listings`
      ),
      query(
        `SELECT o.id, o.title, 'opportunity' AS type, 
                CASE WHEN o.is_verified THEN 'active' ELSE 'pending_review' END AS status, 
                o.created_at, u.full_name AS author_field
         FROM opportunities o LEFT JOIN users u ON u.id = o.posted_by`
      ),
      query(
        `SELECT o.id, o.title, 'job' AS type,
                CASE WHEN o.is_verified THEN 'active' ELSE 'pending_review' END AS status,
                o.created_at, u.full_name AS author_field
         FROM opportunities o LEFT JOIN users u ON u.id = o.posted_by
         WHERE o.type IN ('job', 'internship')`
      ),
      query(
        `SELECT fp.id, fp.title, 'forum_post' AS type, 'active' AS status, fp.created_at, u.full_name AS author_field
         FROM forum_posts fp LEFT JOIN users u ON u.id = fp.author_id`
      ),
      query(
        `SELECT ss.id, ss.name AS title, 'success_story' AS type, 'active' AS status, ss.created_at, 'author' AS author_field
         FROM success_stories ss`
      ),
    ]);

    const allContent = [...housing, ...opportunities, ...jobs, ...forumPosts, ...stories];
    res.json({ content: allContent });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/content/:type/:id/approve", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const type = req.params.type as string;
    const id = req.params.id as string;
    if (type === "housing") {
      await query(`UPDATE housing_listings SET status = 'active' WHERE id = $1`, [id]);
    } else if (type === "opportunity" || type === "job") {
      await query(`UPDATE opportunities SET is_verified = TRUE WHERE id = $1`, [id]);
    }
    await recordAudit({
      adminId: req.user!.sub, action: "content.approve", targetType: type, targetId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/content/:type/:id/reject", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const type = req.params.type as string;
    const id = req.params.id as string;
    if (type === "housing") {
      await query(`UPDATE housing_listings SET status = 'archived' WHERE id = $1`, [id]);
    } else if (type === "opportunity" || type === "job") {
      await query(`UPDATE opportunities SET is_verified = FALSE WHERE id = $1`, [id]);
    }
    await recordAudit({
      adminId: req.user!.sub, action: "content.reject", targetType: type, targetId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/content/:type/:id", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const type = req.params.type as string;
    const id = req.params.id as string;
    if (type === "housing") await query(`DELETE FROM housing_listings WHERE id = $1`, [id]);
    else if (type === "forum_post") await query(`DELETE FROM forum_posts WHERE id = $1`, [id]);
    else if (type === "opportunity" || type === "job") await query(`DELETE FROM opportunities WHERE id = $1`, [id]);
    else if (type === "success_story") await query(`DELETE FROM success_stories WHERE id = $1`, [id]);
    await recordAudit({
      adminId: req.user!.sub, action: "content.delete", targetType: type, targetId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// REPORTS MANAGEMENT
// ============================================================
adminRouter.get("/reports", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "pending";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const where = status !== "all" ? `WHERE r.status = $1` : "";
    const countResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM reports r ${where}`,
      status !== "all" ? [status] : []
    );

    const reports = await query(
      `SELECT r.*, u.full_name AS reporter_name, res.full_name AS resolver_name
         FROM reports r
         LEFT JOIN users u ON u.id = r.reporter_id
         LEFT JOIN users res ON res.id = r.resolved_by
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${status !== "all" ? 2 : 1} OFFSET $${status !== "all" ? 3 : 2}`,
      status !== "all"
        ? [status, limit, offset]
        : [limit, offset]
    );
    res.json({ reports, total: countResult?.total ?? 0, page, limit });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/reports/:id", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { status, notes } = z.object({
      status: z.enum(["resolved", "dismissed", "reviewing"]),
      notes: z.string().optional(),
    }).parse(req.body);

    await query(
      `UPDATE reports SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3`,
      [status, req.user!.sub, req.params.id]
    );

    await recordAudit({
      adminId: req.user!.sub, action: "report.resolve", targetType: "report",
      targetId: String(req.params.id), metadata: { status, notes },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PLATFORM SETTINGS
// ============================================================
adminRouter.get("/settings", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const settings = await query<{ key: string; value: unknown }>(
      `SELECT key, value FROM platform_settings ORDER BY key`
    );
    const obj: Record<string, unknown> = {};
    for (const s of settings) {
      obj[s.key] = s.value;
    }
    res.json({ settings: obj });
  } catch (err) {
    next(err);
  }
});

adminRouter.put("/settings", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const body = z.record(z.string(), z.unknown()).parse(req.body);
    for (const [key, value] of Object.entries(body)) {
      await query(
        `INSERT INTO platform_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_by = $3, updated_at = NOW()`,
        [key, JSON.stringify(value), req.user!.sub]
      );
    }
    await recordAudit({
      adminId: req.user!.sub, action: "settings.update", targetType: "settings",
      metadata: { keys: Object.keys(body) },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
adminRouter.post("/notifications/send", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { user_id, kind, title, body, href } = z.object({
      user_id: z.string().uuid().optional(),
      kind: z.string().default("info"),
      title: z.string().min(1).max(255),
      body: z.string().optional(),
      href: z.string().optional(),
    }).parse(req.body);

    if (user_id) {
      await query(
        `INSERT INTO notifications (user_id, kind, title, body, href) VALUES ($1, $2, $3, $4, $5)`,
        [user_id, kind, title, body ?? null, href ?? null]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/notifications/broadcast", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { kind, title, body, href, role } = z.object({
      kind: z.string().default("announcement"),
      title: z.string().min(1).max(255),
      body: z.string().optional(),
      href: z.string().optional(),
      role: z.enum(["student", "mentor", "employer", "all"]).default("all"),
    }).parse(req.body);

    if (role === "all") {
      await query(
        `INSERT INTO notifications (user_id, kind, title, body, href)
         SELECT id, $1, $2, $3, $4 FROM users`,
        [kind, title, body ?? null, href ?? null]
      );
    } else {
      await query(
        `INSERT INTO notifications (user_id, kind, title, body, href)
         SELECT id, $1, $2, $3, $4 FROM users WHERE role = $5`,
        [kind, title, body ?? null, href ?? null, role]
      );
    }

    await recordAudit({
      adminId: req.user!.sub, action: "notifications.broadcast", targetType: "notification",
      metadata: { kind, title, role },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/notifications", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const notifications = await query(
      `SELECT n.*, u.full_name AS user_name
         FROM notifications n
         LEFT JOIN users u ON u.id = n.user_id
        ORDER BY n.created_at DESC LIMIT 100`
    );
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// AI MANAGEMENT
// ============================================================
adminRouter.get("/ai/stats", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const [usage, feedback, conversations, models, byModel, ratingDistribution, recentErrors, errorsByFeature] = await Promise.all([
      queryOne<{ total_requests: number; avg_tokens: number; avg_response_time: number; error_rate: number }>(
        `SELECT
           COUNT(*)::int AS total_requests,
           COALESCE(AVG(input_tokens + output_tokens), 0)::int AS avg_tokens,
           COALESCE(AVG(response_time_ms), 0)::int AS avg_response_time,
           (COUNT(*) FILTER (WHERE error IS NOT NULL)::float / NULLIF(COUNT(*), 0) * 100)::int AS error_rate
         FROM ai_usage_log`
      ),
      queryOne<{ avg_rating: number; total_feedback: number }>(
        `SELECT COALESCE(AVG(rating), 0)::numeric(3,2) AS avg_rating, COUNT(*)::int AS total_feedback FROM ai_feedback`
      ),
      queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM ai_conversations`),
      query<{ feature: string; count: number }>(
        `SELECT feature, COUNT(*)::int AS count FROM ai_usage_log GROUP BY feature ORDER BY count DESC`
      ),
      query<{ model: string; count: number }>(
        `SELECT COALESCE(model, 'unknown') AS model, COUNT(*)::int AS count FROM ai_usage_log GROUP BY model ORDER BY count DESC`
      ),
      query<{ rating: number; count: number }>(
        `SELECT rating, COUNT(*)::int AS count FROM ai_feedback GROUP BY rating ORDER BY rating DESC`
      ),
      query<{ id: string; feature: string; model: string | null; error: string; created_at: string }>(
        `SELECT id, feature, model, error, created_at FROM ai_usage_log
          WHERE error IS NOT NULL ORDER BY created_at DESC LIMIT 10`
      ),
      query<{ feature: string; count: number }>(
        `SELECT feature, COUNT(*)::int AS count FROM ai_usage_log
          WHERE error IS NOT NULL GROUP BY feature ORDER BY count DESC`
      ),
    ]);

    res.json({
      usage: usage ?? {},
      feedback: feedback ?? { avg_rating: 0, total_feedback: 0 },
      conversations: conversations?.total ?? 0,
      modelUsage: models ?? [],
      byModel: byModel ?? [],
      ratingDistribution: ratingDistribution ?? [],
      recentErrors: recentErrors ?? [],
      errorsByFeature: errorsByFeature ?? [],
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/ai/usage-timeline", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const hours = Math.min(72, Math.max(1, parseInt(req.query.hours as string) || 24));
    const rows = await query<{ bucket: string; requests: number; p95: number | null }>(
      `SELECT date_trunc('hour', created_at) AS bucket,
              COUNT(*)::int AS requests,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms)::int AS p95
         FROM ai_usage_log
        WHERE created_at >= NOW() - ($1 || ' hours')::interval
        GROUP BY 1 ORDER BY 1`,
      [hours]
    );

    const byHour = new Map(rows.map((r) => [new Date(r.bucket).toISOString().slice(0, 13), r]));
    const series: { hour: string; requests: number; p95: number }[] = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600_000);
      const key = d.toISOString().slice(0, 13);
      const row = byHour.get(key);
      series.push({ hour: d.toISOString(), requests: row?.requests ?? 0, p95: row?.p95 ?? 0 });
    }

    res.json({ series });
  } catch (err) {
    next(err);
  }
});

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function zeroFillHours(
  rows: { bucket: string; value: number }[],
  hours: number
): { hour: string; value: number }[] {
  const byHour = new Map(rows.map((r) => [new Date(r.bucket).toISOString().slice(0, 13), r.value]));
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const out: { hour: string; value: number }[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600_000);
    const key = d.toISOString().slice(0, 13);
    out.push({ hour: d.toISOString(), value: byHour.get(key) ?? 0 });
  }
  return out;
}

adminRouter.get("/ai/kpi-series", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const hours = 24;

    const [usageHourly, usagePeriods, convHourly, convPeriods, feedbackHourly, feedbackPeriods] = await Promise.all([
      query<{ bucket: string; requests: number; avg_ms: number; err_count: number; total: number }>(
        `SELECT date_trunc('hour', created_at) AS bucket, COUNT(*)::int AS requests,
                COALESCE(AVG(response_time_ms), 0)::int AS avg_ms,
                COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS err_count, COUNT(*)::int AS total
           FROM ai_usage_log WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY 1 ORDER BY 1`
      ),
      query<{ period: string; requests: number; avg_ms: number; err_count: number; total: number }>(
        `SELECT CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 'current' ELSE 'previous' END AS period,
                COUNT(*)::int AS requests, COALESCE(AVG(response_time_ms), 0)::int AS avg_ms,
                COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS err_count, COUNT(*)::int AS total
           FROM ai_usage_log WHERE created_at >= NOW() - INTERVAL '48 hours' GROUP BY 1`
      ),
      query<{ bucket: string; count: number }>(
        `SELECT date_trunc('hour', created_at) AS bucket, COUNT(*)::int AS count
           FROM ai_conversations WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY 1 ORDER BY 1`
      ),
      query<{ period: string; count: number }>(
        `SELECT CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 'current' ELSE 'previous' END AS period,
                COUNT(*)::int AS count
           FROM ai_conversations WHERE created_at >= NOW() - INTERVAL '48 hours' GROUP BY 1`
      ),
      query<{ bucket: string; count: number; avg_rating: number }>(
        `SELECT date_trunc('hour', created_at) AS bucket, COUNT(*)::int AS count,
                COALESCE(AVG(rating), 0)::numeric(3,2) AS avg_rating
           FROM ai_feedback WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY 1 ORDER BY 1`
      ),
      query<{ period: string; count: number; avg_rating: number }>(
        `SELECT CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 'current' ELSE 'previous' END AS period,
                COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::numeric(3,2) AS avg_rating
           FROM ai_feedback WHERE created_at >= NOW() - INTERVAL '48 hours' GROUP BY 1`
      ),
    ]);

    const usageCur = usagePeriods.find((p) => p.period === "current") ?? { requests: 0, avg_ms: 0, err_count: 0, total: 0 };
    const usagePrev = usagePeriods.find((p) => p.period === "previous") ?? { requests: 0, avg_ms: 0, err_count: 0, total: 0 };
    const convCur = convPeriods.find((p) => p.period === "current")?.count ?? 0;
    const convPrev = convPeriods.find((p) => p.period === "previous")?.count ?? 0;
    const fbCur = feedbackPeriods.find((p) => p.period === "current") ?? { count: 0, avg_rating: 0 };
    const fbPrev = feedbackPeriods.find((p) => p.period === "previous") ?? { count: 0, avg_rating: 0 };
    const errRateCur = usageCur.total ? (usageCur.err_count / usageCur.total) * 100 : 0;
    const errRatePrev = usagePrev.total ? (usagePrev.err_count / usagePrev.total) * 100 : 0;

    res.json({
      series: {
        requests: zeroFillHours(usageHourly.map((r) => ({ bucket: r.bucket, value: r.requests })), hours),
        avgResponseTime: zeroFillHours(usageHourly.map((r) => ({ bucket: r.bucket, value: r.avg_ms })), hours),
        errorRate: zeroFillHours(usageHourly.map((r) => ({ bucket: r.bucket, value: r.total ? (r.err_count / r.total) * 100 : 0 })), hours),
        conversations: zeroFillHours(convHourly.map((r) => ({ bucket: r.bucket, value: r.count })), hours),
        feedbackCount: zeroFillHours(feedbackHourly.map((r) => ({ bucket: r.bucket, value: r.count })), hours),
        avgRating: zeroFillHours(feedbackHourly.map((r) => ({ bucket: r.bucket, value: Number(r.avg_rating) })), hours),
      },
      trends: {
        requests: { current: usageCur.requests, previous: usagePrev.requests, pct: pctChange(usageCur.requests, usagePrev.requests) },
        avgResponseTime: { current: usageCur.avg_ms, previous: usagePrev.avg_ms, pct: pctChange(usageCur.avg_ms, usagePrev.avg_ms) },
        errorRate: { current: Math.round(errRateCur * 100) / 100, previous: Math.round(errRatePrev * 100) / 100, pct: pctChange(errRateCur, errRatePrev) },
        conversations: { current: convCur, previous: convPrev, pct: pctChange(convCur, convPrev) },
        feedbackCount: { current: fbCur.count, previous: fbPrev.count, pct: pctChange(fbCur.count, fbPrev.count) },
        avgRating: { current: Number(fbCur.avg_rating), previous: Number(fbPrev.avg_rating), pct: pctChange(Number(fbCur.avg_rating), Number(fbPrev.avg_rating)) },
      },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/ai/conversations", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const conversations = await query(
      `SELECT ac.*, u.full_name AS user_name, u.email AS user_email
         FROM ai_conversations ac
         LEFT JOIN users u ON u.id = ac.user_id
        ORDER BY ac.created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM ai_conversations`);
    res.json({ conversations, total: countResult?.total ?? 0, page, limit });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/ai/conversations/:id", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const conversation = await queryOne(
      `SELECT ac.*, u.full_name AS user_name
         FROM ai_conversations ac
         LEFT JOIN users u ON u.id = ac.user_id
        WHERE ac.id = $1`,
      [req.params.id]
    );
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    const messages = await query(
      `SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ conversation, messages });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// KNOWLEDGE BASE MANAGEMENT
// ============================================================
adminRouter.get("/knowledge", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) { conditions.push(`(title ILIKE $${idx} OR content ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (category && category !== "all") { conditions.push(`category = $${idx++}`); params.push(category); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const entries = await query(
      `SELECT kb.*, u.full_name AS created_by_name
         FROM knowledge_base kb
         LEFT JOIN users u ON u.id = kb.created_by
       ${where}
       ORDER BY kb.created_at DESC LIMIT 100`,
      params
    );
    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// ANALYTICS
// ============================================================
adminRouter.get("/analytics/user-growth", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const days = clampDays(req.query.days);
    const rows = await query<{ day: string; students: number; mentors: number; employers: number }>(
      `SELECT date_trunc('day', created_at)::date AS day,
              COUNT(*) FILTER (WHERE role = 'student')::int AS students,
              COUNT(*) FILTER (WHERE role = 'mentor')::int AS mentors,
              COUNT(*) FILTER (WHERE role = 'employer')::int AS employers
         FROM users
        WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1`,
      [days]
    );
    res.json({ days, series: rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/analytics/opportunities", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const days = clampDays(req.query.days, 7, 365);
    const rows = await query<{ day: string; count: number; type: string }>(
      `SELECT date_trunc('day', created_at)::date AS day,
              COUNT(*)::int AS count, type
         FROM opportunities
        WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
        GROUP BY 1, 3 ORDER BY 1`,
      [days]
    );
    res.json({ days, series: rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/analytics/forums", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const days = clampDays(req.query.days, 7, 365);
    const [posts, replies] = await Promise.all([
      query<{ day: string; count: number }>(
        `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
           FROM forum_posts WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
          GROUP BY 1 ORDER BY 1`, [days]
      ),
      query<{ day: string; count: number }>(
        `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
           FROM forum_replies WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
          GROUP BY 1 ORDER BY 1`, [days]
      ),
    ]);
    res.json({ days, posts, replies });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/analytics/ai-usage", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const days = clampDays(req.query.days, 7, 365);
    const rows = await query<{ day: string; count: number; avg_tokens: number; avg_response_time: number }>(
      `SELECT date_trunc('day', created_at)::date AS day,
              COUNT(*)::int AS count,
              COALESCE(AVG(input_tokens + output_tokens), 0)::int AS avg_tokens,
              COALESCE(AVG(response_time_ms), 0)::int AS avg_response_time
         FROM ai_usage_log
        WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1`,
      [days]
    );
    res.json({ days, series: rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/analytics/languages", requireAuth, requireAdmin(), async (_req, res, next) => {
  try {
    const languages = await query<{ language: string; count: number }>(
      `SELECT preferred_language AS language, COUNT(*)::int AS count
         FROM users WHERE preferred_language IS NOT NULL
        GROUP BY preferred_language ORDER BY count DESC`
    );
    res.json({ languages });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// ACTIVITY / AUDIT TRAIL
// ============================================================
adminRouter.get("/activity-log", requireAuth, requireAdmin(), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const entries = await query(
      `SELECT al.*, u.full_name AS user_name, u.email AS user_email
         FROM activity_log al
         LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM activity_log`);
    res.json({ entries, total: countResult?.total ?? 0, page, limit });
  } catch (err) {
    next(err);
  }
});
