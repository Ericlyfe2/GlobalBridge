import "dotenv/config";
import { pool } from "./db";

const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

async function main() {
  const { rows } = await pool.query(
    `SELECT id, title, content FROM knowledge_base WHERE is_active = true AND embedding IS NULL LIMIT 1`
  );
  if (rows.length === 0) {
    console.log("All entries have embeddings!");
    await pool.end();
    return;
  }
  const row = rows[0];
  console.log(`Embedding: ${row.title}`);
  console.log("Waiting 15s...");
  await new Promise((r) => setTimeout(r, 15000));

  const resp = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: `${row.title}\n${row.content}` }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.log(`API error (${resp.status}): ${text.slice(0, 200)}`);
    await pool.end();
    return;
  }
  const data = (await resp.json()) as { data: { embedding: number[] }[] };
  await pool.query(
    `UPDATE knowledge_base SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(data.data[0].embedding), row.id]
  );
  console.log("Done! One entry embedded.");
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
