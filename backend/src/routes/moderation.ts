import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { sanitizeAllStrings } from "../lib/sanitize";
import { recordAudit } from "../lib/audit";

export const moderationRouter = Router();

const reportSchema = z.object({
  target_type: z.enum(["user", "post", "reply", "listing", "opportunity", "message"]),
  target_id: z.string().uuid(),
  reason: z.string().min(2).max(500),
  details: z.string().max(2000).optional(),
});

moderationRouter.post("/report", requireAuth, async (req, res, next) => {
  try {
    const b = reportSchema.parse(req.body);
    const safe = sanitizeAllStrings(b);
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
    if (!["resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Use: resolved, dismissed" });
    }
    await query(
      `UPDATE reports SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3`,
      [status, req.user!.sub, req.params.id]
    );
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

moderationRouter.get("/scam-alerts", async (_req, res, next) => {
  try {
    const alerts = await query(
      `SELECT sa.*, u.full_name AS reporter_name FROM scam_alerts sa
       LEFT JOIN users u ON u.id = sa.reported_by
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
    const b = alertSchema.parse(req.body);
    const safe = sanitizeAllStrings(b);
    const alert = await queryOne(
      `INSERT INTO scam_alerts (reported_by, title, description, scam_type, affected_countries)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user!.sub, safe.title, safe.description, safe.scam_type, safe.affected_countries]
    );
    res.status(201).json({ alert });
  } catch (err) {
    next(err);
  }
});
