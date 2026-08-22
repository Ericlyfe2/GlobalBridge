/**
 * Regression guard for schema drift.
 *
 * Ten tables — safe_space_*, peer_review_*, library_items, contact_messages,
 * newsletter_subscribers, push_subscriptions — used to exist only inside
 * hand-run `migrate-*.ts` scripts. A database provisioned from db/schema.sql
 * alone was missing all of them, so Safe Space, Peer Review, Library, the
 * contact form, the newsletter and web push all 500'd on a fresh environment.
 *
 * This test reads every table name the backend actually queries and asserts
 * db/schema.sql declares it. It runs with no database connection, so it works
 * in CI, and it fails the moment a new feature adds a table via a side-channel
 * migration instead of the canonical schema.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const SRC = path.join(__dirname, "..");
const SCHEMA_PATH = path.join(SRC, "..", "..", "db", "schema.sql");

/** Source files that define runtime queries. Excludes tests, migrations and verification scripts. */
function runtimeSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") walk(full);
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.startsWith("migrate-") &&
        !entry.name.startsWith("seed-") &&
        // Verification scripts inspect catalog tables (pg_constraint,
        // information_schema) that are not application schema.
        !entry.name.startsWith("verify-")
      ) {
        out.push(full);
      }
    }
  };
  walk(SRC);
  return out;
}

/** Table names appearing after FROM / JOIN / INTO / UPDATE in SQL strings. */
function referencedTables(): Map<string, string[]> {
  // Reserved words that can follow these keywords without being a table.
  const NOT_A_TABLE = new Set([
    "select", "the", "this", "a", "an", "it", "unnest", "values", "set", "where",
  ]);
  const found = new Map<string, string[]>();
  for (const file of runtimeSources()) {
    const src = readFileSync(file, "utf8");
    // Only look inside backtick template literals — that is where SQL lives here.
    for (const [, sql] of src.matchAll(/`([^`]*)`/g)) {
      for (const [, , table] of sql.matchAll(/\b(FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/gi)) {
        const t = table.toLowerCase();
        if (NOT_A_TABLE.has(t)) continue;
        const rel = path.relative(SRC, file).replace(/\\/g, "/");
        const seen = found.get(t) ?? [];
        if (!seen.includes(rel)) seen.push(rel);
        found.set(t, seen);
      }
    }
  }
  return found;
}

/** Table names db/schema.sql creates. */
function declaredTables(): Set<string> {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const names = new Set<string>();
  for (const [, name] of schema.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi)) {
    names.add(name.toLowerCase());
  }
  return names;
}

describe("db/schema.sql is the canonical schema", () => {
  const referenced = referencedTables();
  const declared = declaredTables();

  // CTE / derived-table aliases and non-table relations that legitimately
  // appear after FROM but are never created as tables.
  const ALIASES = new Set(["recent", "information_schema", "pg_type", "pg_enum"]);

  it("declares every table the backend queries", () => {
    const missing = [...referenced.entries()]
      .filter(([t]) => !declared.has(t) && !ALIASES.has(t))
      .map(([t, files]) => `${t}  (used in ${files.join(", ")})`);

    expect(missing, `Tables queried at runtime but absent from db/schema.sql:\n  ${missing.join("\n  ")}\n\nAdd them to db/schema.sql — a one-off migrate-*.ts script is not enough, because a fresh environment provisioned from the canonical schema will 500 on these code paths.`)
      .toEqual([]);
  });

  it("covers the tables that were previously migration-only", () => {
    // Explicit list so this can never silently regress to the old state, even
    // if the reference scanner above changes shape.
    for (const t of [
      "safe_space_posts", "safe_space_replies", "safe_space_upvotes", "safe_space_support",
      "peer_review_submissions", "peer_review_reviews",
      "library_items", "contact_messages", "newsletter_subscribers", "push_subscriptions",
    ]) {
      expect(declared, `db/schema.sql must declare ${t}`).toContain(t);
    }
  });

  it("carries the columns that only existed as ad-hoc ALTERs", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    expect(schema).toMatch(/mentor_bookings\s+ADD COLUMN IF NOT EXISTS student_timezone/i);
    expect(schema).toMatch(/ai_conversations\s+ADD COLUMN IF NOT EXISTS message_count/i);
  });
});
