import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole, clearUserCache, isAdmin } from "../middleware/auth";
import { pickAllowed, escapeLike } from "../lib/sanitize";
import { buildDailySeries, clampDays } from "../lib/analytics";
import { recordAudit } from "../lib/audit";
import { adminAuth } from "../lib/firebase-admin";

export const usersRouter = Router();

// Aggregated student dashboard summary for the signed-in user.
// Real data from saved_items, mentor_bookings, visa_checklists, opportunities, forum_posts.
usersRouter.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user!.sub;
    const [profileRow, savedSch, savedHouse, sessions, visaRow, deadlines, discussions] = await Promise.all([
      queryOne<{
        full_name: string | null; avatar_url: string | null; bio: string | null;
        country_of_origin: string | null; country_of_residence: string | null;
        verification_status: string | null;
      }>(
        `SELECT full_name, avatar_url, bio, country_of_origin, country_of_residence, verification_status
         FROM users WHERE id = $1`,
        [uid],
      ),
      queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM saved_items WHERE user_id = $1 AND item_type = 'opportunity'`, [uid]),
      queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM saved_items WHERE user_id = $1 AND item_type = 'housing'`, [uid]),
      queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM mentor_bookings WHERE student_id = $1`, [uid]),
      queryOne<{ items: unknown; completed_items: string[] | null; destination_country: string | null }>(
        `SELECT items, completed_items, destination_country FROM visa_checklists
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [uid]),
      query<{ id: string; title: string; type: string; deadline: string | null; country: string }>(
        `SELECT id, title, type, deadline, country FROM opportunities
         WHERE deadline IS NOT NULL AND deadline >= CURRENT_DATE ORDER BY deadline ASC LIMIT 5`),
      query<{ id: string; title: string; answer_count: number; upvotes: number; created_at: string }>(
        `SELECT id, title, answer_count, upvotes, created_at FROM forum_posts ORDER BY created_at DESC LIMIT 5`),
    ]);

    const profileFields = [
      profileRow?.full_name, profileRow?.avatar_url, profileRow?.bio,
      profileRow?.country_of_origin, profileRow?.country_of_residence,
    ];
    const filled = profileFields.filter((v) => typeof v === "string" && v.trim().length > 0).length;
    const completion = Math.round((filled / profileFields.length) * 100);
    const missingFields = (
      [
        ["full_name", "Full name"], ["avatar_url", "Profile photo"], ["bio", "Bio"],
        ["country_of_origin", "Country of origin"], ["country_of_residence", "Country of residence"],
      ] as const
    )
      .filter(([k]) => {
        const v = profileRow?.[k as keyof typeof profileRow];
        return !(typeof v === "string" && v.trim().length > 0);
      })
      .map(([, label]) => label);

    let visa: { progress: number; destination: string | null; total: number; done: number } | null = null;
    if (visaRow) {
      const total = Array.isArray(visaRow.items) ? visaRow.items.length : 0;
      const done = Array.isArray(visaRow.completed_items) ? visaRow.completed_items.length : 0;
      visa = {
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        destination: visaRow.destination_country,
        total,
        done,
      };
    }

    res.json({
      profile: {
        completion,
        missingFields,
        verificationStatus: profileRow?.verification_status ?? "pending",
      },
      stats: {
        savedScholarships: savedSch?.n ?? 0,
        savedHousing: savedHouse?.n ?? 0,
        mentorSessions: sessions?.n ?? 0,
        profileStrength: completion,
      },
      visa,
      deadlines,
      discussions,
    });
  } catch (err) {
    next(err);
  }
});

