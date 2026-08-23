import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { escapeLike } from "../lib/sanitize";

export const forumsRouter = Router();

forumsRouter.get("/categories", async (_req, res, next) => {
  try {
    const cats = await query(`SELECT * FROM forum_categories ORDER BY name`);
    res.json({ categories: cats });
  } catch (err) { next(err); }
});

forumsRouter.get("/posts", async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filters: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (category) { filters.push(`fc.slug = $${i++}`); values.push(category); }
    if (search) { filters.push(`fp.title ILIKE $${i++}`); values.push(`%${escapeLike(String(search))}%`); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    res.set("Cache-Control", "public, max-age=30");
    const posts = await query(
      `SELECT fp.*, fc.name AS category_name, fc.slug AS category_slug,
              u.full_name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role
       FROM forum_posts fp
       JOIN forum_categories fc ON fc.id = fp.category_id
       JOIN users u ON u.id = fp.author_id
       ${where}
       ORDER BY fp.created_at DESC
       LIMIT 50`,
      values
    );
    res.json({ posts });
  } catch (err) { next(err); }
});

forumsRouter.get("/posts/:id", async (req, res, next) => {
  try {
    const post = await queryOne(
      `SELECT fp.*, u.full_name AS author_name, u.avatar_url AS author_avatar
       FROM forum_posts fp JOIN users u ON u.id = fp.author_id WHERE fp.id = $1`,
      [req.params.id]
    );
    if (!post) return res.status(404).json({ error: "Post not found" });
    const replies = await query(
      `SELECT fr.*, u.full_name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role,
              u.verification_status AS author_verified
       FROM forum_replies fr JOIN users u ON u.id = fr.author_id
       WHERE fr.post_id = $1 ORDER BY fr.is_accepted_answer DESC, fr.upvotes DESC, fr.created_at ASC`,
      [req.params.id]
    );
    res.json({ post, replies });
  } catch (err) { next(err); }
});

const postSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().min(5).max(200),
  body: z.string().min(20).max(10000),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

forumsRouter.post("/posts", requireAuth, async (req, res, next) => {
  try {
    const safe = postSchema.parse(req.body);
    const post = await queryOne(
      `INSERT INTO forum_posts (category_id, author_id, title, body, tags)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [safe.category_id, req.user!.sub, safe.title, safe.body, safe.tags]
    );
    await query(`UPDATE forum_categories SET post_count = post_count + 1 WHERE id = $1`, [safe.category_id]);
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

forumsRouter.post("/posts/:id/replies", requireAuth, async (req, res, next) => {
  try {
    const safe = z.object({ body: z.string().min(2).max(5000) }).parse(req.body);
    const reply = await queryOne(
      `INSERT INTO forum_replies (post_id, author_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user!.sub, safe.body]
    );
    await query(`UPDATE forum_posts SET answer_count = answer_count + 1 WHERE id = $1`, [
      req.params.id,
    ]);
    res.status(201).json({ reply });
  } catch (err) { next(err); }
});

// ── Voting (GB-18) ──────────────────────────────────────────────────────────
// The up/down controls in the thread view rendered with hover states and no
// onClick, and no endpoint existed behind them. A control that looks
// interactive and does nothing is worse than no control.

const voteSchema = z.object({
  target_type: z.enum(["post", "reply"]),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

const VOTE_TABLE = { post: "forum_posts", reply: "forum_replies" } as const;

/**
 * Cast, change, or clear a vote.
 *
 * value 0 clears. The stored tally is recomputed from forum_votes rather than
 * incremented, so it cannot drift from the rows that justify it — which is how
 * the existing counters would have gone wrong under any retry or double-click.
 */
forumsRouter.post("/vote/:id", requireAuth, async (req, res, next) => {
  try {
    const b = voteSchema.parse(req.body);
    const table = VOTE_TABLE[b.target_type];

    const exists = await queryOne<{ id: string }>(
      `SELECT id FROM ${table} WHERE id = $1`, [req.params.id]
    );
    if (!exists) return res.status(404).json({ error: "Not found" });

    if (b.value === 0) {
      await query(
        `DELETE FROM forum_votes WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
        [req.user!.sub, b.target_type, req.params.id]
      );
    } else {
      // One row per voter per target: voting twice is idempotent, and flipping
      // direction replaces rather than stacks.
      await query(
        `INSERT INTO forum_votes (user_id, target_type, target_id, value)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET value = EXCLUDED.value`,
        [req.user!.sub, b.target_type, req.params.id, b.value]
      );
    }

    const tally = await queryOne<{ score: number }>(
      `UPDATE ${table} SET upvotes = COALESCE((
         SELECT SUM(value)::int FROM forum_votes
          WHERE target_type = $2 AND target_id = $1
       ), 0)
       WHERE id = $1 RETURNING upvotes AS score`,
      [req.params.id, b.target_type]
    );

    res.json({ score: tally?.score ?? 0, my_vote: b.value });
  } catch (err) { next(err); }
});

/** The caller's own votes in a thread, so the UI can show which way they voted. */
forumsRouter.get("/posts/:id/my-votes", requireAuth, async (req, res, next) => {
  try {
    const votes = await query<{ target_type: string; target_id: string; value: number }>(
      `SELECT v.target_type, v.target_id, v.value
         FROM forum_votes v
        WHERE v.user_id = $1
          AND (
            (v.target_type = 'post'  AND v.target_id = $2)
            OR (v.target_type = 'reply' AND v.target_id IN (SELECT id FROM forum_replies WHERE post_id = $2))
          )`,
      [req.user!.sub, req.params.id]
    );
    res.json({ votes });
  } catch (err) { next(err); }
});
