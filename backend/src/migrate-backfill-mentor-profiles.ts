import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// One-off backfill: every mentor who signed up before mentor_profiles was
// auto-created on registration is invisible in the admin verification queue
// and the public mentor directory (both INNER JOIN mentor_profiles). This
// gives them a blank row so they show up and can be verified/booked.
async function migrate() {
  const result = await pool.query(`
    INSERT INTO mentor_profiles (user_id)
    SELECT u.id FROM users u
    LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
    WHERE u.role = 'mentor' AND mp.user_id IS NULL
    ON CONFLICT (user_id) DO NOTHING
  `);
  console.log(`Backfilled ${result.rowCount} mentor_profiles rows`);
  await pool.end();
}

migrate().catch(async (e) => {
  // Non-zero exit: CI and deploy pipelines must be able to see this fail.
  console.error("❌ Migration failed:", e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
