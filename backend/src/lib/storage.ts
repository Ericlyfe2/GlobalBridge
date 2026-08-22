import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * File storage.
 *
 * ── Why this changed (GB-10) ────────────────────────────────────────────────
 * This module used to be LocalDiskStorage only, writing to process.cwd()/uploads.
 * The backend deploys as a Dockerfile on Railway with no VOLUME declared, so the
 * container filesystem is ephemeral: every deploy started from a clean image and
 * silently destroyed every uploaded file, while the user_documents rows survived
 * pointing at keys that no longer existed. For this product that means passport
 * scans and bank statements — the documents users are asked to re-upload with no
 * explanation of where the first copy went.
 *
 * Two changes fix it:
 *   1. An S3-compatible backend (AWS S3, Cloudflare R2, Backblaze B2, MinIO —
 *      all speak the same API) selected when S3_BUCKET is configured.
 *   2. A production boot guard. If nothing durable is configured, the process
 *      refuses to start rather than accepting uploads it is going to lose. A
 *      loud deploy failure is strictly better than silent data destruction.
 *
 * S3-compatible rather than Cloudinary: CLOUDINARY_URL has been in .env.example
 * since the beginning and was never populated, and Cloudinary's API is
 * media-transformation shaped — a poor fit for identity documents, which need
 * private-by-default objects and time-limited access, not CDN delivery. The S3
 * API is also the portable one; the same code runs against R2 or MinIO by
 * changing S3_ENDPOINT, so this does not marry the platform to one vendor.
 */

export type StoredFile = { key: string; url: string };

export interface StorageBackend {
  /** Identifies the active driver in logs and health output. */
  readonly name: string;
  /** True when files survive a container replacement. */
  readonly durable: boolean;
  save(buffer: Buffer, opts: { ext: string; mime: string }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
  /**
   * A time-limited URL for a private object, or null when this backend serves
   * bytes through the API instead. Callers must run their own authorization
   * check before asking for one — this issues a URL, it does not authorize.
   */
  signedUrl(key: string, mime: string, expiresInSeconds: number): Promise<string | null>;
}

/** Opaque, unguessable object key. Never derived from user-supplied filenames. */
function newKey(ext: string): string {
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

class LocalDiskStorage implements StorageBackend {
  readonly name = "local-disk";
  readonly durable = false;

  async save(buffer: Buffer, opts: { ext: string; mime: string }): Promise<StoredFile> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const key = newKey(opts.ext);
    await fs.writeFile(path.join(UPLOAD_DIR, key), buffer);
    return { key, url: `/api/uploads/files/${key}` };
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(key)));
    } catch {
      /* already gone */
    }
  }

  /** Local files are streamed by the route itself after its ownership check. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async signedUrl(_key: string, _mime: string, _expiresInSeconds: number): Promise<string | null> {
    return null;
  }
}

class S3Storage implements StorageBackend {
  readonly name: string;
  readonly durable = true;
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET!;
    const endpoint = process.env.S3_ENDPOINT;
    this.name = endpoint ? `s3-compatible (${endpoint})` : "aws-s3";
    this.client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
  }

  async save(buffer: Buffer, opts: { ext: string; mime: string }): Promise<StoredFile> {
    const key = newKey(opts.ext);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: opts.mime,
        // No public-read ACL, deliberately. The bucket stays private and every
        // read goes through the API's ownership check, which then issues a
        // short-lived signed URL. An identity document must never be reachable
        // by anyone who merely learns its key.
      }),
    );
    return { key, url: `/api/uploads/files/${key}` };
  }

  async remove(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      /* already gone */
    }
  }

  async signedUrl(key: string, mime: string, expiresInSeconds: number): Promise<string | null> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        // Pin the type the API verified at upload, so the object store cannot
        // be talked into serving it as something else.
        ResponseContentType: mime,
      }),
      { expiresIn: expiresInSeconds },
    );
  }
}

/** How long an issued document URL stays valid. Long enough to load, short enough not to be shareable. */
export const SIGNED_URL_TTL_SECONDS = 300;

export function selectStorageBackend(env: NodeJS.ProcessEnv = process.env): StorageBackend {
  if (env.S3_BUCKET) return new S3Storage();

  if (env.NODE_ENV === "production") {
    // Refusing to boot is the point. Starting here would mean accepting identity
    // documents onto a filesystem that the next deploy deletes.
    throw new Error(
      "No durable file storage configured. Uploads would be lost on the next deploy.\n" +
        "Set S3_BUCKET (plus S3_REGION and credentials, and S3_ENDPOINT for R2/MinIO), " +
        "or set STORAGE_ALLOW_EPHEMERAL=1 to override this check if you genuinely intend " +
        "uploads to be disposable.",
    );
  }
  return new LocalDiskStorage();
}

function build(): StorageBackend {
  if (process.env.S3_BUCKET) return new S3Storage();
  if (process.env.NODE_ENV === "production" && process.env.STORAGE_ALLOW_EPHEMERAL !== "1") {
    return selectStorageBackend(); // throws with the message above
  }
  const local = new LocalDiskStorage();
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠ STORAGE_ALLOW_EPHEMERAL=1 — uploads are on the container filesystem and WILL be lost on redeploy.",
    );
  }
  return local;
}

export const storage: StorageBackend = build();
export const UPLOAD_PATH = UPLOAD_DIR;

export { LocalDiskStorage, S3Storage };
