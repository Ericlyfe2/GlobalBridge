import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  // user_id is kept for abuse/legal escalation only — every read endpoint
  // omits it, so nothing in the API response links a post back to an account.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS safe_space_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      alias TEXT NOT NULL,
      alias_color TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      upvotes INT NOT NULL DEFAULT 0,
      support_count INT NOT NULL DEFAULT 0,
      flagged BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS safe_space_replies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES safe_space_posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      alias_color TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Dedup tables so one account can't inflate a post's counts by spam-clicking.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS safe_space_upvotes (
      post_id UUID NOT NULL REFERENCES safe_space_posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS safe_space_support (
      post_id UUID NOT NULL REFERENCES safe_space_posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, user_id)
    )
  `);

  console.log("safe_space tables ready");
  await pool.end();
}

migrate().catch(async (e) => {
  // Non-zero exit: CI and deploy pipelines must be able to see this fail.
  console.error("❌ Migration failed:", e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
