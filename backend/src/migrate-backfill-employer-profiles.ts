import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Same bug as mentor_profiles: every employer who signed up before this was
// fixed is invisible in the admin employer-verification queue (INNER JOIN
// employer_profiles). Seeds a placeholder company_name (NOT NULL column)
// they can rename later.
async function migrate() {
  const result = await pool.query(`
    INSERT INTO employer_profiles (user_id, company_name)
    SELECT u.id, u.full_name || '''s company' FROM users u
    LEFT JOIN employer_profiles ep ON ep.user_id = u.id
    WHERE u.role = 'employer' AND ep.user_id IS NULL
    ON CONFLICT (user_id) DO NOTHING
  `);
  console.log(`Backfilled ${result.rowCount} employer_profiles rows`);
  await pool.end();
}

migrate().catch(async (e) => {
  // Non-zero exit: CI and deploy pipelines must be able to see this fail.
  console.error("❌ Migration failed:", e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
