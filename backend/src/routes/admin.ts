import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { collectHealth } from "../lib/health";

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
