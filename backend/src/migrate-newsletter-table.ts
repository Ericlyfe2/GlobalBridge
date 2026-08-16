import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log("newsletter_subscribers table ready");
  } catch (e) {
    console.log("Migration result:", (e as Error).message);
  }
  await pool.end();
}

migrate();
