import type { Request, Response, NextFunction, Router } from "express";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Path parameters that are always UUIDs (GB-16).
 *
 * Deliberately not every param: uploads uses :key for a storage key and forums
 * uses slugs, neither of which is a UUID.
 */
const UUID_PARAMS = ["id", "userId", "postId", "mentorId", "conversationId"];

/**
 * Reject malformed UUIDs before they reach SQL.
 *
 * Every `:id` route passed req.params straight into a query, so Postgres raised
 * `invalid input syntax for type uuid` and the generic error handler turned it
 * into a 500. A stale link produced a hard error page, and the noise buried real
 * 500s in the logs.
 *
 * router.param is Express's own hook for this: it fires once the parameter is
 * matched and before any handler on that route, so a bad id never reaches a
 * query no matter which router declared it.
 */
export function installUuidParamValidation(routers: Router[]): void {
  for (const router of routers) {
    for (const name of UUID_PARAMS) {
      router.param(name, (req: Request, res: Response, next: NextFunction, value: string) => {
        if (typeof value === "string" && UUID_RE.test(value)) return next();
        res.status(400).json({
          error: `That link doesn't look right — "${name}" is not a valid id.`,
          param: name,
        });
      });
    }
  }
}

/**
 * JSON 404 for unmatched API routes.
 *
 * Express's default handler returns an HTML error page, so a JSON client asking
 * for a route that does not exist got `<!DOCTYPE html>` with a 404 — a parse
 * error stacked on top of a routing error.
 */
export function apiNotFound(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/")) return next();
  res.status(404).json({ error: `No such endpoint: ${req.method} ${req.path}` });
}

export { UUID_RE, UUID_PARAMS };
