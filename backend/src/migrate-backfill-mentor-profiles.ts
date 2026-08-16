import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// One-off backfill: every mentor who signed up before mentor_profiles was
// auto-created on registration is invisible in the admin verification queue
// and the public mentor directory (both INNER JOIN mentor_profiles). This
// gives them a blank row so they show up and can be verified/booked.
async function migrate() {
  try {
    const result = await pool.query(`
      INSERT INTO mentor_profiles (user_id)
      SELECT u.id FROM users u
      LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
      WHERE u.role = 'mentor' AND mp.user_id IS NULL
      ON CONFLICT (user_id) DO NOTHING
    `);
    console.log(`Backfilled ${result.rowCount} mentor_profiles rows`);
  } catch (e) {
    console.log("Migration result:", (e as Error).message);
  }
  await pool.end();
}

migrate();
