import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { redis } from "../db";
import { requireAuth } from "../middleware/auth";

export const ragRouter = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const EMBED_MODEL = "text-embedding-3-small";
const RAG_CACHE_TTL = 300; // 5 minutes

async function generateEmbedding(text: string): Promise<number[]> {
  const https = await import("node:https");
  const url = new URL(`${OPENAI_BASE_URL}/embeddings`);
  const body = JSON.stringify({ model: EMBED_MODEL, input: text });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`Embedding API error (${res.statusCode}): ${data.slice(0, 200)}`));
              return;
            }
            const parsed = JSON.parse(data) as { data: { embedding: number[] }[] };
            resolve(parsed.data[0].embedding);
          } catch (e) {
            reject(new Error(`Failed to parse embedding response: ${(e as Error).message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Embedding API timeout")); });
    req.write(body);
    req.end();
  });
}

// Check embedding cache, or generate and cache
async function getEmbedding(text: string): Promise<number[]> {
  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256").update(text).digest("hex");

  // Check Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(`embed:${hash}`);
      if (cached) return JSON.parse(cached) as number[];
    } catch { /* ignore redis errors */ }
  }

  // Check Postgres cache
  const cached = await queryOne<{ embedding: string }>(
    `SELECT embedding::text FROM embedding_cache WHERE input_hash = $1`,
    [hash],
  );
  if (cached?.embedding) {
    const emb = JSON.parse(cached.embedding) as number[];
    // Warm Redis
    if (redis) redis.setex(`embed:${hash}`, RAG_CACHE_TTL, cached.embedding).catch(() => {});
    return emb;
  }

  const embedding = await generateEmbedding(text);

  // Store in Postgres cache
  await query(
    `INSERT INTO embedding_cache (input_hash, input_text, embedding) VALUES ($1, $2, $3::vector)
     ON CONFLICT (input_hash) DO NOTHING`,
    [hash, text, JSON.stringify(embedding)],
  ).catch(() => {});

  // Warm Redis
  if (redis) redis.setex(`embed:${hash}`, RAG_CACHE_TTL, JSON.stringify(embedding)).catch(() => {});

  return embedding;
}

const searchSchema = z.object({
  query: z.string().min(1).max(2000),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(5),
  min_score: z.coerce.number().min(0).max(1).default(0.5),
});

ragRouter.post("/search", async (req, res, next) => {
  try {
    const { query: queryText, category, limit, min_score } = searchSchema.parse(req.body);

    if (!OPENAI_API_KEY) {
      // Fallback to text search when no OpenAI key
      const rows = await query(
        `SELECT id, title, content, category, subcategory, tags, source_url,
                 ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $1)) AS score
         FROM knowledge_base
         WHERE is_active = true
           AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
           ${category ? "AND category = $2" : ""}
         ORDER BY score DESC
         LIMIT ${category ? "$3" : "$2"}`,
        category ? [queryText, category, limit] : [queryText, limit],
      );
      return res.json({ results: rows, method: "text" });
    }

    let embedding: number[];
    try {
      embedding = await getEmbedding(queryText);
    } catch (embedErr) {
      console.warn("Embedding failed, falling back to text search:", (embedErr as Error).message);
      const rows = await query(
        `SELECT id, title, content, category, subcategory, tags, source_url,
                ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $1)) AS score
         FROM knowledge_base
         WHERE is_active = true
           AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
           ${category ? "AND category = $2" : ""}
         ORDER BY score DESC
         LIMIT ${category ? "$3" : "$2"}`,
        category ? [queryText, category, limit] : [queryText, limit],
      );
      return res.json({ results: rows, method: "text_fallback" });
    }

    const catFilter = category ? `AND category = $3` : "";
    const vecStr = "[" + embedding.join(",") + "]";
    const rows = await query<{
      id: string; title: string; content: string; category: string;
      subcategory: string | null; tags: string[]; source_url: string | null;
      similarity: number;
    }>(
      `SELECT id, title, content, category, subcategory, tags, source_url,
              1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_base
       WHERE is_active = true
         AND 1 - (embedding <=> $1::vector) >= $2
         ${catFilter}
       ORDER BY similarity DESC
       LIMIT $4`,
      category
        ? [vecStr, min_score, category, limit]
        : [vecStr, min_score, limit],
    );

    res.json({ results: rows, method: "vector" });
  } catch (err) {
    console.error("RAG search error:", (err as Error).message);
    next(err);
  }
});

ragRouter.post("/embed", async (req, res, next) => {
  try {
    const { text } = z.object({ text: z.string().min(1).max(8000) }).parse(req.body);
    if (!OPENAI_API_KEY) {
      return res.status(400).json({ error: "OPENAI_API_KEY not configured" });
    }
    const embedding = await getEmbedding(text);
    res.json({ embedding, dimensions: embedding.length });
  } catch (err) {
    next(err);
  }
});

ragRouter.post("/reembed-all", requireAuth, async (req, res, next) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(400).json({ error: "OPENAI_API_KEY not configured" });
    }
    const entries = await query<{ id: string; title: string; content: string }>(
      `SELECT id, title, content FROM knowledge_base WHERE is_active = true AND (embedding IS NULL OR updated_at > created_at)`,
    );
    let done = 0;
    for (const entry of entries) {
      const text = `${entry.title}\n${entry.content}`;
      const embedding = await generateEmbedding(text);
      await query(
        `UPDATE knowledge_base SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(embedding), entry.id],
      );
      done++;
    }
    res.json({ reembedded: done, total: entries.length });
  } catch (err) {
    next(err);
  }
});

ragRouter.get("/stats", requireAuth, async (req, res, next) => {
  try {
    const [kbCount, cacheCount] = await Promise.all([
      queryOne<{ count: string }>(`SELECT COUNT(*) FROM knowledge_base WHERE is_active = true`),
      queryOne<{ count: string }>(`SELECT COUNT(*) FROM embedding_cache`),
    ]);
    const categories = await query<{ category: string; count: string }>(
      `SELECT category, COUNT(*) FROM knowledge_base WHERE is_active = true GROUP BY category ORDER BY count DESC`,
    );
    res.json({
      knowledgeEntries: parseInt(kbCount?.count ?? "0", 10),
      cachedEmbeddings: parseInt(cacheCount?.count ?? "0", 10),
      categories,
    });
  } catch (err) {
    next(err);
  }
});
