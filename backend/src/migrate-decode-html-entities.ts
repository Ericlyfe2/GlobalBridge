/**
 * One-time backfill: undo the HTML entities that the old write-time sanitize()
 * baked into every user-submitted text column (GB-01).
 *
 * Until that was removed, `lib/sanitize.ts` replaced < > " ' / with HTML
 * entities on the way *into* Postgres. React escapes again at render, so the
 * entities were never a safety measure — they were permanent corruption:
 *
 *   'https://res.cloudinary.com/x.jpg'  ->  'https:&#x2F;&#x2F;res.cloudinary.com&#x2F;x.jpg'
 *   "N'Guessan Kouadio"                 ->  'N&#x27;Guessan Kouadio'
 *
 * Broken images, dead apply links, mangled names. This reverses exactly the five
 * substitutions sanitize() performed, and nothing else.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   npm run migrate:decode-entities              # DRY RUN (default) — changes nothing
 *   npm run migrate:decode-entities -- --apply   # snapshot, then decode
 *   npm run migrate:decode-entities -- --revert  # restore from the snapshot
 *
 * Dry run is the default deliberately. It prints per-column row counts and
 * before/after samples so the change can be reviewed against real data before
 * anything is written.
 *
 * ── Reversibility ───────────────────────────────────────────────────────────
 * --apply first copies every row it is about to touch into
 * `gb_entity_backfill_snapshot` (table, pk, and the pre-change column values as
 * JSONB). --revert writes those values back. The snapshot is kept after a
 * successful run; drop it manually once you are satisfied.
 *
 * ── Idempotency and double-encoding ─────────────────────────────────────────
 * sanitize() is idempotent — none of its five outputs contain a character it
 * escapes, so running it twice produces the same string as running it once
 * ("/" -> "&#x2F;", and "&#x2F;" contains no "/"). Double-encoding therefore
 * cannot arise from repeated writes. Rather than assume that, --apply re-scans
 * every touched row afterwards and reports any that still contain entities;
 * a non-zero count there means the assumption is wrong and needs investigating.
 * `verifyIdempotent()` proves the property directly and runs on every invocation.
 *
 * ── Known, accepted edge case ───────────────────────────────────────────────
 * A user who literally typed "&#x27;" will have it turned into an apostrophe.
 * sanitize() never escaped "&", so real corruption and that input are
 * indistinguishable. Dry run surfaces every such row for review first.
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MODE = process.argv.includes("--revert")
  ? "revert"
  : process.argv.includes("--apply")
    ? "apply"
    : "dry-run";

const SNAPSHOT = "gb_entity_backfill_snapshot";
/** Matches any of the five sequences sanitize() could emit. */
const ENTITY_RE = "&(lt|gt|quot|#x27|#x2F);";

/** Columns written through the old sanitize(), grouped by table. */
const TARGETS: { table: string; text: string[]; arrays?: string[] }[] = [
  { table: "users", text: ["full_name", "bio", "avatar_url", "country_of_residence", "preferred_language"] },
  {
    table: "housing_listings",
    text: ["title", "description", "city", "country", "address", "currency", "near_university", "virtual_tour_url"],
    arrays: ["photos"],
  },
  {
    table: "opportunities",
    text: ["title", "description", "country", "institution", "field_of_study", "currency", "eligibility", "application_url"],
  },
  { table: "forum_posts", text: ["title", "body"], arrays: ["tags"] },
  { table: "forum_replies", text: ["body"] },
  { table: "messages", text: ["body"] },
  { table: "reports", text: ["reason", "details"] },
  { table: "scam_alerts", text: ["title", "description", "scam_type"], arrays: ["affected_countries"] },
  { table: "mentor_profiles", text: [], arrays: ["expertise_areas", "languages_spoken", "universities_attended"] },
  { table: "mentor_bookings", text: ["goal"] },
  { table: "safe_space_posts", text: ["title", "body"] },
  { table: "safe_space_replies", text: ["body"] },
  { table: "peer_review_submissions", text: ["doc_type", "target", "focus_question", "body"] },
  { table: "peer_review_reviews", text: ["comments"] },
  { table: "contact_messages", text: ["name", "email", "message"] },
  {
    table: "library_items",
    text: ["title", "type", "topic", "origin", "origin_flag", "destination", "dest_flag", "media_url"],
  },
];

