/**
 * Proves the pre-launch S3 check actually detects a public bucket (GB-10).
 *
 * The check exists for one scenario: a bucket that works perfectly and leaks
 * everything. Uploads succeed, signed URLs succeed, the application behaves
 * correctly, and every identity document is fetchable by anyone who learns an
 * object key. Nothing functional catches that.
 *
 * So the check itself has to be tested against a bucket that leaks. These drive
 * the real AWS SDK against a local S3-protocol server that can be flipped
 * between private and public, and assert the verdict flips with it.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "http";
import type { AddressInfo } from "net";
import { runS3Checks, summarise, readConfig, unsignedUrl, type S3Config } from "../lib/s3-verify";

const objects = new Map<string, { body: Buffer; contentType: string }>();
let server: http.Server;
let endpoint: string;

/** Flipped per test: does an unsigned GET serve the object? */
let bucketIsPublic = false;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const key = decodeURIComponent(url.pathname.replace(/^\/[^/]+\//, ""));
    const signed = url.searchParams.has("X-Amz-Signature");

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

    if (req.method === "HEAD") {
      const obj = objects.get(key);
      if (!obj) return res.writeHead(404).end();
      return res.writeHead(200, { "Content-Length": String(obj.body.length) }).end();
    }

    if (req.method === "GET") {
      const obj = objects.get(key);
      if (!obj) return res.writeHead(404).end("<Error><Code>NoSuchKey</Code></Error>");
      // The distinction the whole check turns on: a private bucket refuses an
      // unsigned read; a public one hands the bytes over.
      if (!signed && !bucketIsPublic) {
        return res.writeHead(403).end("<Error><Code>AccessDenied</Code></Error>");
      }
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

beforeEach(() => {
  objects.clear();
  bucketIsPublic = false;
});

const cfg = (): S3Config => ({
  bucket: "gb-verify-test",
  region: "us-east-1",
  endpoint,
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
});

const byName = (rs: Awaited<ReturnType<typeof runS3Checks>>["results"], n: string) =>
  rs.find((r) => r.name === n)!;

describe("a correctly configured private bucket", () => {
  it("passes every check", async () => {
    const { results } = await runS3Checks(cfg());
    const { failed, criticalFailed } = summarise(results);
    expect(
      failed,
      `unexpected failures:\n  ${results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.detail}`).join("\n  ")}`,
    ).toBe(0);
    expect(criticalFailed).toBe(0);
  });

  it("round-trips the bytes through a signed URL", async () => {
    const { results } = await runS3Checks(cfg());
    expect(byName(results, "signed URL round-trip").detail).toContain("byte-identical: true");
  });

  it("issues a signed URL that expires", async () => {
    const { results } = await runS3Checks(cfg());
    expect(byName(results, "signed URL expires").ok).toBe(true);
  });

  it("reports the bucket as private", async () => {
    const { results } = await runS3Checks(cfg());
    expect(byName(results, "bucket is PRIVATE").ok).toBe(true);
  });

  it("cleans up the probe object", async () => {
    const { results } = await runS3Checks(cfg());
    expect(byName(results, "delete removes the object").ok).toBe(true);
    expect(objects.size).toBe(0);
  });
});

describe("a bucket that works but leaks", () => {
  it("still passes every functional check — which is exactly the danger", async () => {
    bucketIsPublic = true;
    const { results } = await runS3Checks(cfg());
    // Upload, existence and the signed round-trip all succeed. Nothing about
    // the application's behaviour would tell anyone something is wrong.
    for (const name of ["upload", "object exists", "signed URL round-trip"]) {
      expect(byName(results, name).ok, `${name} should still pass on a public bucket`).toBe(true);
    }
  });

  it("is caught by the privacy check, and it is marked critical", async () => {
    bucketIsPublic = true;
    const { results } = await runS3Checks(cfg());
    const priv = byName(results, "bucket is PRIVATE");
    expect(priv.ok).toBe(false);
    expect(priv.critical).toBe(true);
    expect(summarise(results).criticalFailed).toBeGreaterThan(0);
  });

  it("says plainly what the exposure is", async () => {
    bucketIsPublic = true;
    const { results } = await runS3Checks(cfg());
    const detail = byName(results, "bucket is PRIVATE").detail;
    expect(detail).toContain("PUBLICLY READABLE");
    expect(detail).toContain("identity document");
    // It must confirm the real bytes came back, not just a 200.
    expect(detail).toContain("with the exact bytes");
  });
});

describe("configuration handling", () => {
  it("reports nothing to verify when no bucket is set", () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ S3_REGION: "eu-west-1" })).toBeNull();
  });

  it("defaults the region and carries an explicit endpoint through", () => {
    const c = readConfig({ S3_BUCKET: "b", S3_ENDPOINT: "https://x.r2.cloudflarestorage.com" })!;
    expect(c).toMatchObject({ bucket: "b", region: "us-east-1", endpoint: "https://x.r2.cloudflarestorage.com" });
  });

  it("builds the unsigned URL an attacker would try", () => {
    expect(unsignedUrl({ bucket: "b", region: "eu-west-1" }, "k.png"))
      .toBe("https://b.s3.eu-west-1.amazonaws.com/k.png");
    expect(unsignedUrl({ bucket: "b", region: "auto", endpoint: "https://x.example/" }, "k.png"))
      .toBe("https://x.example/b/k.png");
  });

  it("fails critically, not silently, when the bucket does not exist", async () => {
    const { results } = await runS3Checks({ ...cfg(), bucket: "" });
    expect(summarise(results).criticalFailed).toBeGreaterThan(0);
  });
});
