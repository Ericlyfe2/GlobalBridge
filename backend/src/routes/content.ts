import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { pushEnabled, dispatchNotification } from "../lib/push";

export const contentRouter = Router();

// ===== Success stories =====
// Public, unauthenticated: the frontend's own /api/ai/* route handlers call
// this on every request to pick up the admin-configured model/prompt/
// temperature/feature-toggles from platform_settings. None of these values
// are secret — they're the same things shown in the admin Settings UI.
const AI_DEFAULTS = {
  ai_model: "gemini-3.5-flash",
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
const IANA_ZONE = /^[A-Za-z]+(?:[_+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_+-][A-Za-z0-9]+)*)*$/;

const bookingSchema = z.object({
  mentor_id: z.string().uuid(),
  // slot_date/slot_time were bare z.string(). The live column was VARCHAR(10),
  // not TIME, so "25:99" and "not-time" were stored verbatim rather than
  // rejected. Both the column type and this schema now refuse them.
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "slot_date must be YYYY-MM-DD"),
  slot_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "slot_time must be HH:MM (24h)"),
  duration_min: z.number().int().min(15).max(240).optional(),
  goal: z.string().max(500).optional(),
  // IANA zone (e.g. "Africa/Accra"), captured client-side from the student's
  // browser. slot_time alone is ambiguous the moment mentor and student are
  // in different timezones — without this, "3:00 PM" on a mentor's dashboard
  // has no way of saying whose 3pm it is.
  student_timezone: z.string().max(100).regex(IANA_ZONE, "student_timezone must be an IANA zone").optional(),
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
    const tz = b.student_timezone ?? "UTC";
    const duration = b.duration_min ?? 30;

    const mentor = await queryOne<{ id: string; available: boolean; timezone: string }>(
      `SELECT u.id, COALESCE(mp.available_for_mentoring, TRUE) AS available,
              COALESCE(mp.timezone, 'UTC') AS timezone
         FROM users u LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
        WHERE u.id = $1 AND u.role = 'mentor'`,
      [b.mentor_id]
    );
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    // A mentor who had switched themselves off was still receiving bookings.
    if (!mentor.available) {
      return res.status(409).json({ error: "This mentor isn't taking bookings right now." });
    }

    // Resolve the wall-clock request to an instant, in the student's zone.
    // Everything downstream — the past check, the availability window, and the
    // overlap constraint — reasons about instants, not about "3 PM" in nobody's
    // particular timezone.
    const startsRow = await queryOne<{ starts_at: string; is_past: boolean }>(
      `SELECT ts AS starts_at, ts < NOW() AS is_past
         FROM (SELECT ($1::date + $2::time) AT TIME ZONE $3 AS ts) q`,
      [b.slot_date, b.slot_time, tz]
    );
    if (!startsRow) return res.status(400).json({ error: "Could not interpret that date and time." });
    if (startsRow.is_past) {
      return res.status(400).json({ error: "That time has already passed — pick a future slot." });
    }

    // Availability is declared in the mentor's own timezone, so compare there.
    const declared = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM mentor_availability WHERE mentor_id = $1`,
      [b.mentor_id]
    );
    if ((declared?.n ?? 0) > 0) {
      const fits = await queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n
           FROM mentor_availability a
          WHERE a.mentor_id = $1
            AND a.weekday = EXTRACT(DOW FROM ($2::timestamptz AT TIME ZONE $4))::int
            AND ($2::timestamptz AT TIME ZONE $4)::time >= a.start_time
            AND (($2::timestamptz + make_interval(mins => $3)) AT TIME ZONE $4)::time <= a.end_time`,
        [b.mentor_id, startsRow.starts_at, duration, mentor.timezone]
      );
      // A mentor who has published no windows keeps the previous open-booking
      // behaviour; treating an empty schedule as "closed" would silently take
      // every mentor offline until they filled one in.
      if ((fits?.n ?? 0) === 0) {
        return res.status(409).json({
          error: "That time is outside this mentor's available hours.",
          mentor_timezone: mentor.timezone,
        });
      }
    }

    let booking;
    try {
      booking = await queryOne(
        `INSERT INTO mentor_bookings
           (mentor_id, student_id, slot_date, slot_time, duration_min, goal, student_timezone, starts_at, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
        [b.mentor_id, req.user!.sub, b.slot_date, b.slot_time, duration, b.goal ?? null, b.student_timezone ?? null, startsRow.starts_at]
      );
    } catch (e) {
      // 23P01 = exclusion_violation. The database is the arbiter: two concurrent
      // requests for the same slot both pass every check above, and exactly one
      // survives the constraint. A read-then-write in application code cannot
      // give that guarantee.
      if ((e as { code?: string }).code === "23P01") {
        return res.status(409).json({ error: "That slot was just taken. Please pick another time." });
      }
      throw e;
    }

    const tzSuffix = b.student_timezone ? ` (${b.student_timezone}, student's local time)` : "";
    await dispatchNotification({
      userId: b.mentor_id,
      kind: "mentor",
      title: "New mentorship booking",
      body: `A student booked a ${duration}-min session on ${b.slot_date} at ${b.slot_time}${tzSuffix}.`,
      href: "/dashboard/mentor",
    });

    res.status(201).json({ booking });
  } catch (err) { next(err); }
});

