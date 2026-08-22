// Real service-health probes for the admin console.
// Each probe catches its own failure and reports up/down/not_configured with latency,
// so the admin overview reflects reality instead of a hardcoded "Connected".

import { pool, redis } from "../db";

export type ProbeStatus = "up" | "down" | "not_configured";

export interface Probe {
  name: string;
  status: ProbeStatus;
  latencyMs: number | null;
  detail?: string;
}

/** Time an async check: "up" on success, "down" (with message) on throw. */
export async function measure(name: string, fn: () => Promise<void>): Promise<Probe> {
  const start = Date.now();
  try {
    await fn();
    return { name, status: "up", latencyMs: Date.now() - start };
  } catch (e) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - start,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function probePostgres(): Promise<Probe> {
  return measure("postgres", async () => {
    await pool.query("SELECT 1");
  });
}

export async function probeRedis(): Promise<Probe> {
  const client = redis;
  if (!client) return { name: "redis", status: "not_configured", latencyMs: null };
  return measure("redis", async () => {
    await client.ping();
  });
}

/**
 * Probe the AI microservice.
 *
 * Retained only for the admin console's service overview. It is NOT part of
 * collectHealth() any more: it targets AI_SERVICE_URL, the removed Python
 * service, so it reports "down" unconditionally. Leaving it in the readiness
 * report would pin this API at 503 forever and fail every deploy.
 *
 * The AI features now live in the Next.js route handlers, which are a separate
 * deployment — not a dependency this process can be unready on behalf of.
 *
 * Removed entirely when GB-09 lands and AI_SERVICE_URL goes with it.
 */
export function probeAI(fetchImpl: typeof fetch = fetch): Promise<Probe> {
  const base = process.env.AI_SERVICE_URL || "http://localhost:8000";
  return measure("ai", async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetchImpl(`${base}/health`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  });
}

export interface HealthReport {
  overall: "healthy" | "degraded";
  services: Probe[];
  checkedAt: string;
}

/**
 * The dependencies this API genuinely cannot serve traffic without.
 *
 * Postgres is required. Redis is optional by design — every feature that uses
 * it degrades rather than fails — so "not_configured" and even "down" leave the
 * instance ready, and only show up in the breakdown.
 */
export async function collectHealth(): Promise<HealthReport> {
  const [postgres, redisProbe] = await Promise.all([probePostgres(), probeRedis()]);
  const services = [postgres, redisProbe];
  // Only a required dependency being down makes this instance unready.
  const overall = postgres.status === "down" ? "degraded" : "healthy";
  return { overall, services, checkedAt: new Date().toISOString() };
}
