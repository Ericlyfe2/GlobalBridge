import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "REDACTED_CONNECTION_STRING",
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  try {
    const sql = readFileSync(resolve(__dirname, "../db/migration_rag.sql"), "utf8");
    console.log("Applying RAG migration...");
    await pool.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration error:", (err as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
