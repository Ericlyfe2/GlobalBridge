import { query, queryOne, redis } from "../db";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const EMBED_MODEL = "text-embedding-3-small";
const EMBED_CACHE_TTL = 300; // 5 minutes (Redis)

export async function generateEmbedding(text: string): Promise<number[]> {
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
export async function getEmbedding(text: string): Promise<number[]> {
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
    if (redis) redis.setex(`embed:${hash}`, EMBED_CACHE_TTL, cached.embedding).catch(() => {});
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
  if (redis) redis.setex(`embed:${hash}`, EMBED_CACHE_TTL, JSON.stringify(embedding)).catch(() => {});

  return embedding;
}
