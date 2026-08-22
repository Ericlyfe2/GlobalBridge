import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";

export const libraryRouter = Router();

const TYPES = ["podcast", "video", "vlog"] as const;
const TOPICS = ["visa", "arrival", "academic", "career", "life"] as const;

const ITEM_COLUMNS = `li.id, li.title, li.type, li.topic, li.duration_min, li.origin, li.origin_flag,
  li.destination, li.dest_flag, li.media_url, li.plays_count, li.created_at,
  u.full_name AS creator_name, (u.verification_status = 'verified') AS creator_verified`;

libraryRouter.get("/items", async (_req, res, next) => {
  try {
    const items = await query(
      `SELECT ${ITEM_COLUMNS} FROM library_items li
       JOIN users u ON u.id = li.contributor_id
       ORDER BY li.created_at DESC LIMIT 100`
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json({ items });
  } catch (err) { next(err); }
});

const itemSchema = z.object({
  title: z.string().min(5).max(200),
  type: z.enum(TYPES),
  topic: z.enum(TOPICS),
  duration_min: z.number().int().min(1).max(600),
  origin: z.string().min(1).max(100),
  origin_flag: z.string().min(2).max(3),
  destination: z.string().min(1).max(100),
  dest_flag: z.string().min(2).max(3),
  media_url: z.string().url(),
});

// Only verified mentors can contribute — matches what the page tells students.
libraryRouter.post("/items", requireAuth, async (req, res, next) => {
  try {
    if (req.user!.role !== "mentor") {
      return res.status(403).json({ error: "Only mentors can contribute to the library" });
    }
    const contributor = await queryOne<{ verification_status: string }>(
      `SELECT verification_status FROM users WHERE id = $1`, [req.user!.sub]
    );
    if (contributor?.verification_status !== "verified") {
      return res.status(403).json({ error: "Verify your mentor profile before contributing" });
    }
    const b = itemSchema.parse(req.body);
    const row = await queryOne<{ id: string }>(
      `INSERT INTO library_items
        (contributor_id, title, type, topic, duration_min, origin, origin_flag, destination, dest_flag, media_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [req.user!.sub, b.title, b.type, b.topic, b.duration_min, b.origin, b.origin_flag, b.destination, b.dest_flag, b.media_url]
    );
    const item = await queryOne(
      `SELECT ${ITEM_COLUMNS} FROM library_items li JOIN users u ON u.id = li.contributor_id WHERE li.id = $1`,
      [row!.id]
    );
    res.status(201).json({ item });
  } catch (err) { next(err); }
});

libraryRouter.post("/items/:id/play", async (req, res, next) => {
  try {
    const row = await queryOne<{ plays_count: number }>(
      `UPDATE library_items SET plays_count = plays_count + 1 WHERE id = $1 RETURNING plays_count`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Item not found" });
    res.json({ plays_count: row.plays_count });
  } catch (err) { next(err); }
});
