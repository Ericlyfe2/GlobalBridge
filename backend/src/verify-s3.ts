/**
 * Pre-launch S3 verification (GB-10).
 *
 *   npm run verify:s3
 *
 * Run this once against the real bucket before the first deploy that accepts
 * identity documents. The audit's NOT DONE list item 1 is closed by a green run
 * of this script and not before.
 *
 * It writes a small probe object, reads it back through a signed URL, then tries
 * to fetch the same object WITHOUT a signature. That last step is the one that
 * matters: a publicly readable bucket passes every functional check — uploads
 * work, signed URLs work, the app looks correct — while every passport scan in
 * it is fetchable by anyone who learns a key.
 *
 * The probe object is deleted on the way out.
 */

import "dotenv/config";
import { readConfig, runS3Checks, summarise, unsignedUrl } from "./lib/s3-verify";

const GUIDANCE = `
No S3 bucket configured, so there is nothing to verify.

Set these in backend/.env (or the deployment environment) and run again:

  S3_BUCKET=your-bucket-name
  S3_REGION=eu-west-1
  S3_ACCESS_KEY_ID=...
  S3_SECRET_ACCESS_KEY=...
  # S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   (R2 / MinIO / B2)

Use a bucket dedicated to this application, with public access blocked. The
credentials need only s3:PutObject, s3:GetObject, s3:DeleteObject and
s3:HeadObject on that bucket.

Until this passes, lib/storage.ts refuses to boot in production rather than
accept documents onto a filesystem the next deploy deletes.`;

async function main() {
  const cfg = readConfig(process.env);
  if (!cfg) {
    console.log(GUIDANCE);
    process.exit(1);
  }

  console.log(`\nVerifying S3 storage`);
  console.log(`  bucket   : ${cfg.bucket}`);
  console.log(`  region   : ${cfg.region}`);
  console.log(`  endpoint : ${cfg.endpoint ?? "aws (default)"}`);
  console.log(`  creds    : ${cfg.accessKeyId ? "explicit key" : "ambient (instance role / ~/.aws)"}\n`);

  const { results, key } = await runS3Checks(cfg);

  for (const r of results) {
    const mark = r.ok ? "ok  " : r.critical ? "FAIL" : "warn";
    console.log(`  ${mark}  ${r.name.padEnd(26)} ${r.detail}`);
  }

  const { passed, failed, criticalFailed } = summarise(results);
  console.log(`\n  ${passed} passed, ${failed} failed (${criticalFailed} critical)`);

  if (criticalFailed > 0) {
    const leak = results.find((r) => r.name === "bucket is PRIVATE" && !r.ok);
    if (leak) {
      console.error(
        `\nSTOP. The bucket is publicly readable.\n` +
          `  ${unsignedUrl(cfg, key)}\n` +
          `Block all public access on this bucket before it holds a single identity\n` +
          `document. Nothing else in this checklist matters until that is true.`,
      );
    } else {
      console.error(`\nS3 storage is NOT ready. Fix the failures above and run again.`);
    }
    process.exit(1);
  }

  console.log(
    `\nS3 storage verified. GB-10's remaining gap is closed: uploads are durable,\n` +
      `private by default, and served only through short-lived signed URLs.`,
  );
}

main().catch((e) => {
  console.error(`\nVerification could not complete: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