// ── Booking lifecycle ───────────────────────────────────────────────────────
// mentor_bookings.status supported pending/confirmed/cancelled/completed and the
// mentor dashboard rendered a "pending requests" list, but no endpoint anywhere
// could move a booking out of pending. Journey 3 — receive booking, confirm
// booking — was not implementable.
//
// "confirmed" rather than "accepted" because that is the vocabulary already in
// the table and in every mentor-dashboard query.
const TRANSITIONS = {
  confirmed: { from: ["pending"], actor: "mentor" },
  declined: { from: ["pending"], actor: "mentor" },
  cancelled: { from: ["pending", "confirmed"], actor: "either" },
  completed: { from: ["confirmed"], actor: "mentor" },
} as const;

type NextStatus = keyof typeof TRANSITIONS;

const COPY: Record<NextStatus, (d: string, t: string) => { title: string; body: string }> = {
  confirmed: (d, t) => ({ title: "Your session is confirmed", body: `Your mentor confirmed ${d} at ${t}.` }),
  declined: (d, t) => ({ title: "Session request declined", body: `Your mentor can't make ${d} at ${t}. Try another slot.` }),
  cancelled: (d, t) => ({ title: "Session cancelled", body: `The session on ${d} at ${t} was cancelled.` }),
  completed: (d) => ({ title: "Session marked complete", body: `Your session on ${d} is marked complete.` }),
};

contentRouter.patch("/bookings/:id", requireAuth, async (req, res, next) => {
  try {
    const { status } = z
      .object({ status: z.enum(["confirmed", "declined", "cancelled", "completed"]) })
      .parse(req.body);
    const rule = TRANSITIONS[status as NextStatus];

    const booking = await queryOne<{
      id: string; mentor_id: string; student_id: string; status: string;
      slot_date: string; slot_time: string;
    }>(
      `SELECT id, mentor_id, student_id, status, slot_date, slot_time
         FROM mentor_bookings WHERE id = $1`,
      [req.params.id]
    );
    // 404 rather than 403 for a stranger: whether a booking exists is itself
    // information about two other people's calendars.
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const me = req.user!.sub;
    const isMentor = booking.mentor_id === me;
    const isStudent = booking.student_id === me;
    if (!isMentor && !isStudent) return res.status(404).json({ error: "Booking not found" });

    if (rule.actor === "mentor" && !isMentor) {
      return res.status(403).json({ error: "Only the mentor can do that." });
    }
    if (!(rule.from as readonly string[]).includes(booking.status)) {
      return res.status(409).json({
        error: `A ${booking.status} booking can't be marked ${status}.`,
        current_status: booking.status,
      });
    }

    const updated = await queryOne(
      `UPDATE mentor_bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    // Tell the other party, through the existing notification contract.
    const copy = COPY[status as NextStatus](booking.slot_date, booking.slot_time);
    await dispatchNotification({
      userId: isMentor ? booking.student_id : booking.mentor_id,
      kind: "mentor",
      title: copy.title,
      body: copy.body,
      href: isMentor ? "/dashboard/student" : "/dashboard/mentor",
    });

    res.json({ booking: updated });
  } catch (err) { next(err); }
});

