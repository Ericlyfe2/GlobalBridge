import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { recordAudit } from "../lib/audit";

export const moderationRouter = Router();

const reportSchema = z.object({
  target_type: z.enum(["user", "post", "reply", "listing", "opportunity", "message", "scam_alert"]),
  target_id: z.string().uuid(),
  reason: z.string().min(2).max(500),
  details: z.string().max(2000).optional(),
});

moderationRouter.post("/report", requireAuth, async (req, res, next) => {
  try {
    const safe = reportSchema.parse(req.body);
    const report = await queryOne(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user!.sub, safe.target_type, safe.target_id, safe.reason, safe.details]
    );
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
});

moderationRouter.get("/reports", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const reports = await query(
      `SELECT r.*, u.full_name AS reporter_name FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC LIMIT 100`
    );
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

// Admin: resolve / dismiss a report
moderationRouter.patch("/reports/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    // Matches the real report_status enum. "reviewing" is a real intermediate
    // state the admin UI uses — the previous allowlist rejected it, so every
    // "Mark as reviewing" click 400'd.
    if (!["reviewing", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Use: reviewing, resolved, dismissed" });
    }
    if (status === "reviewing") {
      // Just marks it in progress — not resolved by anyone yet.
      await query(`UPDATE reports SET status = $1 WHERE id = $2`, [status, req.params.id]);
    } else {
      await query(
        `UPDATE reports SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3`,
        [status, req.user!.sub, req.params.id]
      );
    }
    await recordAudit({
      adminId: req.user!.sub,
      action: "report.resolve",
      targetType: "report",
      targetId: String(req.params.id),
      metadata: { status },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Public feed — approved alerts only.
//
// A scam alert names a person or a business and accuses them of fraud. Any
// authenticated account could publish one straight to this unauthenticated
// feed with no review and no takedown path: a defamation vector, not merely a
// moderation gap. verified_by_admin already defaulted to FALSE; nothing was
// reading it.
moderationRouter.get("/scam-alerts", async (_req, res, next) => {
  try {
    const alerts = await query(
      `SELECT sa.*, u.full_name AS reporter_name FROM scam_alerts sa
       LEFT JOIN users u ON u.id = sa.reported_by
       WHERE sa.verified_by_admin = TRUE
       ORDER BY sa.upvotes DESC, sa.created_at DESC LIMIT 50`
    );
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

const alertSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  scam_type: z.string().max(100).optional(),
  affected_countries: z.array(z.string().max(100)).max(50).optional(),
});

moderationRouter.post("/scam-alerts", requireAuth, async (req, res, next) => {
  try {
    const safe = alertSchema.parse(req.body);
    const alert = await queryOne(
      // verified_by_admin stays FALSE (the column default) — this is a
      // submission for review, not a publication.
      `INSERT INTO scam_alerts (reported_by, title, description, scam_type, affected_countries)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user!.sub, safe.title, safe.description, safe.scam_type, safe.affected_countries]
    );
    res.status(201).json({
      alert,
      pending_review: true,
      message: "Thanks — a moderator will review this before it goes live.",
    });
  } catch (err) {
    next(err);
  }
});

// ── Scam-alert moderation ───────────────────────────────────────────────────

/** Submissions awaiting review. */
moderationRouter.get("/scam-alerts/pending", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const alerts = await query(
      `SELECT sa.*, u.full_name AS reporter_name, u.email AS reporter_email
       FROM scam_alerts sa
       LEFT JOIN users u ON u.id = sa.reported_by
       WHERE sa.verified_by_admin = FALSE
       ORDER BY sa.created_at ASC LIMIT 100`
    );
    res.json({ alerts });
  } catch (err) { next(err); }
});

/** What the submitter sees: their own alerts, approved or not. */
moderationRouter.get("/scam-alerts/mine", requireAuth, async (req, res, next) => {
  try {
    const alerts = await query(
      `SELECT id, title, description, scam_type, affected_countries, verified_by_admin, created_at
       FROM scam_alerts WHERE reported_by = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.sub]
    );
    res.json({ alerts });
  } catch (err) { next(err); }
});

/** Approve — the only thing that makes an alert public. */
moderationRouter.post("/scam-alerts/:id/approve", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const alert = await queryOne(
      `UPDATE scam_alerts SET verified_by_admin = TRUE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    await recordAudit({
      adminId: req.user!.sub, action: "scam_alert.approve",
      targetType: "scam_alert", targetId: String(req.params.id),
    });
    res.json({ alert });
  } catch (err) { next(err); }
});

/**
 * Takedown. Works on a pending submission and on one already published —
 * the whole point is that a published accusation can be pulled.
 */
moderationRouter.delete("/scam-alerts/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : null;
    const removed = await queryOne<{ id: string; title: string; reported_by: string | null }>(
      `DELETE FROM scam_alerts WHERE id = $1 RETURNING id, title, reported_by`,
      [req.params.id]
    );
    if (!removed) return res.status(404).json({ error: "Alert not found" });
    await recordAudit({
      adminId: req.user!.sub, action: "scam_alert.takedown",
      targetType: "scam_alert", targetId: String(req.params.id),
      metadata: { title: removed.title, reason },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
