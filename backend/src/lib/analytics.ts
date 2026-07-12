// Analytics helpers for the admin console. Pure functions so they can be
// unit-tested without a database.

export interface DailyCount {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
}

/**
 * Zero-fill a sparse set of {day,count} rows into a continuous series covering
 * the last `days` days (inclusive of today), oldest first.
 */
export function buildDailySeries(
  rows: { day: string | Date; count: number | string }[],
  days: number,
  today: Date = new Date(),
): DailyCount[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = typeof r.day === "string" ? r.day.slice(0, 10) : r.day.toISOString().slice(0, 10);
    map.set(key, Number(r.count) || 0);
  }

  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const out: DailyCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  return out;
}

/** Parse + clamp a `days` query param to a safe range. */
export function clampDays(raw: unknown, min = 7, max = 90, fallback = 30): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
