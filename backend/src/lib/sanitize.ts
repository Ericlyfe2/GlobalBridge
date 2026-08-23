// Escapes ILIKE/LIKE wildcard characters in user-supplied search text so a
// literal "%" or "_" in a query (e.g. "100% funded", "under_grad") matches
// itself instead of acting as a SQL wildcard. Callers still wrap the result
// in their own %...% pattern.
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Field allow-list for partial-update handlers that build a dynamic SET clause
 * straight from `req.body`. Returns only the named keys, so an extra property
 * in the request can never become a column in the UPDATE.
 *
 * This does NOT transform values. User text is stored verbatim.
 *
 * ── Why there is no HTML escaping here ──────────────────────────────────────
 * There used to be a sanitize() that replaced < > " ' / with HTML entities on
 * the way *in*. That was wrong twice over:
 *
 *   1. It solved a problem that does not exist. Every consumer of this data is
 *      React, which escapes at render time. Escaping again on write produced
 *      double-encoding, not safety.
 *   2. It corrupted the stored value permanently. "/" -> "&#x2F;" broke every
 *      URL written through it (listing photos, avatars, apply links), and
 *      "'" -> "&#x27;" mangled any name or sentence containing an apostrophe.
 *
 * The escaping boundary belongs at render, not at rest. If a surface ever needs
 * to emit stored text as raw HTML, that surface sanitizes at that point — with
 * a real HTML sanitizer, against the markup it intends to allow.
 */
export function pickAllowed(obj: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}
