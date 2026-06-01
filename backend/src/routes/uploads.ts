import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { storage } from "../lib/storage";

export const uploadsRouter = Router();

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const PURPOSE_MIME: Record<string, string[]> = {
  avatar: ["image/png", "image/jpeg", "image/webp"],
  housing: ["image/png", "image/jpeg", "image/webp"],
  verification: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
  document: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
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