// Aggregated mentor dashboard summary. Real data from mentor_bookings,
// forum_replies, and success_stories. (No reviews/ratings table yet, so
// satisfaction metrics are intentionally omitted rather than faked.)
usersRouter.get("/mentor-dashboard", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user!.sub;
    const [counts, hours, community, stories, upcoming, pending] = await Promise.all([
      queryOne<{ active_mentees: number; pending_requests: number; total_sessions: number }>(
        `SELECT
           COUNT(DISTINCT student_id) FILTER (WHERE status <> 'cancelled')::int AS active_mentees,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_requests,
           COUNT(*)::int AS total_sessions
         FROM mentor_bookings WHERE mentor_id = $1`, [uid]),
      queryOne<{ minutes: number }>(
        `SELECT COALESCE(SUM(duration_min), 0)::int AS minutes FROM mentor_bookings
         WHERE mentor_id = $1 AND (status = 'completed' OR slot_date < CURRENT_DATE)`, [uid]),
      queryOne<{ answers: number; accepted: number }>(
        `SELECT COUNT(*)::int AS answers,
                COUNT(*) FILTER (WHERE is_accepted_answer)::int AS accepted
         FROM forum_replies WHERE author_id = $1`, [uid]),
      queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM success_stories WHERE author_id = $1`, [uid]),
      query<{ id: string; student_name: string | null; slot_date: string; slot_time: string; duration_min: number; goal: string | null; status: string; student_timezone: string | null }>(
        `SELECT b.id, u.full_name AS student_name, b.slot_date, b.slot_time, b.duration_min, b.goal, b.status, b.student_timezone
         FROM mentor_bookings b JOIN users u ON u.id = b.student_id
         WHERE b.mentor_id = $1 AND b.slot_date >= CURRENT_DATE AND b.status <> 'cancelled'
         ORDER BY b.slot_date ASC, b.slot_time ASC LIMIT 6`, [uid]),
      query<{ id: string; student_name: string | null; slot_date: string; slot_time: string; goal: string | null; student_timezone: string | null }>(
        `SELECT b.id, u.full_name AS student_name, b.slot_date, b.slot_time, b.goal, b.student_timezone
         FROM mentor_bookings b JOIN users u ON u.id = b.student_id
         WHERE b.mentor_id = $1 AND b.status = 'pending'
         ORDER BY b.created_at DESC LIMIT 6`, [uid]),
    ]);

    const answers = community?.answers ?? 0;
    const accepted = community?.accepted ?? 0;
    const successStories = stories?.n ?? 0;
    const impactScore = answers + accepted * 3 + successStories * 5;

    res.json({
      stats: {
        activeMentees: counts?.active_mentees ?? 0,
        pendingRequests: counts?.pending_requests ?? 0,
        totalSessions: counts?.total_sessions ?? 0,
        hoursMentored: Math.round(((hours?.minutes ?? 0) / 60) * 10) / 10,
      },
      community: { answers, acceptedAnswers: accepted, successStories, impactScore },
      upcomingSessions: upcoming,
      pendingRequests: pending,
    });
  } catch (err) {
    next(err);
  }
});

// Aggregated employer dashboard summary. Jobs are opportunities of type
// job/internship posted by the employer. "Interested candidates" uses
// saved_items as the real interest signal (no applications table yet, so
// hiring/interview metrics are intentionally omitted rather than faked).
usersRouter.get("/employer-dashboard", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user!.sub;
    const [counts, interested, listings, company] = await Promise.all([
      queryOne<{ active_listings: number; total_views: number; sponsorship_listings: number }>(
        `SELECT
           COUNT(*)::int AS active_listings,
           COALESCE(SUM(view_count), 0)::int AS total_views,
           COUNT(*) FILTER (WHERE sponsors_visa)::int AS sponsorship_listings
         FROM opportunities WHERE posted_by = $1 AND type IN ('job', 'internship')`, [uid]),
      queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM saved_items s
         JOIN opportunities o ON o.id = s.item_id
         WHERE s.item_type = 'opportunity' AND o.posted_by = $1 AND o.type IN ('job', 'internship')`, [uid]),
      query<{ id: string; title: string; type: string; view_count: number; sponsors_visa: boolean; deadline: string | null; interested: number }>(
        `SELECT o.id, o.title, o.type, o.view_count, o.sponsors_visa, o.deadline,
                COALESCE(s.cnt, 0)::int AS interested
         FROM opportunities o
         LEFT JOIN (
           SELECT item_id, COUNT(*) AS cnt FROM saved_items WHERE item_type = 'opportunity' GROUP BY item_id
         ) s ON s.item_id = o.id
         WHERE o.posted_by = $1 AND o.type IN ('job', 'internship')
         ORDER BY o.created_at DESC LIMIT 6`, [uid]),
      queryOne<{ company_name: string | null }>(
        `SELECT company_name FROM employer_profiles WHERE user_id = $1`, [uid]),
    ]);

    const active = counts?.active_listings ?? 0;
    const sponsorship = counts?.sponsorship_listings ?? 0;

    res.json({
      stats: {
        activeListings: active,
        interestedCandidates: interested?.n ?? 0,
        totalViews: counts?.total_views ?? 0,
        sponsorshipListings: sponsorship,
        sponsorshipRate: active > 0 ? Math.round((sponsorship / active) * 100) : 0,
      },
      listings,
      company: company?.company_name ?? null,
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/mentors", async (_req, res, next) => {
  try {
    const mentors = await query(
      // country_of_origin only when the mentor chose to share it — same rule
      // as GET /users/:id. Students filter mentors by shared origin, so this is
      // opt-in rather than removed.
      `SELECT u.id, u.full_name, u.avatar_url, u.country_of_residence,
              CASE WHEN u.share_country_of_origin THEN u.country_of_origin END AS country_of_origin,
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

// Single-mentor detail — the /community/mentors/:id booking page needs this
// and previously had nothing to call, so it always rendered one hardcoded
// sample mentor regardless of which real mentor was clicked.
usersRouter.get("/mentors/:id", async (req, res, next) => {
  try {
    const mentor = await queryOne(
      // The directory filters on verification_status but this route did not, so
      // an unverified — or self-assigned (GB-06) — "mentor" still had a live,
      // publicly reachable profile page. Both now agree.
      `SELECT u.id, u.full_name, u.avatar_url, u.country_of_residence,
              CASE WHEN u.share_country_of_origin THEN u.country_of_origin END AS country_of_origin,
              u.bio, u.trust_score, u.verification_status,
              mp.expertise_areas, mp.years_abroad, mp.languages_spoken, mp.universities_attended
       FROM users u
       JOIN mentor_profiles mp ON mp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'mentor' AND u.verification_status = 'verified'`,
      [req.params.id]
    );
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const sessionsRow = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM mentor_bookings WHERE mentor_id = $1`,
      [req.params.id]
    );
    res.json({ mentor: { ...mentor, sessions: sessionsRow?.n ?? 0 } });
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
      // The `else` used to be unbraced, so params.push(status) ran on both
      // branches. On the "suspended" path the SQL gained no placeholder but the
      // params array still gained an entry, so every later binding shifted:
      // ?status=suspended threw outright, and ?status=suspended&search=x bound
      // the search term to the wrong placeholder.
      if (status === "suspended") {
        conditions.push(`u.verification_status = 'rejected'`);
      } else {
        conditions.push(`u.verification_status = $${idx++}`);
        params.push(status);
      }
    }
    if (search) { conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`); params.push(`%${escapeLike(search)}%`); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params);
    const total = countResult?.total ?? 0;

    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.verification_status,
              u.country_of_residence, u.created_at, u.trust_score,
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
    const result = await queryOne<{
      total_users: number;
      pending_verifications: number;
      open_reports: number;
      active_listings: number;
      students: number;
      mentors: number;
      employers: number;
      admins: number;
      new_today: number;
      new_7d: number;
      total_opportunities: number;
      ai_conversations: number;
      success_stories: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE verification_status = 'pending') AS pending_verifications,
        (SELECT COUNT(*)::int FROM reports WHERE status = 'pending') AS open_reports,
        (SELECT COUNT(*)::int FROM housing_listings WHERE status = 'active') AS active_listings,
        (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS students,
        (SELECT COUNT(*)::int FROM users WHERE role = 'mentor') AS mentors,
        (SELECT COUNT(*)::int FROM users WHERE role = 'employer') AS employers,
        (SELECT COUNT(*)::int FROM users WHERE role = 'admin') AS admins,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= CURRENT_DATE) AS new_today,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS new_7d,
        (SELECT COUNT(*)::int FROM opportunities) AS total_opportunities,
        (SELECT COUNT(*)::int FROM ai_conversations) AS ai_conversations,
        (SELECT COUNT(*)::int FROM success_stories) AS success_stories
    `);
    const zero = {
      total_users: 0, pending_verifications: 0, open_reports: 0, active_listings: 0,
      students: 0, mentors: 0, employers: 0, admins: 0, new_today: 0, new_7d: 0,
      total_opportunities: 0, ai_conversations: 0, success_stories: 0,
    };
    res.json({ stats: result ?? zero });
  } catch (err) {
    next(err);
  }
});

