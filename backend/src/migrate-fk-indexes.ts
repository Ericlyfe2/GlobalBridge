/**
 * Indexes for foreign keys that had none.
 *
 * An audit of pg_constraint against pg_index found 12 foreign-key columns with
 * no leading index. Postgres does not create one automatically for a FK — only
 * for PRIMARY KEY and UNIQUE — so every lookup or join on these columns is a
 * sequential scan, and every DELETE on the *referenced* row has to scan the
 * child table to enforce the constraint.
 *
 * None of this is visible today: the largest table here has a couple of dozen
 * rows, and on a table that small Postgres correctly prefers a seq scan anyway.
 * It becomes visible somewhere in the low thousands, and by then it shows up as
 * "the app got slow" rather than as anything pointing at these columns.
 *
 * ── Which of these actually matter ──────────────────────────────────────────
 * Hot paths, worth having before real traffic:
 *   safe_space_replies.post_id        every post-detail view fetches by post
 *   safe_space_{upvotes,support}.user_id   "have I already reacted" checks
 *   conversations.participant_b       the lookup is participant_a AND participant_b
 *   peer_review_submissions.user_id   "my submissions"
 *   peer_review_reviews.reviewer_id   "my reviews" + the credit calculation
 *   safe_space_posts.user_id          a user's own anonymous post history
 *
 * Attribution/audit columns, included for completeness rather than need:
 *   mentor_profiles.verified_by, knowledge_base.created_by,
 *   platform_settings.updated_by, library_items.contributor_id
 *
 * ── Safety ──────────────────────────────────────────────────────────────────
 * CREATE INDEX CONCURRENTLY does not take a write lock, so this is safe to run
 * against a live database. It cannot run inside a transaction block, which is
 * why each statement is issued separately rather than wrapped. IF NOT EXISTS
 * makes the whole script idempotent — re-running it is a no-op.
 *
 * A CONCURRENTLY build that fails leaves an INVALID index behind; the script
 * reports any it finds at the end so they can be dropped and retried rather
 * than sitting there silently not being used.
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** [index name, table, column] — name kept explicit so IF NOT EXISTS is reliable. */
const INDEXES: [string, string, string][] = [
  ["idx_safe_space_replies_post_id", "safe_space_replies", "post_id"],
  ["idx_safe_space_replies_user_id", "safe_space_replies", "user_id"],
  ["idx_safe_space_posts_user_id", "safe_space_posts", "user_id"],
  ["idx_safe_space_upvotes_user_id", "safe_space_upvotes", "user_id"],
  ["idx_safe_space_support_user_id", "safe_space_support", "user_id"],
  ["idx_conversations_participant_b", "conversations", "participant_b"],
  ["idx_peer_review_submissions_user_id", "peer_review_submissions", "user_id"],
  ["idx_peer_review_reviews_reviewer_id", "peer_review_reviews", "reviewer_id"],
  ["idx_mentor_profiles_verified_by", "mentor_profiles", "verified_by"],
  ["idx_knowledge_base_created_by", "knowledge_base", "created_by"],
  ["idx_platform_settings_updated_by", "platform_settings", "updated_by"],
  ["idx_library_items_contributor_id", "library_items", "contributor_id"],
];

async function migrate() {
  let created = 0;
  let skipped = 0;

  for (const [name, table, column] of INDEXES) {
    // Skip cleanly if the table isn't present in this environment rather than
    // aborting the whole run — not every deployment has every feature's tables.
    const exists = await pool.query(`SELECT to_regclass($1) AS t`, [table]);
    if (!exists.rows[0].t) {
      console.log(`·  ${name.padEnd(38)} skipped (no table ${table})`);
      skipped++;
      continue;
    }

    const before = await pool.query(`SELECT to_regclass($1) AS i`, [name]);
    await pool.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${table} (${column})`,
    );
    if (before.rows[0].i) {
      console.log(`·  ${name.padEnd(38)} already present`);
      skipped++;
    } else {
      console.log(`✔  ${name.padEnd(38)} created on ${table}(${column})`);
      created++;
    }
  }

  // A CONCURRENTLY build that fails leaves the index behind marked invalid,
  // where it costs write throughput and is never used for reads.
  const invalid = await pool.query(`
    SELECT c.relname
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE NOT i.indisvalid AND c.relname = ANY($1)
  `, [INDEXES.map(([n]) => n)]);

  console.log(`\n${created} created, ${skipped} already present or skipped.`);
  if (invalid.rows.length) {
    console.log(
      `\n⚠ INVALID indexes (a concurrent build failed) — drop and re-run:\n` +
      invalid.rows.map((r) => `    DROP INDEX ${r.relname};`).join("\n"),
    );
  }

  await pool.end();
}

migrate().catch(async (e) => {
  // Non-zero exit: CI and deploy pipelines must be able to see this fail.
  console.error("❌ Migration failed:", e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
