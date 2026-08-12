import path from "path";
import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth, isAdmin } from "../middleware/auth";
import { storage, UPLOAD_PATH } from "../lib/storage";

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

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

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

    const allowed = PURPOSE_MIME[b.purpose];
    if (!allowed.includes(b.mime)) {
      return res.status(400).json({ error: `Unsupported file type for ${b.purpose}: ${b.mime}` });
    }

    const ext = MIME_EXT[b.mime] ?? "";
    const base64 = b.data.includes(",") ? b.data.slice(b.data.indexOf(",") + 1) : b.data;
    const buffer = Buffer.from(base64, "base64");

    if (!buffer.length) return res.status(400).json({ error: "Empty file" });
    if (buffer.length > MAX_BYTES) return res.status(413).json({ error: "File too large (max 8MB)" });

    const stored = await storage.save(buffer, { ext, mime: b.mime });

    let document = null;
    document = await queryOne(
      `INSERT INTO user_documents (user_id, purpose, url, storage_key, original_name, mime, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.sub, b.purpose, stored.url, stored.key, b.filename, b.mime, buffer.length]
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

    res.type(doc.mime);
    res.sendFile(key, { root: UPLOAD_PATH }, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
});
