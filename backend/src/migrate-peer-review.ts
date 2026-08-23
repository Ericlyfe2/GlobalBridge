import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  // Alias-based like safe_space_posts — reviewers see the essay + a random
  // alias, never the submitter's real identity.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS peer_review_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      alias_color TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      target TEXT NOT NULL,
      focus_question TEXT,
      body TEXT NOT NULL,
      reviews_needed INT NOT NULL DEFAULT 3,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS peer_review_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      submission_id UUID NOT NULL REFERENCES peer_review_submissions(id) ON DELETE CASCADE,
      reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      alias_color TEXT NOT NULL,
      rubric_scores JSONB NOT NULL,
      overall_score INT NOT NULL,
      comments TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (submission_id, reviewer_id)
    )
  `);

  console.log("peer_review tables ready");
  await pool.end();
}

migrate().catch(async (e) => {
  // Non-zero exit: CI and deploy pipelines must be able to see this fail.
  console.error("❌ Migration failed:", e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
