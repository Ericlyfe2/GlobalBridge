import "dotenv/config";
import { pool } from "./db";
import { generateEmbedding } from "./lib/embeddings";

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
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required");
    process.exit(1);
  }

  console.log(`Using API: ${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}`);
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
