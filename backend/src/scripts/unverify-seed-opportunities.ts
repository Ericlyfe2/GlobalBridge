/**
 * Dev-only: clear false verification on seed / placeholder opportunity rows.
 * Refuses to run against databases whose name looks like production.
 *
 * Usage: cd backend && npx tsx src/scripts/unverify-seed-opportunities.ts
 */
import "dotenv/config";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const parsed = new URL(url);
const dbName = parsed.pathname.slice(1);
const host = parsed.hostname;

/**
 * Allowlist, not denylist.
 *
 * This guard previously refused only when the database *name* matched /prod/.
 * This project's production database is called `neondb` — no "prod" anywhere in
 * it — so the check that exists specifically to stop a destructive write from
 * hitting production would have waved it straight through. A guard that cannot
 * recognise the one database it is protecting against is worse than no guard,
 * because it reads as if the risk has been handled.
 *
 * Inverted: run only against a database whose name positively identifies itself
 * as non-production. Anything unrecognised is treated as production and
 * refused. An explicit ALLOW_DESTRUCTIVE_DB=1 exists as a deliberate override
 * for the rare case where the name genuinely is safe but unconventional.
 */
const NON_PRODUCTION = /(^|[_-])(dev|development|test|testing|staging|local|sandbox|scratch)([_-]|$)/i;
const isKnownSafe = NON_PRODUCTION.test(dbName);
const overridden = process.env.ALLOW_DESTRUCTIVE_DB === "1";

if (!isKnownSafe && !overridden) {
  console.error(
    `Refusing to run against "${dbName}" on ${host}.\n` +
    `This script performs bulk UPDATEs and only runs against a database whose\n` +
    `name identifies it as non-production (dev, test, staging, local, sandbox).\n` +
    `If "${dbName}" really is safe, re-run with ALLOW_DESTRUCTIVE_DB=1.`,
  );
  process.exit(1);
}

if (overridden && !isKnownSafe) {
  console.warn(`⚠ ALLOW_DESTRUCTIVE_DB=1 — proceeding against "${dbName}" on ${host}.`);
}

console.log(`Target: ${host} / ${dbName}`);

const pool = new Pool({ connectionString: url });

async function main() {
  const client = await pool.connect();
  try {
    const r1 = await client.query(`
      UPDATE opportunities
      SET is_verified = false, verified_at = NULL
      WHERE is_verified = true
        AND (
          application_url ILIKE '%example%'
          OR application_url ILIKE '%.demo%'
          OR application_url IS NULL
          OR posted_by = '44444444-4444-4444-4444-444444444444'::uuid
        )
    `);
    console.log(`Unverified ${r1.rowCount} seed/placeholder opportunities.`);

    const r2 = await client.query(`
      UPDATE opportunities
      SET is_verified = false, verified_at = NULL
      WHERE is_verified = true
        AND verified_at IS NULL
        AND posted_by IS NULL
    `);
    console.log(`Unverified ${r2.rowCount} bulk-seeded opportunities (no verifier).`);

    const r3 = await client.query(`
      UPDATE success_stories SET verified = false WHERE verified = true
    `);
    console.log(`Marked ${r3.rowCount} success stories as unverified (require admin review).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
