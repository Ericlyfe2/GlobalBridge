import "dotenv/config";
import { pool } from "./db";

async function main() {
  try {
    // Test 1: Check extensions
    const ext = await pool.query(
      `SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector','pg_trgm')`
    );
    console.log("Extensions:", JSON.stringify(ext.rows));

    // Test 2: Check a vector column
    const col = await pool.query(
      `SELECT pg_typeof(embedding) as typ, COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL GROUP BY pg_typeof(embedding)`
    );
    console.log("Column type:", JSON.stringify(col.rows));

    // Test 3: Simple vector query without cast
    const embedding = Array(1536).fill(0.01);
    const vecStr = "[" + embedding.join(",") + "]";
    
    console.log("Vector string preview:", vecStr.slice(0, 100) + "...");
    
    const result = await pool.query(
      `SELECT title FROM knowledge_base WHERE is_active = true LIMIT 1`
    );
    console.log("Simple query OK:", result.rows[0]?.title);

    // Test 4: Try vector distance query
    try {
      const dist = await pool.query(
        `SELECT title, embedding <=> $1 AS dist FROM knowledge_base LIMIT 3`,
        [vecStr]
      );
      console.log("Distance query OK:", JSON.stringify(dist.rows.map(r => r.title)));
    } catch (e) {
      console.log("Distance query failed:", (e as Error).message);
    }
    
  } catch (e) {
    console.log("Main error:", (e as Error).message);
  }
  await pool.end();
}

main();
