import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";

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
    if (search) { filters.push(`fp.title ILIKE $${i++}`); values.push(`%${search}%`); }
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
    const b = postSchema.parse(req.body);
    const post = await queryOne(
      `INSERT INTO forum_posts (category_id, author_id, title, body, tags)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.category_id, req.user!.sub, b.title, b.body, b.tags]
    );
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

forumsRouter.post("/posts/:id/replies", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({ body: z.string().min(2).max(5000) }).parse(req.body);
    const reply = await queryOne(
      `INSERT INTO forum_replies (post_id, author_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user!.sub, body.body]
    );
    await query(`UPDATE forum_posts SET answer_count = answer_count + 1 WHERE id = $1`, [
      req.params.id,
    ]);
    res.status(201).json({ reply });
  } catch (err) { next(err); }
});
