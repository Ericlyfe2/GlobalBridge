import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { sanitizeAllStrings } from "../lib/sanitize";
import { pushEnabled } from "../lib/push";

export const contentRouter = Router();

// ===== Success stories =====
contentRouter.get("/stories", async (_req, res, next) => {
  try {
    const stories = await query(
      `SELECT id, name, origin, origin_flag, destination, dest_flag, program,
              outcome, year, quote, before_text, after_text, body, verified, created_at
       FROM success_stories ORDER BY created_at DESC LIMIT 50`
    );
    res.set("Cache-Control", "public, max-age=120");
    res.json({ stories });
  } catch (err) { next(err); }
});

contentRouter.get("/stories/:id", async (req, res, next) => {
  try {
    const story = await queryOne(`SELECT id, name, origin, origin_flag, destination, dest_flag, program, outcome, year, quote, before_text, after_text, body, verified, created_at FROM success_stories WHERE id = $1`, [req.params.id]);
    if (!story) return res.status(404).json({ error: "Story not found" });
    const related = await query(
      `SELECT id, name, outcome FROM success_stories WHERE id != $1 ORDER BY created_at DESC LIMIT 3`,
      [req.params.id]
    );
    res.json({ story, related });
  } catch (err) { next(err); }
});

// ===== Notifications =====
contentRouter.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const notes = await query(
      `SELECT id, kind, title, body, href, read, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.sub]
    );
    res.json({ notifications: notes });
  } catch (err) { next(err); }
});

contentRouter.post("/notifications/read", requireAuth, async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid().optional() }).parse(req.body);
    if (id) {
      await query(`UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`, [id, req.user!.sub]);
    } else {
      await query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [req.user!.sub]);
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ===== Web push subscriptions =====

/**
 * The browser's PushSubscription, reshaped. We store the endpoint and the two
 * keys rather than the whole object so the columns are queryable and the shape
 * can't drift with browser changes.
 */
const pushSubSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** The public VAPID key the client needs to subscribe. Safe to expose. */
contentRouter.get("/push/key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null, enabled: pushEnabled });
});

contentRouter.post("/push/subscribe", requireAuth, async (req, res, next) => {
  try {
    const sub = pushSubSchema.parse(req.body);
    // Upsert on endpoint: re-subscribing on the same device must not create a
    // duplicate, and a device handed to a different user must re-point, not
    // keep delivering the previous user's notifications.
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             p256dh  = EXCLUDED.p256dh,
             auth    = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent`,
      [req.user!.sub, sub.endpoint, sub.keys.p256dh, sub.keys.auth, req.get("user-agent") ?? null],
    );
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

contentRouter.post("/push/unsubscribe", requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
    // Scoped to the caller so one user can't unsubscribe another's device.
    await query(
      `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
      [endpoint, req.user!.sub],
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ===== Saved / bookmarked items =====
const saveSchema = z.object({
  item_type: z.enum(["opportunity", "housing", "job"]),
  item_id: z.string().uuid(),
});

contentRouter.get("/saved", requireAuth, async (req, res, next) => {
  try {
    const { limit: savedLimit } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
    const items = await query(
      `SELECT id, item_type, item_id, created_at
       FROM saved_items WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.user!.sub, savedLimit]
    );
    res.json({ saved: items });
  } catch (err) { next(err); }
});

contentRouter.post("/saved", requireAuth, async (req, res, next) => {
  try {
    const b = saveSchema.parse(req.body);
    const item = await queryOne(
      `INSERT INTO saved_items (user_id, item_type, item_id) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, item_type, item_id) DO NOTHING RETURNING *`,
      [req.user!.sub, b.item_type, b.item_id]
    );
    res.status(201).json({ saved: item, ok: true });
  } catch (err) { next(err); }
});

contentRouter.delete("/saved", requireAuth, async (req, res, next) => {
  try {
    const b = saveSchema.parse(req.body);
    await query(
      `DELETE FROM saved_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3`,
      [req.user!.sub, b.item_type, b.item_id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ===== Mentor bookings =====
  const bookingSchema = z.object({
  mentor_id: z.string().uuid(),
  slot_date: z.string(),
  slot_time: z.string(),
  duration_min: z.number().int().optional(),
  goal: z.string().max(500).optional(),
});

contentRouter.get("/bookings", requireAuth, async (req, res, next) => {
  try {
    const { limit: bookingLimit } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
    const bookings = await query(
      `SELECT b.id, b.mentor_id, b.slot_date, b.slot_time, b.duration_min, b.goal, b.created_at,
              m.full_name AS mentor_name
       FROM mentor_bookings b
       JOIN users m ON m.id = b.mentor_id
       WHERE b.student_id = $1 ORDER BY b.slot_date ASC LIMIT $2`,
      [req.user!.sub, bookingLimit]
    );
    res.json({ bookings });
  } catch (err) { next(err); }
});

contentRouter.post("/bookings", requireAuth, async (req, res, next) => {
  try {
    const b = bookingSchema.parse(req.body);
    const safe = sanitizeAllStrings(b);
    const mentor = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1 AND role = 'mentor'`,
      [safe.mentor_id]
    );
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const booking = await queryOne(
      `INSERT INTO mentor_bookings (mentor_id, student_id, slot_date, slot_time, duration_min, goal)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [safe.mentor_id, req.user!.sub, safe.slot_date, safe.slot_time, safe.duration_min ?? 30, safe.goal]
    );
    // Notify the mentor
    await query(
      `INSERT INTO notifications (user_id, kind, title, body, href)
       VALUES ($1, 'message', 'New mentorship booking', $2, '/messages?tab=bookings')`,
      [b.mentor_id, `A student booked a ${b.duration_min ?? 30}-min session on ${b.slot_date} at ${b.slot_time}.`]
    );
    res.status(201).json({ booking });
  } catch (err) { next(err); }
});
