import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS library_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      topic TEXT NOT NULL,
      duration_min INT NOT NULL,
      origin TEXT NOT NULL,
      origin_flag TEXT NOT NULL,
      destination TEXT NOT NULL,
      dest_flag TEXT NOT NULL,
      media_url TEXT NOT NULL,
      plays_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  console.log("library_items table ready");
  await pool.end();
}

migrate().catch(async (e) => {
  // Non-zero exit: CI and deploy pipelines must be able to see this fail.
  console.error("❌ Migration failed:", e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
