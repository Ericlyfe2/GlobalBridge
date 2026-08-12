import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { sanitizeAllStrings } from "../lib/sanitize";

export const safeSpaceRouter = Router();

const TOPICS = ["mental-health", "discrimination", "legal", "burnout", "relationships"] as const;

const ADJECTIVES = ["Purple", "Blue", "Green", "Amber", "Quiet", "Bright", "Silent", "Golden", "Silver", "Wild"];
const ANIMALS = ["Bird", "Fox", "Leaf", "River", "Dove", "Wolf", "Owl", "Hawk", "Deer", "Bear"];
const COLORS = ["bg-clay-500", "bg-leaf-500", "bg-sky-500", "bg-amber-500"];

/**
 * A fresh alias per post/reply — even the same account gets a different one
 * each time, so someone's history can't be strung together from aliases alone.
 */
function randomAlias(): { alias: string; color: string } {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return { alias: `${adj}${animal}-${num}`, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
}

// Every SELECT below deliberately omits user_id — the API never exposes who posted.
const POST_COLUMNS = `id, topic, alias, alias_color, title, body, upvotes, support_count, flagged, created_at`;

safeSpaceRouter.get("/posts", requireAuth, async (req, res, next) => {
  try {
    const { topic } = z.object({ topic: z.enum(TOPICS).optional() }).parse(req.query);
    const posts = topic
      ? await query(`SELECT ${POST_COLUMNS} FROM safe_space_posts WHERE topic = $1 ORDER BY created_at DESC LIMIT 100`, [topic])
      : await query(`SELECT ${POST_COLUMNS} FROM safe_space_posts ORDER BY created_at DESC LIMIT 100`);
    res.json({ posts });
  } catch (err) { next(err); }
});

const postSchema = z.object({
  topic: z.enum(TOPICS),
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(5000),
});

safeSpaceRouter.post("/posts", requireAuth, async (req, res, next) => {
  try {
    const b = sanitizeAllStrings(postSchema.parse(req.body));
    const { alias, color } = randomAlias();
    const post = await queryOne(
      `INSERT INTO safe_space_posts (user_id, topic, alias, alias_color, title, body)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${POST_COLUMNS}`,
      [req.user!.sub, b.topic, alias, color, b.title, b.body]
    );
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

safeSpaceRouter.post("/posts/:id/upvote", requireAuth, async (req, res, next) => {
  try {
    const inserted = await queryOne(
      `INSERT INTO safe_space_upvotes (post_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING RETURNING post_id`,
      [req.params.id, req.user!.sub]
    );
    if (inserted) {
      await query(`UPDATE safe_space_posts SET upvotes = upvotes + 1 WHERE id = $1`, [req.params.id]);
    }
    const post = await queryOne<{ upvotes: number }>(`SELECT upvotes FROM safe_space_posts WHERE id = $1`, [req.params.id]);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ upvotes: post.upvotes, already: !inserted });
  } catch (err) { next(err); }
});

safeSpaceRouter.post("/posts/:id/support", requireAuth, async (req, res, next) => {
  try {
    const inserted = await queryOne(
      `INSERT INTO safe_space_support (post_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING RETURNING post_id`,
      [req.params.id, req.user!.sub]
    );
    if (inserted) {
      await query(`UPDATE safe_space_posts SET support_count = support_count + 1 WHERE id = $1`, [req.params.id]);
    }
    const post = await queryOne<{ support_count: number }>(`SELECT support_count FROM safe_space_posts WHERE id = $1`, [req.params.id]);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ support_count: post.support_count, already: !inserted });
  } catch (err) { next(err); }
});

const REPLY_COLUMNS = `id, post_id, alias, alias_color, body, created_at`;

safeSpaceRouter.get("/posts/:id/replies", requireAuth, async (req, res, next) => {
  try {
    const replies = await query(
      `SELECT ${REPLY_COLUMNS} FROM safe_space_replies WHERE post_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ replies });
  } catch (err) { next(err); }
});

const replySchema = z.object({ body: z.string().min(2).max(2000) });

safeSpaceRouter.post("/posts/:id/replies", requireAuth, async (req, res, next) => {
  try {
    const b = sanitizeAllStrings(replySchema.parse(req.body));
    const { alias, color } = randomAlias();
    const reply = await queryOne(
      `INSERT INTO safe_space_replies (post_id, user_id, alias, alias_color, body)
       VALUES ($1,$2,$3,$4,$5) RETURNING ${REPLY_COLUMNS}`,
      [req.params.id, req.user!.sub, alias, color, b.body]
    );
    if (!reply) return res.status(404).json({ error: "Post not found" });
    res.status(201).json({ reply });
  } catch (err) { next(err); }
});
