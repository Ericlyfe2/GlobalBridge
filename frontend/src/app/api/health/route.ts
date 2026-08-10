/**
 * Same-origin liveness probe for the network-status hook.
 *
 * Deliberately trivial and dependency-free: it answers "can this browser reach
 * our server right now", which is what the offline banner needs. It must not
 * touch the database — a slow query would make a healthy network look offline.
 *
 * Not proxied to Express (no rewrite matches /api/health), so it stays up even
 * if the backend is down, which is the correct semantics here: the frontend is
 * reachable, so we are "online" and individual API calls can fail on their own
 * terms with their own error states.
 */

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export function HEAD() {
  return GET();
}
