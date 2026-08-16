import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`ALTER TABLE mentor_bookings ADD COLUMN IF NOT EXISTS student_timezone TEXT`);
    console.log("mentor_bookings.student_timezone ready");
  } catch (e) {
    console.log("Migration result:", (e as Error).message);
  }
  await pool.end();
}

migrate();
