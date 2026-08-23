import path from "path";
import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, isAdmin } from "../middleware/auth";
import { storage, UPLOAD_PATH, SIGNED_URL_TTL_SECONDS } from "../lib/storage";
import { sniffFileType, MAX_BYTES, PER_USER_QUOTA_BYTES, formatBytes } from "../lib/file-type";

export const uploadsRouter = Router();

// Purposes that are meant to be publicly visible as part of the product
// (profile avatars, housing listing photos) vs. ones that are sensitive and
// must stay scoped to the uploader + admins (ID scans, financial documents).
const PUBLIC_PURPOSES = new Set(["avatar", "housing"]);

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

const PURPOSE_MIME: Record<string, string[]> = {
  avatar: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  housing: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  verification: ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"],
  document: ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"],
};

const schema = z.object({
  purpose: z.enum(["avatar", "housing", "verification", "document"]),
  filename: z.string().min(1).max(255),
  mime: z.string(),
  data: z.string().min(1), // base64, with or without data-URI prefix
});

// POST /api/uploads — accepts a base64 file, validates, stores, returns its URL.
uploadsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const b = schema.parse(req.body);

    const base64 = b.data.includes(",") ? b.data.slice(b.data.indexOf(",") + 1) : b.data;
    const buffer = Buffer.from(base64, "base64");

    if (!buffer.length) return res.status(400).json({ error: "Empty file" });
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: `File too large — the limit is ${formatBytes(MAX_BYTES)}.` });
    }

    // The client's `mime` field is a claim, not evidence. Everything downstream
    // — the per-purpose allow-list, the stored row, the Content-Type this API
    // later serves the bytes under — now keys off the detected type instead.
    const detected = sniffFileType(buffer);
    if (!detected) {
      return res.status(415).json({
        error: "That file type isn't supported. Upload a PNG, JPEG, GIF, WebP or PDF.",
      });
    }
    const allowed = PURPOSE_MIME[b.purpose];
    if (!allowed.includes(detected)) {
      return res.status(415).json({ error: `A ${detected} file can't be used as a ${b.purpose}.` });
    }

    // Per-user storage quota. size_bytes was written on every row and never
    // read, so one account could write unbounded data — the only ceiling was
    // the global IP rate limit.
    const usedRow = await queryOne<{ used: string }>(
      `SELECT COALESCE(SUM(size_bytes), 0)::text AS used FROM user_documents WHERE user_id = $1`,
      [req.user!.sub],
    );
    const used = Number(usedRow?.used ?? 0);
    if (used + buffer.length > PER_USER_QUOTA_BYTES) {
      return res.status(413).json({
        error:
          `You've used ${formatBytes(used)} of your ${formatBytes(PER_USER_QUOTA_BYTES)} storage. ` +
          `Delete an old document to free up space.`,
        used_bytes: used,
        quota_bytes: PER_USER_QUOTA_BYTES,
      });
    }

    const ext = MIME_EXT[detected] ?? "";
    const stored = await storage.save(buffer, { ext, mime: detected });

    const document = await queryOne(
      `INSERT INTO user_documents (user_id, purpose, url, storage_key, original_name, mime, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.sub, b.purpose, stored.url, stored.key, b.filename, detected, buffer.length]
    );
    // Submitting verification docs re-opens a previously rejected user for review.
    if (b.purpose === "verification") {
      await query(
        `UPDATE users SET verification_status = 'pending'
         WHERE id = $1 AND verification_status = 'rejected'`,
        [req.user!.sub]
      );
    }

    res.status(201).json({ url: stored.url, key: stored.key, document });
  } catch (err) {
    next(err);
  }
});

// GET /api/uploads/documents — my uploaded documents
uploadsRouter.get("/documents", requireAuth, async (req, res, next) => {
  try {
    const docs = await query(
      `SELECT * FROM user_documents WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.sub]
    );
    res.json({ documents: docs });
  } catch (err) {
    next(err);
  }
});

// GET /api/uploads/files/:key — serves the actual file. Avatars and housing
// photos are product-public (anyone signed in needs to see other users'
// profile pictures and listing photos); verification/document uploads are
// sensitive and are only released to their owner or an admin.
uploadsRouter.get("/files/:key", requireAuth, async (req, res, next) => {
  try {
    // path.basename strips any directory components — the key is looked up
    // by exact match below, but this keeps the eventual fs path unambiguous.
    const key = path.basename(String(req.params.key));
    const doc = await queryOne<{ user_id: string; purpose: string; mime: string }>(
      `SELECT user_id, purpose, mime FROM user_documents WHERE storage_key = $1`,
      [key]
    );
    if (!doc) return res.status(404).json({ error: "File not found" });

    const authorized = PUBLIC_PURPOSES.has(doc.purpose)
      || doc.user_id === req.user!.sub
      || isAdmin(req.user!.role);
    if (!authorized) return res.status(403).json({ error: "Not authorized to view this file" });

    // Authorization has passed. On a durable backend the bucket is private, so
    // hand out a short-lived signed URL rather than proxying the bytes. The
    // ownership check above is still the only way to obtain one — the object is
    // never publicly addressable, and the URL expires.
    const signed = await storage.signedUrl(key, doc.mime, SIGNED_URL_TTL_SECONDS);
    if (signed) {
      // No-store: the redirect embeds a credential and must not be cached by
      // the browser, a CDN, or the service worker.
      res.set("Cache-Control", "no-store, private");
      return res.redirect(302, signed);
    }

    res.type(doc.mime);
    res.sendFile(key, { root: UPLOAD_PATH }, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
});
