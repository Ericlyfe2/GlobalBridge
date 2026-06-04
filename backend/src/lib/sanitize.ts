export function sanitize(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeObject(obj: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    const v = obj[k];
    if (v !== undefined) {
      out[k] = typeof v === "string" ? sanitize(v) : v;
    }
  }
  return out;
}

export function sanitizeAllStrings<T>(obj: T): T {
  if (typeof obj === "string") return sanitize(obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitizeAllStrings) as T;
  if (obj && typeof obj === "object") {
    const out = { ...obj };
    for (const key in out) {
      if (Object.prototype.hasOwnProperty.call(out, key)) {
        (out as Record<string, unknown>)[key] = sanitizeAllStrings((out as Record<string, unknown>)[key]);
      }
    }
    return out;
  }
  return obj;
}
