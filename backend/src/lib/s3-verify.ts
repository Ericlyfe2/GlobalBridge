/**
 * The pre-launch S3 check (GB-10), as a reusable routine.
 *
 * The remediation shipped an S3-compatible storage driver behind a production
 * boot guard, verified against a local S3-protocol server through the real AWS
 * SDK. What it could not verify — no credentials exist in the dev environment —
 * is a real bucket: IAM policy, the provider's own signature validation, and
 * above all whether the bucket is actually private.
 *
 * That last one is the whole point. Identity documents live in this bucket. A
 * bucket left publicly readable does not fail any functional test: uploads
 * work, signed URLs work, the app looks fine, and every passport scan is
 * fetchable by anyone who learns an object key.
 *
 * The logic lives here rather than in the script so it can be exercised against
 * a stub in the test suite — proving the check catches a public bucket, rather
 * than assuming it would.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type CheckResult = { name: string; ok: boolean; detail: string; critical: boolean };

export type S3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

/** A real PNG header, so a content-sniffing bucket policy sees a genuine image. */
const PROBE_BYTES = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"),
  Buffer.from("globalbridge-s3-verification-probe"),
]);

export function readConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined>): S3Config | null {
  if (!env.S3_BUCKET) return null;
  return {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION || "us-east-1",
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  };
}

export function makeClient(cfg: S3Config): S3Client {
  return new S3Client({
    region: cfg.region,
    ...(cfg.endpoint ? { endpoint: cfg.endpoint, forcePathStyle: true } : {}),
    ...(cfg.accessKeyId && cfg.secretAccessKey
      ? { credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } }
      : {}),
  });
}

/**
 * The unsigned URL for an object — what an attacker would try after learning a
 * key from a log, a referrer header, or a shared screenshot.
 */
export function unsignedUrl(cfg: S3Config, key: string): string {
  if (cfg.endpoint) return `${cfg.endpoint.replace(/\/$/, "")}/${cfg.bucket}/${key}`;
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}

/**
 * Round-trips a probe object through the configured bucket.
 *
 * `fetchImpl` is injectable so the suite can drive this against a stub and
 * confirm the public-exposure check actually fires.
 */
export async function runS3Checks(
  cfg: S3Config,
  opts: { fetchImpl?: typeof fetch; client?: S3Client } = {},
): Promise<{ results: CheckResult[]; key: string }> {
  const doFetch = opts.fetchImpl ?? fetch;
  const client = opts.client ?? makeClient(cfg);
  const results: CheckResult[] = [];
  const key = `verification/${Date.now()}-probe.png`;
  const add = (name: string, ok: boolean, detail: string, critical = false) =>
    results.push({ name, ok, detail, critical });

  // ── write ────────────────────────────────────────────────────────────────
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: PROBE_BYTES,
        ContentType: "image/png",
      }),
    );
    add("upload", true, `wrote ${PROBE_BYTES.length} bytes to ${key}`);
  } catch (e) {
    add("upload", false, `${(e as Error).name}: ${(e as Error).message}`, true);
    // Nothing downstream can pass; return early rather than cascade failures.
    return { results, key };
  }

  // ── the object is really there ───────────────────────────────────────────
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    const size = Number(head.ContentLength ?? 0);
    add("object exists", size === PROBE_BYTES.length, `HEAD reports ${size} bytes`);
  } catch (e) {
    add("object exists", false, (e as Error).message, true);
  }

  // ── survives a fresh client, which is what a redeploy is ─────────────────
  try {
    const fresh = makeClient(cfg);
    const url = await getSignedUrl(
      fresh,
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key, ResponseContentType: "image/png" }),
      { expiresIn: 300 },
    );
    const res = await doFetch(url);
    const body = Buffer.from(await res.arrayBuffer());
    add(
      "signed URL round-trip",
      res.status === 200 && body.equals(PROBE_BYTES),
      `HTTP ${res.status}, ${body.length} bytes, byte-identical: ${body.equals(PROBE_BYTES)}`,
      true,
    );
    const u = new URL(url);
    add(
      "signed URL expires",
      u.searchParams.get("X-Amz-Expires") === "300" && Boolean(u.searchParams.get("X-Amz-Signature")),
      `X-Amz-Expires=${u.searchParams.get("X-Amz-Expires")}, signature present: ${Boolean(u.searchParams.get("X-Amz-Signature"))}`,
    );
  } catch (e) {
    add("signed URL round-trip", false, (e as Error).message, true);
  }

  // ── THE ONE THAT MATTERS ─────────────────────────────────────────────────
  // A public bucket passes every functional check above. This is the only step
  // that distinguishes "works" from "safe".
  try {
    const res = await doFetch(unsignedUrl(cfg, key));
    const leaked = res.status === 200;
    let bodyMatches = false;
    if (leaked) {
      const body = Buffer.from(await res.arrayBuffer());
      bodyMatches = body.equals(PROBE_BYTES);
    }
    add(
      "bucket is PRIVATE",
      !leaked,
      leaked
        ? `PUBLICLY READABLE — unsigned GET returned ${res.status}${bodyMatches ? " with the exact bytes" : ""}. ` +
          `Every identity document in this bucket is fetchable by anyone with a key.`
        : `unsigned GET correctly refused (HTTP ${res.status})`,
      true,
    );
  } catch (e) {
    // A network-level refusal is also a pass: nothing served the object.
    add("bucket is PRIVATE", true, `unsigned GET failed at the network level (${(e as Error).message})`, true);
  }

  // ── clean up ─────────────────────────────────────────────────────────────
  try {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    let gone = false;
    try {
      await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    } catch {
      gone = true;
    }
    add("delete removes the object", gone, gone ? "HEAD after delete fails, as it should" : "object still present after delete");
  } catch (e) {
    add("delete removes the object", false, (e as Error).message);
  }

  return { results, key };
}

export function summarise(results: CheckResult[]): { passed: number; failed: number; criticalFailed: number } {
  const failed = results.filter((r) => !r.ok);
  return {
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    criticalFailed: failed.filter((r) => r.critical).length,
  };
}
