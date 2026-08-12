import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
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
  } catch (e) {
    console.log("Migration result:", (e as Error).message);
  }
  await pool.end();
}

migrate();
