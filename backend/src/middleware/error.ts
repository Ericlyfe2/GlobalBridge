import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.errors });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // body-parser's payload-too-large error (thrown before any route handler runs,
  // so routes/uploads.ts's own "File too large" check never gets a chance to fire).
  if ((err as { type?: string }).type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
