import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin'`);
  console.log("Enum migration applied successfully");
  await pool.end();
}

migrate().catch(async (e) => {
  // Non-zero exit: CI and deploy pipelines must be able to see this fail.
  console.error("❌ Migration failed:", e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
