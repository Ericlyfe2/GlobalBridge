import { Router } from "express";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { sanitizeObject } from "../lib/sanitize";

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
      query<{ id: string; student_name: string | null; slot_date: string; slot_time: string; duration_min: number; goal: string | null; status: string }>(
        `SELECT b.id, u.full_name AS student_name, b.slot_date, b.slot_time, b.duration_min, b.goal, b.status
         FROM mentor_bookings b JOIN users u ON u.id = b.student_id
         WHERE b.mentor_id = $1 AND b.slot_date >= CURRENT_DATE AND b.status <> 'cancelled'
         ORDER BY b.slot_date ASC, b.slot_time ASC LIMIT 6`, [uid]),
      query<{ id: string; student_name: string | null; slot_date: string; slot_time: string; goal: string | null }>(
        `SELECT b.id, u.full_name AS student_name, b.slot_date, b.slot_time, b.goal
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
      `SELECT u.id, u.full_name, u.avatar_url, u.country_of_residence, u.country_of_origin,
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
      if (status === "suspended") conditions.push(`u.verification_status = 'rejected'`);
      else conditions.push(`u.verification_status = $${idx++}`); params.push(status);
    }
    if (search) { conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params);
    const total = countResult?.total ?? 0;

    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.verification_status,
              u.country_of_residence, u.created_at, u.trust_score, u.email_verified,
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

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await queryOne(
      `SELECT id, full_name, avatar_url, role, country_of_origin, country_of_residence,
              bio, trust_score, verification_status
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const allowed = ["full_name", "bio", "country_of_residence", "avatar_url", "preferred_language"];
    const safe = sanitizeObject(req.body, allowed);
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

usersRouter.post("/:id/verify", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [req.params.id]);
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
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