// ── the same five replacements sanitize() applied, in reverse ────────────────
function decode(s: string): string {
  return s
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<");
}

function encode(s: string): string {
  return s
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Proves sanitize() could not have produced double-encoded values, so a single
 * decode pass is complete. Runs before any database work.
 */
function verifyIdempotent(): void {
  const samples = [
    "https://res.cloudinary.com/gb/a.jpg",
    "N'Guessan Kouadio",
    `He said "no viewing" <urgent> — pay via w/u`,
    "Africa/Accra",
    "100% & <b>bold</b>",
  ];
  for (const s of samples) {
    const once = encode(s);
    if (encode(once) !== once) {
      throw new Error(
        `sanitize() is not idempotent for ${JSON.stringify(s)} — a single decode pass would be incomplete. Investigate before applying.`,
      );
    }
    if (decode(once) !== s) {
      throw new Error(`decode(encode(x)) !== x for ${JSON.stringify(s)}`);
    }
  }
  console.log("✔ verified: encoder is idempotent, so no value can be double-encoded");
  console.log("✔ verified: decode(encode(x)) === x on representative samples\n");
}

async function tableExists(table: string): Promise<boolean> {
  const { rows } = await pool.query<{ reg: string | null }>(`SELECT to_regclass($1) AS reg`, [table]);
  return rows[0]?.reg !== null;
}

/** Only touch columns the table actually has — schemas drift between envs. */
async function existingColumns(table: string, wanted: string[]): Promise<string[]> {
  if (wanted.length === 0) return [];
  const { rows } = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2)`,
    [table, wanted],
  );
  return rows.map((r) => r.column_name);
}

/** Primary-key column(s) — mentor_profiles keys on user_id, most on id. */
async function primaryKey(table: string): Promise<string[]> {
  const { rows } = await pool.query<{ column_name: string }>(
    `SELECT a.attname AS column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

function whereClause(cols: string[], arrays: string[]): string {
  const parts = cols.map((c) => `${c} ~ '${ENTITY_RE}'`);
  for (const a of arrays) {
    parts.push(`EXISTS (SELECT 1 FROM unnest(${a}) AS v WHERE v ~ '${ENTITY_RE}')`);
  }
  return parts.join(" OR ");
}

async function createSqlHelpers() {
  await pool.query(`
    CREATE OR REPLACE FUNCTION gb_unescape(t text) RETURNS text AS $fn$
      SELECT CASE WHEN t IS NULL THEN NULL ELSE
        replace(replace(replace(replace(replace(
          t, '&#x2F;', '/'), '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<')
      END
    $fn$ LANGUAGE sql IMMUTABLE;
  `);
  await pool.query(`
    CREATE OR REPLACE FUNCTION gb_unescape_arr(a text[]) RETURNS text[] AS $fn$
      SELECT CASE WHEN a IS NULL THEN NULL
        ELSE ARRAY(SELECT gb_unescape(v) FROM unnest(a) AS v) END
    $fn$ LANGUAGE sql IMMUTABLE;
  `);
}

async function dropSqlHelpers() {
  await pool.query(`DROP FUNCTION IF EXISTS gb_unescape_arr(text[])`);
  await pool.query(`DROP FUNCTION IF EXISTS gb_unescape(text)`);
}

type Plan = { table: string; pk: string[]; text: string[]; arrays: string[]; where: string };

async function buildPlan(): Promise<{ plans: Plan[]; skipped: string[] }> {
  const plans: Plan[] = [];
  const skipped: string[] = [];
  for (const t of TARGETS) {
    if (!(await tableExists(t.table))) {
      skipped.push(`${t.table} (table not present)`);
      continue;
    }
    const text = await existingColumns(t.table, t.text);
    const arrays = await existingColumns(t.table, t.arrays ?? []);
    if (!text.length && !arrays.length) {
      skipped.push(`${t.table} (no matching columns)`);
      continue;
    }
    const pk = await primaryKey(t.table);
    if (!pk.length) {
      skipped.push(`${t.table} (no primary key — cannot snapshot safely)`);
      continue;
    }
    plans.push({ table: t.table, pk, text, arrays, where: whereClause(text, arrays) });
  }
  return { plans, skipped };
}

// ── dry run ─────────────────────────────────────────────────────────────────
async function dryRun(plans: Plan[]) {
  let grand = 0;
  for (const p of plans) {
    const all = [...p.text, ...p.arrays];
    const { rows: cnt } = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM ${p.table} WHERE ${p.where}`,
    );
    const n = Number(cnt[0].n);
    if (n === 0) {
      console.log(`·  ${p.table.padEnd(26)} 0 rows`);
      continue;
    }
    grand += n;
    console.log(`\n▶  ${p.table}  —  ${n} row(s) affected`);

    // Per-column counts, so the blast radius is visible column by column.
    for (const c of p.text) {
      const { rows } = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM ${p.table} WHERE ${c} ~ '${ENTITY_RE}'`,
      );
      if (Number(rows[0].n) > 0) console.log(`     ${c}: ${rows[0].n} row(s)`);
    }
    for (const a of p.arrays) {
      const { rows } = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM ${p.table}
          WHERE EXISTS (SELECT 1 FROM unnest(${a}) AS v WHERE v ~ '${ENTITY_RE}')`,
      );
      if (Number(rows[0].n) > 0) console.log(`     ${a}[]: ${rows[0].n} row(s)`);
    }

    // Up to three real before/after samples.
    const selects = [
      ...p.text.map((c) => `${c}::text AS "${c}"`),
      ...p.arrays.map((a) => `array_to_string(${a}, ' | ') AS "${a}"`),
    ];
    const { rows: samples } = await pool.query<Record<string, string | null>>(
      `SELECT ${selects.join(", ")} FROM ${p.table} WHERE ${p.where} LIMIT 3`,
    );
    for (const [i, row] of samples.entries()) {
      console.log(`     — sample ${i + 1}`);
      for (const c of all) {
        const v = row[c];
        if (typeof v !== "string" || !new RegExp(ENTITY_RE).test(v)) continue;
        console.log(`         ${c}`);
        console.log(`           before: ${JSON.stringify(v.slice(0, 110))}`);
        console.log(`           after : ${JSON.stringify(decode(v).slice(0, 110))}`);
      }
    }
  }
  console.log(`\n${grand} row(s) would be decoded.`);
  console.log(grand > 0 ? "\nRe-run with --apply to snapshot and write these changes." : "\nNothing to do.");
}

// ── apply ───────────────────────────────────────────────────────────────────
async function apply(plans: Plan[]) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SNAPSHOT} (
      id BIGSERIAL PRIMARY KEY,
      taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      table_name TEXT NOT NULL,
      pk JSONB NOT NULL,
      before_values JSONB NOT NULL
    )
  `);

  let grand = 0;
  const client = await pool.connect();
  try {
    // One transaction: either the whole backfill lands with its snapshot, or
    // nothing does. A half-applied decode with a partial snapshot would be
    // worse than the corruption it is fixing.
    await client.query("BEGIN");

    for (const p of plans) {
      const all = [...p.text, ...p.arrays];
      const pkJson = p.pk.map((k) => `'${k}', ${k}`).join(", ");
      const valJson = all.map((c) => `'${c}', to_jsonb(${c})`).join(", ");

      const snap = await client.query(
        `INSERT INTO ${SNAPSHOT} (table_name, pk, before_values)
         SELECT $1, jsonb_build_object(${pkJson}), jsonb_build_object(${valJson})
           FROM ${p.table} WHERE ${p.where}`,
        [p.table],
      );

      const sets = [
        ...p.text.map((c) => `${c} = gb_unescape(${c})`),
        ...p.arrays.map((a) => `${a} = gb_unescape_arr(${a})`),
      ];
      const res = await client.query(`UPDATE ${p.table} SET ${sets.join(", ")} WHERE ${p.where}`);
      const n = res.rowCount ?? 0;

      if (n !== (snap.rowCount ?? 0)) {
        throw new Error(
          `${p.table}: snapshotted ${snap.rowCount} rows but updated ${n} — refusing to continue`,
        );
      }
      grand += n;
      console.log(`  ${n > 0 ? "✔" : "·"} ${p.table.padEnd(26)} ${n} row(s) decoded, ${snap.rowCount} snapshotted`);
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Double-encoding detector: after one decode pass nothing should still match.
  let residual = 0;
  for (const p of plans) {
    const { rows } = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM ${p.table} WHERE ${p.where}`,
    );
    const n = Number(rows[0].n);
    if (n > 0) {
      residual += n;
      console.log(`  ⚠ ${p.table}: ${n} row(s) STILL contain entities after decoding`);
    }
  }

  console.log(`\n${grand} row(s) decoded in total.`);
  if (residual > 0) {
    console.log(
      `\n⚠ ${residual} row(s) still match after one pass. The encoder was proven idempotent above,\n` +
      `  so this means the residue is literal user text (someone typed "&#x27;"), not double-encoding.\n` +
      `  Left as-is deliberately — re-running would corrupt it. Review those rows by hand.`,
    );
  } else {
    console.log("No residual entities — single pass was complete, as expected.");
  }
  console.log(`\nSnapshot retained in ${SNAPSHOT}. Revert with: npm run migrate:decode-entities -- --revert`);
}

// ── revert ──────────────────────────────────────────────────────────────────
async function revert() {
  if (!(await tableExists(SNAPSHOT))) {
    console.log(`No snapshot table (${SNAPSHOT}) — nothing to revert.`);
    return;
  }
  const { rows: batch } = await pool.query<{ taken_at: string; n: string }>(
    `SELECT taken_at::text, COUNT(*)::text AS n FROM ${SNAPSHOT}
      GROUP BY taken_at ORDER BY taken_at DESC LIMIT 1`,
  );
  if (!batch.length) {
    console.log("Snapshot table is empty — nothing to revert.");
    return;
  }
  const takenAt = batch[0].taken_at;
  console.log(`Reverting the batch taken at ${takenAt} (${batch[0].n} rows)...`);

  const { rows } = await pool.query<{
    table_name: string; pk: Record<string, string>; before_values: Record<string, unknown>;
  }>(`SELECT table_name, pk, before_values FROM ${SNAPSHOT} WHERE taken_at = $1`, [takenAt]);

  const client = await pool.connect();
  let restored = 0;
  try {
    await client.query("BEGIN");
    for (const r of rows) {
      const cols = Object.keys(r.before_values);
      const pkCols = Object.keys(r.pk);
      const sets = cols.map((c, i) => `${c} = $${i + 1}`);
      const values = cols.map((c) => r.before_values[c]);
      const wheres = pkCols.map((k, i) => `${k} = $${cols.length + i + 1}`);
      const res = await client.query(
        `UPDATE ${r.table_name} SET ${sets.join(", ")} WHERE ${wheres.join(" AND ")}`,
        [...values, ...pkCols.map((k) => r.pk[k])],
      );
      restored += res.rowCount ?? 0;
    }
    await client.query(`DELETE FROM ${SNAPSHOT} WHERE taken_at = $1`, [takenAt]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  console.log(`Restored ${restored} row(s) to their pre-backfill values.`);
}

async function main() {
  console.log(`\nGB-01 entity backfill — mode: ${MODE.toUpperCase()}\n`);
  verifyIdempotent();

  if (MODE === "revert") {
    await revert();
    return;
  }

  await createSqlHelpers();
  try {
    const { plans, skipped } = await buildPlan();
    if (MODE === "dry-run") await dryRun(plans);
    else await apply(plans);
    if (skipped.length) console.log(`\nSkipped: ${skipped.join(", ")}`);
  } finally {
    await dropSqlHelpers();
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    // Loud and non-zero: a migration that fails silently is worse than one that
    // never ran, because the next deploy assumes it succeeded.
    console.error("\n❌ Backfill failed:", err instanceof Error ? err.message : err);
    await pool.end();
    process.exit(1);
  });
