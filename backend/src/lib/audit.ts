// Admin audit logging. Records privileged actions for accountability.
// Writes are best-effort: a logging failure must NEVER break the primary action.

import { query } from "../db";

export interface AuditEntry {
  adminId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(e: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [e.adminId, e.action, e.targetType ?? null, e.targetId ?? null, JSON.stringify(e.metadata ?? {})],
    );
  } catch (err) {
    // Swallow: auditing is observability, not a gate on the mutation.
    console.error("admin audit write failed", err);
  }
}

/** Clamp a `limit` query param to a safe page size. */
export function clampLimit(raw: unknown, min = 1, max = 100, fallback = 50): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
