import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * For calendar-date-only values (deadlines, booking slot dates) — NOT for
 * real timestamps like created_at. Postgres DATE columns serialize as
 * "2026-08-30T00:00:00.000Z", and naively doing `new Date(value)` then
 * localizing shifts the displayed day backward for any viewer west of UTC
 * (all of the Americas): midnight UTC on Aug 30 is still Aug 29 evening in
 * Toronto, so a deadline or session date can render a day early. Re-parsing
 * just the date portion as local midnight avoids that shift entirely.
 */
export function formatDateOnly(
  value: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, opts);
}
