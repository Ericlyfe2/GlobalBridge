import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { pushEnabled } from "../lib/push";

export const contentRouter = Router();

// ===== Success stories =====
// Public, unauthenticated: the frontend's own /api/ai/* route handlers call
// this on every request to pick up the admin-configured model/prompt/
// temperature/feature-toggles from platform_settings. None of these values
// are secret — they're the same things shown in the admin Settings UI.
const AI_DEFAULTS = {
  ai_model: "gpt-4o",
  ai_temperature: 0.3,
  ai_system_prompt: "",
  ai_chat_enabled: true,
  ai_doc_check_enabled: true,
  ai_scam_detection_enabled: true,
  ai_translation_enabled: true,
};

contentRouter.get("/ai-config", async (_req, res, next) => {
  try {
    const rows = await query<{ key: string; value: unknown }>(
      `SELECT key, value FROM platform_settings WHERE key = ANY($1)`,
      [Object.keys(AI_DEFAULTS)]
    );
    const config = { ...AI_DEFAULTS };
    for (const r of rows) {
      if (r.key in config) (config as Record<string, unknown>)[r.key] = r.value;
    }
    res.set("Cache-Control", "public, max-age=15");
    res.json(config);
  } catch (err) { next(err); }
});

contentRouter.get("/stories", async (_req, res, next) => {
  try {
    const stories = await query(
      `SELECT id, name, origin, origin_flag, destination, dest_flag, program,
              outcome, year, quote, before_text, after_text, body, verified, created_at
       FROM success_stories WHERE verified = TRUE ORDER BY created_at DESC LIMIT 50`
    );
    res.set("Cache-Control", "public, max-age=120");
    res.json({ stories });
  } catch (err) { next(err); }
});

contentRouter.get("/stories/:id", async (req, res, next) => {
  try {
    const story = await queryOne(`SELECT id, name, origin, origin_flag, destination, dest_flag, program, outcome, year, quote, before_text, after_text, body, verified, created_at FROM success_stories WHERE id = $1 AND verified = TRUE`, [req.params.id]);
    if (!story) return res.status(404).json({ error: "Story not found" });
    const related = await query(
      `SELECT id, name, outcome FROM success_stories WHERE id != $1 AND verified = TRUE ORDER BY created_at DESC LIMIT 3`,
      [req.params.id]
    );
    res.json({ story, related });
  } catch (err) { next(err); }
});

// ===== Contact form =====
const contactSchema = z.object({
  topic: z.enum(["general", "support", "safety", "press", "partner", "institution"]),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
});

contentRouter.post("/contact", async (req, res, next) => {
  try {
    const b = contactSchema.parse(req.body);
    const saved = await queryOne<{ id: string }>(
      `INSERT INTO contact_messages (topic, name, email, message) VALUES ($1,$2,$3,$4) RETURNING id`,
      [b.topic, b.name, b.email, b.message]
    );
    // Admins get a real notification so the message doesn't just sit in the table unseen.
    await query(
      `INSERT INTO notifications (user_id, kind, title, body, href)
       SELECT id, 'contact', $1, $2, NULL FROM users WHERE role = 'admin' OR role = 'super_admin'`,
      [`New contact message: ${b.topic}`, `${b.name} <${b.email}>: ${b.message.slice(0, 140)}`]
    );
    res.status(201).json({ ok: true, id: saved?.id });
  } catch (err) { next(err); }
});

// ===== Newsletter signup (footer) =====
// There's no email-sending infrastructure in this app (no SendGrid/SMTP wired
// up anywhere), so this can't actually deliver anything by email. The footer
// form instead triggers an immediate real client-side checklist download —
// this endpoint's only job is to capture the address for genuine future
// outreach, same pattern as /contact.
const newsletterSchema = z.object({ email: z.string().email() });

contentRouter.post("/newsletter", async (req, res, next) => {
  try {
    const { email } = newsletterSchema.parse(req.body);
    await query(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email]
    );
    res.status(201).json({ ok: true });
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

// Lightweight — the app shell polls this on every page to light the navbar
// bell, so it deliberately doesn't pull the full notification rows.
contentRouter.get("/notifications/unread-count", requireAuth, async (req, res, next) => {
  try {
    const row = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read = FALSE`,
      [req.user!.sub]
    );
    res.json({ count: row?.n ?? 0 });
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
  // IANA zone (e.g. "Africa/Accra"), captured client-side from the student's
  // browser. slot_time alone is ambiguous the moment mentor and student are
  // in different timezones — without this, "3:00 PM" on a mentor's dashboard
  // has no way of saying whose 3pm it is.
  student_timezone: z.string().max(100).optional(),
});

contentRouter.get("/bookings", requireAuth, async (req, res, next) => {
  try {
    const { limit: bookingLimit } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
    const bookings = await query(
      `SELECT b.id, b.mentor_id, b.slot_date, b.slot_time, b.duration_min, b.goal, b.created_at, b.student_timezone,
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
    const mentor = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1 AND role = 'mentor'`,
      [b.mentor_id]
    );
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const booking = await queryOne(
      `INSERT INTO mentor_bookings (mentor_id, student_id, slot_date, slot_time, duration_min, goal, student_timezone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.mentor_id, req.user!.sub, b.slot_date, b.slot_time, b.duration_min ?? 30, b.goal, b.student_timezone ?? null]
    );
    // Notify the mentor — include the zone explicitly so "3:00 PM" isn't left
    // ambiguous between two people who may not share a timezone.
    const tzSuffix = b.student_timezone ? ` (${b.student_timezone}, student's local time)` : "";
    await query(
      `INSERT INTO notifications (user_id, kind, title, body, href)
       VALUES ($1, 'message', 'New mentorship booking', $2, '/messages?tab=bookings')`,
      [b.mentor_id, `A student booked a ${b.duration_min ?? 30}-min session on ${b.slot_date} at ${b.slot_time}${tzSuffix}.`]
    );
    res.status(201).json({ booking });
  } catch (err) { next(err); }
});
