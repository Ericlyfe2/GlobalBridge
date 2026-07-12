import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { collectHealth } from "../lib/health";
import { clampLimit } from "../lib/audit";

export const adminRouter = Router();

// Real system health — probes Postgres, Redis, and the AI service live.
// Replaces the previously hardcoded "Connected" panel on the admin overview.
adminRouter.get("/health", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const report = await collectHealth();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Admin audit log — cursor-paginated (pass `before` = last entry's created_at).
adminRouter.get("/audit", requireAuth, requireRole("admin"), async (req, res, next) => {
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