// Admin: daily signups over the last N days (zero-filled). Must be before /:id.
usersRouter.get("/summary/signups", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const days = clampDays(req.query.days);
    const rows = await query<{ day: string; count: number }>(
      `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
         FROM users
        WHERE created_at >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
        GROUP BY 1
        ORDER BY 1`,
      [days],
    );
    res.json({ days, series: buildDailySeries(rows, days) });
  } catch (err) {
    next(err);
  }
});

// Public profile of another user.
//
// Was unauthenticated and returned the full row. Anyone on the internet could
// turn a UUID into a legal name plus country of origin plus country of
// residence — and UUIDs are not a secret: they are handed out by the public
// mentor directory and the public jobs feed. On a platform for immigrants that
// tuple is identifying and targetable, so:
//   - it now requires a session,
//   - country_of_origin is withheld unless that user chose to share it,
//   - verification_status collapses to a boolean, since the raw value
//     distinguishes "rejected" (i.e. suspended) and that is nobody else's business.
usersRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const row = await queryOne<{
      id: string; full_name: string; avatar_url: string | null; role: string;
      country_of_origin: string | null; country_of_residence: string | null;
      bio: string | null; trust_score: number; verification_status: string;
      share_country_of_origin: boolean;
    }>(
      `SELECT id, full_name, avatar_url, role, country_of_origin, country_of_residence,
              bio, trust_score, verification_status, share_country_of_origin
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "User not found" });

    const isSelf = row.id === req.user!.sub;
    const privileged = isSelf || isAdmin(req.user!.role);

    res.json({
      user: {
        id: row.id,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        role: row.role,
        bio: row.bio,
        trust_score: row.trust_score,
        country_of_residence: row.country_of_residence,
        is_verified: row.verification_status === "verified",
        ...(privileged || row.share_country_of_origin
          ? { country_of_origin: row.country_of_origin }
          : {}),
        ...(privileged ? { verification_status: row.verification_status } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
});

// full_name/email are VARCHAR(255) in Postgres; without this cap an oversized
// value fell through to a raw driver error ("value too long for type
// character varying(255)") that the generic error handler surfaced as an
// opaque 500, instead of a clean, actionable 400.
const updateMeSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  // Opt-in disclosure of country_of_origin. Off by default; see GET /users/:id.
  share_country_of_origin: z.boolean().optional(),
  bio: z.string().max(2000).optional(),
  country_of_residence: z.string().max(100).optional(),
  avatar_url: z.string().max(2000).optional(),
  preferred_language: z.string().max(10).optional(),
});

usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    updateMeSchema.parse(req.body);
    const allowed = ["full_name", "bio", "country_of_residence", "avatar_url", "preferred_language", "share_country_of_origin"];
    const safe = pickAllowed(req.body, allowed);
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

const mentorProfileSchema = z.object({
  expertise_areas: z.array(z.string().max(80)).max(20).optional(),
  languages_spoken: z.array(z.string().max(50)).max(20).optional(),
  years_abroad: z.number().int().min(0).max(80).optional(),
  universities_attended: z.array(z.string().max(200)).max(20).optional(),
  available_for_mentoring: z.boolean().optional(),
});

usersRouter.get("/me/mentor-profile", requireAuth, requireRole("mentor", "admin"), async (req, res, next) => {
  try {
    const profile = await queryOne(
      `SELECT * FROM mentor_profiles WHERE user_id = $1`,
      [req.user!.sub]
    );
    res.json({ profile });
  } catch (err) { next(err); }
});

// Self-service mentor profile edit. mentor_profiles is what the public
// mentor directory and admin verification queue both read from, so without
// this a mentor has no way to ever fill in their own listing.
usersRouter.patch("/me/mentor-profile", requireAuth, requireRole("mentor", "admin"), async (req, res, next) => {
  try {
    const b = mentorProfileSchema.parse(req.body);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(b)) {
      if (v === undefined) continue;
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (!fields.length) return res.json({ ok: true });

    values.push(req.user!.sub);
    const profile = await queryOne(
      `INSERT INTO mentor_profiles (user_id) VALUES ($${i})
       ON CONFLICT (user_id) DO UPDATE SET ${fields.join(", ")}
       RETURNING *`,
      values
    );
    res.json({ profile });
  } catch (err) { next(err); }
});

// Self-service account deletion. A few relations don't cascade (moderation
// reports/alerts, and mentor_profiles.verified_by if this user is an admin
// who verified someone) — handled explicitly so the delete can't fail with
// a raw FK violation partway through.
usersRouter.delete("/me", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user!.sub;
    await query(`DELETE FROM reports WHERE reporter_id = $1`, [uid]);
    await query(`UPDATE reports SET resolved_by = NULL WHERE resolved_by = $1`, [uid]);
    await query(`DELETE FROM scam_alerts WHERE reported_by = $1`, [uid]);
    await query(`UPDATE mentor_profiles SET verified_by = NULL WHERE verified_by = $1`, [uid]);

    const deleted = await queryOne<{ firebase_uid: string }>(
      `DELETE FROM users WHERE id = $1 RETURNING firebase_uid`,
      [uid]
    );
    if (!deleted) return res.status(404).json({ error: "User not found" });

    clearUserCache(deleted.firebase_uid);
    try {
      await adminAuth.deleteUser(deleted.firebase_uid);
    } catch {
      // Postgres row is already gone (the part that gates every route); a
      // stray Firebase account with no app data is harmless.
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

usersRouter.post("/:id/verify", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [req.params.id]);
    await recordAudit({ adminId: req.user!.sub, action: "user.verify", targetType: "user", targetId: String(req.params.id) });
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
    if (status === "rejected") {
      // "Suspend" is presented to admins as blocking a user, but a Firebase ID
      // token is a stateless JWT — flipping this flag alone does nothing to a
      // session already in the user's hands. Revoking forces re-auth, and
      // combined with requireAuth's checkRevoked=true, their very next request
      // (and any open WebSocket) fails immediately.
      const target = await queryOne<{ firebase_uid: string }>(`SELECT firebase_uid FROM users WHERE id = $1`, [req.params.id]);
      if (target) {
        try { await adminAuth.revokeRefreshTokens(target.firebase_uid); clearUserCache(target.firebase_uid); } catch { /* best-effort */ }
      }
    }
    await recordAudit({
      adminId: req.user!.sub,
      action: "user.status",
      targetType: "user",
      targetId: String(req.params.id),
      metadata: { status },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Mentor availability (GB-08) ─────────────────────────────────────────────
// Before this there was no availability model at all — only a single
// available_for_mentoring boolean — so "book a mentor" meant "insert any time
// you like into their calendar".
//
// Windows are recurring weekly and declared in the mentor's own timezone;
// weekday follows Postgres EXTRACT(DOW), 0 = Sunday.

const availabilitySchema = z.object({
  timezone: z.string().min(1).max(100),
  windows: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "start_time must be HH:MM (24h)"),
        end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "end_time must be HH:MM (24h)"),
      }),
    )
    .max(50),
});

/** A mentor's published windows. Students need this to pick a slot at all. */
usersRouter.get("/mentors/:id/availability", requireAuth, async (req, res, next) => {
  try {
    const mentor = await queryOne<{ timezone: string }>(
      `SELECT COALESCE(mp.timezone, 'UTC') AS timezone
         FROM users u JOIN mentor_profiles mp ON mp.user_id = u.id
        WHERE u.id = $1 AND u.role = 'mentor' AND u.verification_status = 'verified'`,
      [req.params.id],
    );
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const windows = await query(
      `SELECT weekday, to_char(start_time, 'HH24:MI') AS start_time,
              to_char(end_time, 'HH24:MI') AS end_time
         FROM mentor_availability WHERE mentor_id = $1
        ORDER BY weekday, start_time`,
      [req.params.id],
    );
    res.json({
      timezone: mentor.timezone,
      windows,
      // An empty schedule means "no declared hours", which the booking endpoint
      // treats as open rather than closed. Say so, so the UI can too.
      unrestricted: windows.length === 0,
    });
  } catch (err) { next(err); }
});

/** Replace the caller's own availability. */
usersRouter.put("/me/availability", requireAuth, requireRole("mentor"), async (req, res, next) => {
  try {
    const b = availabilitySchema.parse(req.body);
    for (const w of b.windows) {
      if (w.end_time <= w.start_time) {
        return res.status(400).json({ error: `A window must end after it starts (${w.start_time}–${w.end_time}).` });
      }
    }

    await query(`UPDATE mentor_profiles SET timezone = $2 WHERE user_id = $1`, [req.user!.sub, b.timezone]);
    // Replace wholesale inside one statement pair so a partial write cannot
    // leave a mentor with half a schedule published.
    await query(`DELETE FROM mentor_availability WHERE mentor_id = $1`, [req.user!.sub]);
    for (const w of b.windows) {
      await query(
        `INSERT INTO mentor_availability (mentor_id, weekday, start_time, end_time)
         VALUES ($1,$2,$3,$4) ON CONFLICT (mentor_id, weekday, start_time) DO NOTHING`,
        [req.user!.sub, w.weekday, w.start_time, w.end_time],
      );
    }

    const windows = await query(
      `SELECT weekday, to_char(start_time, 'HH24:MI') AS start_time,
              to_char(end_time, 'HH24:MI') AS end_time
         FROM mentor_availability WHERE mentor_id = $1 ORDER BY weekday, start_time`,
      [req.user!.sub],
    );
    res.json({ timezone: b.timezone, windows });
  } catch (err) { next(err); }
});
