import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const knowledgeRouter = Router();

function embedUrl(apiKey: string, baseURL: string | undefined, input: string): Promise<number[]> {
  const url = `${baseURL || "https://api.openai.com/v1"}/embeddings`;
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input }),
  })
    .then((r) => r.json() as Promise<{ data: { embedding: number[] }[] }>)
    .then((d) => d.data[0].embedding);
}

const createSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  source_url: z.string().url().optional(),
});

knowledgeRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const apiKey = process.env.OPENAI_API_KEY;
    let embedding: number[] | null = null;
    if (apiKey) {
      const textForEmbed = `${body.title}\n${body.content}`;
      embedding = await embedUrl(apiKey, process.env.OPENAI_BASE_URL, textForEmbed);
    }
    const row = await queryOne(
      `INSERT INTO knowledge_base (title, content, category, subcategory, tags, metadata, source_url, embedding, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, title, category, created_at`,
      [
        body.title, body.content, body.category, body.subcategory ?? null,
        body.tags ?? [], JSON.stringify(body.metadata ?? {}), body.source_url ?? null,
        embedding ? JSON.stringify(embedding) : null, req.user!.sub,
      ],
    );
    res.status(201).json({ entry: row });
  } catch (err) {
    next(err);
  }
});

knowledgeRouter.get("/", async (req, res, next) => {
  try {
    const qSchema = z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    });
    const { category, search, limit, offset } = qSchema.parse(req.query);
    const filters: string[] = ["is_active = true"];
    const values: unknown[] = [];
    let i = 1;
    if (category) {
      filters.push(`category = $${i++}`);
      values.push(category);
    }
    if (search) {
      filters.push(`(title ILIKE $${i} OR content ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }
    const where = `WHERE ${filters.join(" AND ")}`;
    values.push(limit, offset);
    const rows = await query(
      `SELECT id, title, category, subcategory, tags, metadata, source_url, created_at, updated_at
       FROM knowledge_base ${where}
       ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      values,
    );
    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*) FROM knowledge_base ${where}`,
      values.slice(0, -2),
    );
    res.json({ entries: rows, total: parseInt(count, 10) });
  } catch (err) {
    next(err);
  }
});

knowledgeRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await queryOne(
      `SELECT id, title, content, category, subcategory, tags, metadata, source_url, is_active, created_by, created_at, updated_at
       FROM knowledge_base WHERE id = $1`,
      [req.params.id],
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ entry: row });
  } catch (err) {
    next(err);
  }
});

const updateSchema = createSchema.partial();

knowledgeRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const existing = await queryOne<{ id: string; title: string; content: string }>(
      `SELECT id, title, content FROM knowledge_base WHERE id = $1`, [req.params.id],
    );
    if (!existing) return res.status(404).json({ error: "Not found" });

    const title = body.title ?? existing.title;
    const content = body.content ?? existing.content;

    let embedding: number[] | null = null;
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && (body.title || body.content)) {
      embedding = await embedUrl(apiKey, process.env.OPENAI_BASE_URL, `${title}\n${content}`);
    }

    const row = await queryOne(
      `UPDATE knowledge_base SET
        title = COALESCE($1, title), content = COALESCE($2, content),
        category = COALESCE($3, category), subcategory = COALESCE($4, subcategory),
        tags = COALESCE($5, tags), metadata = COALESCE($6, metadata),
        source_url = COALESCE($7, source_url),
        embedding = COALESCE($8, embedding),
        updated_at = NOW()
       WHERE id = $9 RETURNING id, title, category, updated_at`,
      [
        body.title ?? null, body.content ?? null, body.category ?? null,
        body.subcategory ?? null, body.tags ?? null,
        body.metadata ? JSON.stringify(body.metadata) : null,
        body.source_url ?? null, embedding ? JSON.stringify(embedding) : null,
        req.params.id,
      ],
    );
    res.json({ entry: row });
  } catch (err) {
    next(err);
  }
});

knowledgeRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await query(`DELETE FROM knowledge_base WHERE id = $1`, [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});
