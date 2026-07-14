import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required — set it in backend/.env");
    process.exit(1);
  }

  const sqlFile = process.argv[2] || "../db/schema.sql";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  try {
    const sql = readFileSync(resolve(__dirname, sqlFile), "utf8");
    console.log(`Applying ${sqlFile}...`);
    await pool.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration error:", (err as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
