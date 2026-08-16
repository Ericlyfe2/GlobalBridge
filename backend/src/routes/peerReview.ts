import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { sanitizeAllStrings } from "../lib/sanitize";

export const peerReviewRouter = Router();

const ADJECTIVES = ["Orange", "Green", "Blue", "Purple", "Amber", "Silver", "Quiet", "Bright"];
const ANIMALS = ["Fox", "Leaf", "River", "Dove", "Wolf", "Owl", "Hawk", "Bear"];
const COLORS = ["bg-amber-500", "bg-leaf-500", "bg-sky-500", "bg-clay-500"];

function randomAlias(): { alias: string; color: string } {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return { alias: `${adj}${animal}-${num}`, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
}

// Must match the frontend rubric exactly — weights sum to 100.
const RUBRIC_WEIGHTS: Record<string, number> = {
  hook: 15, arc: 20, ev: 20, fit: 20, voice: 15, close: 10,
};
const REVIEW_COST = 3; // credits spent per submission

async function creditsFor(userId: string): Promise<number> {
  const reviewsGiven = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM peer_review_reviews WHERE reviewer_id = $1`, [userId]
  );
  const submissionsMade = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM peer_review_submissions WHERE user_id = $1`, [userId]
  );
  return (reviewsGiven?.n ?? 0) - REVIEW_COST * (submissionsMade?.n ?? 0);
}

// Submissions awaiting more reviews, excluding the caller's own and ones
// they've already reviewed.
peerReviewRouter.get("/queue", requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT s.id, s.alias, s.alias_color, s.doc_type, s.target,
              s.body, s.reviews_needed, s.created_at,
              COUNT(r.id)::int AS reviews_count
       FROM peer_review_submissions s
       LEFT JOIN peer_review_reviews r ON r.submission_id = s.id
       WHERE s.user_id != $1
         AND NOT EXISTS (SELECT 1 FROM peer_review_reviews r2 WHERE r2.submission_id = s.id AND r2.reviewer_id = $1)
       GROUP BY s.id
       HAVING COUNT(r.id) < s.reviews_needed
       ORDER BY s.created_at ASC
       LIMIT 50`,
      [req.user!.sub]
    );
    res.json({ queue: rows });
  } catch (err) { next(err); }
});

peerReviewRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const submissions = await query(
      `SELECT s.id, s.doc_type, s.target, s.reviews_needed, s.created_at,
              COUNT(r.id)::int AS reviews_count,
              COALESCE(AVG(r.overall_score), NULL) AS avg_score
       FROM peer_review_submissions s
       LEFT JOIN peer_review_reviews r ON r.submission_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [req.user!.sub]
    );
    const credits = await creditsFor(req.user!.sub);
    res.json({ submissions, credits, review_cost: REVIEW_COST });
  } catch (err) { next(err); }
});

const submitSchema = z.object({
  doc_type: z.string().min(1).max(80),
  target: z.string().min(1).max(200),
  focus_question: z.string().max(500).optional(),
  body: z.string().min(50).max(20000),
});

peerReviewRouter.post("/submissions", requireAuth, async (req, res, next) => {
  try {
    const submissionsMade = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM peer_review_submissions WHERE user_id = $1`, [req.user!.sub]
    );
    const credits = await creditsFor(req.user!.sub);
    // First submission is free — otherwise nobody could ever submit, since
    // there'd be nothing in the queue yet to earn credits by reviewing.
    if ((submissionsMade?.n ?? 0) > 0 && credits < REVIEW_COST) {
      return res.status(403).json({ error: `You need ${REVIEW_COST} review credits to submit again. Review ${REVIEW_COST - Math.max(credits, 0)} more draft(s) first.`, credits });
    }
    const b = sanitizeAllStrings(submitSchema.parse(req.body));
    const { alias, color } = randomAlias();
    const submission = await queryOne(
      `INSERT INTO peer_review_submissions (user_id, alias, alias_color, doc_type, target, focus_question, body)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.sub, alias, color, b.doc_type, b.target, b.focus_question ?? null, b.body]
    );
    res.status(201).json({ submission });
  } catch (err) { next(err); }
});

const reviewSchema = z.object({
  rubric_scores: z.record(z.string(), z.number().min(0).max(100)),
  comments: z.string().max(3000).optional(),
});

peerReviewRouter.post("/submissions/:id/reviews", requireAuth, async (req, res, next) => {
  try {
    const submission = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM peer_review_submissions WHERE id = $1`,
      [req.params.id]
    );
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.user_id === req.user!.sub) {
      return res.status(400).json({ error: "You can't review your own submission" });
    }

    const b = sanitizeAllStrings(reviewSchema.parse(req.body));
    let overall = 0;
    let weightSum = 0;
    for (const [key, weight] of Object.entries(RUBRIC_WEIGHTS)) {
      const score = b.rubric_scores[key];
      if (typeof score !== "number") continue;
      overall += score * weight;
      weightSum += weight;
    }
    const overallScore = weightSum > 0 ? Math.round(overall / weightSum) : 0;

    const { alias, color } = randomAlias();
    const review = await queryOne(
      `INSERT INTO peer_review_reviews (submission_id, reviewer_id, alias, alias_color, rubric_scores, overall_score, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, req.user!.sub, alias, color, JSON.stringify(b.rubric_scores), overallScore, b.comments ?? null]
    );
    res.status(201).json({ review });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return res.status(409).json({ error: "You already reviewed this submission" });
    }
    next(err);
  }
});
