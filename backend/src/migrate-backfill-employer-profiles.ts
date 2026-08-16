import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Same bug as mentor_profiles: every employer who signed up before this was
// fixed is invisible in the admin employer-verification queue (INNER JOIN
// employer_profiles). Seeds a placeholder company_name (NOT NULL column)
// they can rename later.
async function migrate() {
  try {
    const result = await pool.query(`
      INSERT INTO employer_profiles (user_id, company_name)
      SELECT u.id, u.full_name || '''s company' FROM users u
      LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.role = 'employer' AND ep.user_id IS NULL
      ON CONFLICT (user_id) DO NOTHING
    `);
    console.log(`Backfilled ${result.rowCount} employer_profiles rows`);
  } catch (e) {
    console.log("Migration result:", (e as Error).message);
  }
  await pool.end();
}

migrate();
