import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin'`);
    console.log("Enum migration applied successfully");
  } catch (e) {
    console.log("Migration result:", (e as Error).message);
  }
  await pool.end();
}

migrate();
