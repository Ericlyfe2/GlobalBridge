import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Storage abstraction. Swap LocalDiskStorage for a Cloudinary/S3 backend later —
// only this file changes; callers use the `storage` interface.

export type StoredFile = { key: string; url: string };

export interface StorageBackend {
  save(buffer: Buffer, opts: { ext: string; mime: string }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

class LocalDiskStorage implements StorageBackend {
  async save(buffer: Buffer, opts: { ext: string; mime: string }): Promise<StoredFile> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const key = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${opts.ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, key), buffer);
    // Served via Express static at /api/uploads/files (proxied through Next /api rewrite).
    return { key, url: `/api/uploads/files/${key}` };
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(key)));
    } catch {
      /* already gone */
    }
  }
}

export const storage: StorageBackend = new LocalDiskStorage();
export const UPLOAD_PATH = UPLOAD_DIR;
