import "dotenv/config";
import { pool } from "./db";

async function main() {
  const r = await pool.query(
    `SELECT COUNT(*)::int as total, COUNT(embedding)::int as with_embedding FROM knowledge_base WHERE is_active = true`
  );
  console.log(`Knowledge base: ${r.rows[0].total} entries, ${r.rows[0].with_embedding} with embeddings`);
  console.log(r.rows[0].with_embedding === r.rows[0].total ? "ALL GOOD" : "MISSING SOME");
  await pool.end();
}

main();
