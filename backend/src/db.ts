import { Pool } from "pg";
import Redis from "ioredis";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000,
});

pool.on("error", (err) => console.error("Postgres pool error", err));

// Redis is optional — only connects if REDIS_URL is set.
// Without it, WebSocket pub/sub and rate-limit caching gracefully degrade.
export const redis: Redis | null = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    })
  : null;

if (redis) {
  redis.on("error", (err) => console.error("Redis error", err));
} else {
  console.warn("⚠ REDIS_URL not set — running without Redis (WebSocket broadcast + cache disabled)");
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function queryOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
