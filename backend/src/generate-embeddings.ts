import "dotenv/config";
import { pool } from "./db";

const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

async function generateEmbedding(text: string): Promise<number[]> {
  const resp = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Embedding API error (${resp.status}): ${err.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedWithRetry(text: string, maxRetries = 5): Promise<number[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateEmbedding(text);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("429")) {
        const wait = Math.min(1000 * Math.pow(2, attempt), 30000);
        process.stdout.write(` (429, waiting ${wait}ms) `);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

async function main() {
  if (!API_KEY) {
    console.error("OPENAI_API_KEY is required");
    process.exit(1);
  }

  console.log(`Using API: ${BASE_URL}`);
  console.log("Fetching entries without embeddings...");

  const entries = await pool.query(
    `SELECT id, title, content FROM knowledge_base WHERE is_active = true AND (embedding IS NULL) ORDER BY created_at ASC`
  );

  console.log(`Found ${entries.rows.length} entries to embed.`);

  let done = 0;
  let errors = 0;

  for (const row of entries.rows) {
    const text = `${row.title}\n${row.content}`;
    try {
      process.stdout.write(`[${done + 1}/${entries.rows.length}] ${row.title.slice(0, 50)}... `);
      const embedding = await embedWithRetry(text);
      await pool.query(
        `UPDATE knowledge_base SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(embedding), row.id]
      );
      console.log("OK");
      done++;
    } catch (err) {
      console.error(`ERROR: ${(err as Error).message}`);
      errors++;
    }

    await sleep(500);

    if ((done + errors) % 5 === 0) {
      console.log(`  ... ${done}/${entries.rows.length} done, ${errors} errors`);
    }
  }

  console.log(`\nComplete: ${done} embedded, ${errors} errors`);
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
