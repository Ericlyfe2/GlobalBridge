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

/** Probe the AI microservice /health with a short timeout. `fetchImpl` is injectable for tests. */
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

export async function collectHealth(): Promise<HealthReport> {
  const services = await Promise.all([probePostgres(), probeRedis(), probeAI()]);
  const overall = services.some((s) => s.status === "down") ? "degraded" : "healthy";
  return { overall, services, checkedAt: new Date().toISOString() };
}
