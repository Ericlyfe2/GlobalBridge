/**
 * GB-10 durability — file storage must survive container replacement.
 *
 * The backend deploys as a Dockerfile on Railway with no VOLUME, so the old
 * LocalDiskStorage lost every uploaded file on each deploy while its
 * user_documents rows survived pointing at keys that no longer existed.
 *
 * These tests drive the real @aws-sdk/client-s3 client — real request signing,
 * real HTTP, real response parsing — against a local server that speaks the S3
 * object protocol. What that does NOT cover is a real cloud bucket's own
 * signature validation, IAM and lifecycle behaviour; see the NOT DONE note in
 * the phase report.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import http from "http";
import type { AddressInfo } from "net";

// ── a minimal server that speaks enough of the S3 object protocol ───────────
const objects = new Map<string, { body: Buffer; contentType: string }>();
let server: http.Server;
let endpoint: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    // Path-style addressing: /<bucket>/<key>
    const url = new URL(req.url ?? "/", "http://localhost");
    const key = decodeURIComponent(url.pathname.replace(/^\/[^/]+\//, ""));

    if (req.method === "PUT") {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        objects.set(key, {
          body: Buffer.concat(chunks),
          contentType: String(req.headers["content-type"] ?? "application/octet-stream"),
        });
        res.writeHead(200, { ETag: '"stub"' }).end();
      });
      return;
    }
    if (req.method === "GET") {
      const obj = objects.get(key);
      if (!obj) return res.writeHead(404).end("<Error><Code>NoSuchKey</Code></Error>");
      // Honour the response-content-type override the presigner puts in the query.
      const override = url.searchParams.get("response-content-type");
      return res.writeHead(200, { "Content-Type": override ?? obj.contentType }).end(obj.body);
    }
    if (req.method === "DELETE") {
      objects.delete(key);
      return res.writeHead(204).end();
    }
    res.writeHead(405).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const S3_ENV = {
  S3_BUCKET: "globalbridge-test",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY_ID: "test-key",
  S3_SECRET_ACCESS_KEY: "test-secret",
};

let saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved = { ...process.env } as Record<string, string | undefined>;
  Object.assign(process.env, S3_ENV, { S3_ENDPOINT: endpoint });
  objects.clear();
});
afterEach(() => {
  for (const k of ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_ENDPOINT", "NODE_ENV", "STORAGE_ALLOW_EPHEMERAL"]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k]!;
  }
});

const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from("passport-scan-bytes")]);

/**
 * A brand-new module instance, which is what "a fresh container" means here:
 * no in-process state carried over, only the key the DB row holds.
 */
async function freshStorageModule() {
  vi.resetModules();
  return import("../lib/storage");
}

async function freshS3Storage() {
  const mod = await freshStorageModule();
  return new mod.S3Storage();
}

describe("S3 backend survives container replacement", () => {
  it("stores an object and reads it back from a brand-new client instance", async () => {
    const writer = await freshS3Storage();
    const stored = await writer.save(PNG, { ext: ".png", mime: "image/png" });

    expect(stored.key).toMatch(/^\d+-[0-9a-f]{16}\.png$/);
    // The DB row still holds the API path, so it is backend-independent.
    expect(stored.url).toBe(`/api/uploads/files/${stored.key}`);

    // Simulate a redeploy: throw the process away, keep only the DB row's key.
    const afterRedeploy = await freshS3Storage();
    const url = await afterRedeploy.signedUrl(stored.key, "image/png", 300);
    expect(url).toBeTruthy();

    const res = await fetch(url!);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(PNG);
  });

  it("reports itself as durable, unlike local disk", async () => {
    const s3 = await freshS3Storage();
    expect(s3.durable).toBe(true);

    const mod = await freshStorageModule();
    expect(new mod.LocalDiskStorage().durable).toBe(false);
  });

  it("issues opaque keys that never contain the user's filename", async () => {
    const s3 = await freshS3Storage();
    const a = await s3.save(PNG, { ext: ".png", mime: "image/png" });
    const b = await s3.save(PNG, { ext: ".png", mime: "image/png" });
    expect(a.key).not.toBe(b.key);
    expect(a.key).not.toMatch(/passport/i);
  });

  it("removes an object", async () => {
    const s3 = await freshS3Storage();
    const stored = await s3.save(PNG, { ext: ".png", mime: "image/png" });
    expect(objects.has(stored.key)).toBe(true);
    await s3.remove(stored.key);
    expect(objects.has(stored.key)).toBe(false);
  });
});

describe("signed URLs", () => {
  it("expire, and pin the content type the API verified at upload", async () => {
    const s3 = await freshS3Storage();
    const stored = await s3.save(PNG, { ext: ".png", mime: "image/png" });
    const url = new URL((await s3.signedUrl(stored.key, "image/png", 300))!);

    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(url.searchParams.get("response-content-type")).toBe("image/png");
  });

  it("local disk issues none — the route streams the bytes after its own check", async () => {
    const mod = await freshStorageModule();
    expect(await new mod.LocalDiskStorage().signedUrl("k", "image/png", 300)).toBeNull();
  });
});

describe("production boot guard", () => {
  it("refuses to start in production with no durable storage configured", async () => {
    const mod = await freshStorageModule();
    expect(() =>
      mod.selectStorageBackend({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toThrow(/durable file storage/i);
  });

  it("names what to set, so the failure is actionable", async () => {
    const mod = await freshStorageModule();
    try {
      mod.selectStorageBackend({ NODE_ENV: "production" } as NodeJS.ProcessEnv);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("S3_BUCKET");
      expect((e as Error).message).toMatch(/lost on the next deploy/i);
    }
  });

  it("accepts production when S3 is configured", async () => {
    const mod = await freshStorageModule();
    const backend = mod.selectStorageBackend({ NODE_ENV: "production", ...S3_ENV } as NodeJS.ProcessEnv);
    expect(backend.durable).toBe(true);
  });

  it("allows local disk in development without complaint", async () => {
    const mod = await freshStorageModule();
    const backend = mod.selectStorageBackend({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    expect(backend.name).toBe("local-disk");
  });
});
