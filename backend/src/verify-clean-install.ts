/**
 * Clean-install smoke test: empty database -> working schema -> real writes.
 *
 * GB-02 was that a database provisioned the documented way, from db/schema.sql,
 * was missing ten tables the application queries. Nothing caught it because
 * nobody ever provisioned a fresh environment — the working database had been
 * grown by hand through one-off migrate-*.ts scripts.
 *
 * This is the guard: it applies the canonical schema to a genuinely empty
 * namespace and then writes one row into every table the backend touches. If
 * schema.sql drifts from what the code needs, in either structure or column
 * type, this fails.
 *
 *   npm run verify:clean-install
 *
 * It creates a throwaway Postgres schema rather than a throwaway database, so
 * it runs against any DATABASE_URL — including a shared dev instance — without
 * touching existing data, and drops it on the way out even on failure.
 */

import "dotenv/config";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const SCHEMA_SQL = path.join(__dirname, "..", "..", "db", "schema.sql");
const NAMESPACE = `gb_clean_install_${Date.now().toString(36)}`;

/**
 * Every table the backend queries at runtime, with a minimal valid row.
 * `$user` is substituted with a seeded user id, `$mentor` with a mentor id.
 */
const SMOKE_WRITES: { table: string; sql: string }[] = [
  { table: "users", sql: `INSERT INTO users (email, full_name, role, country_of_origin) VALUES ('smoke@example.com','Smoke Test','student','Ghana')` },
  { table: "mentor_profiles", sql: `INSERT INTO mentor_profiles (user_id, timezone) VALUES ($mentor,'Africa/Accra')` },
  { table: "employer_profiles", sql: `INSERT INTO employer_profiles (user_id, company_name) VALUES ($user,'Smoke Co')` },
  { table: "mentor_availability", sql: `INSERT INTO mentor_availability (mentor_id, weekday, start_time, end_time) VALUES ($mentor,1,'09:00','17:00')` },
  { table: "mentor_bookings", sql: `INSERT INTO mentor_bookings (mentor_id, student_id, slot_date, slot_time, duration_min, student_timezone) VALUES ($mentor,$user,'2027-06-01','10:00',30,'UTC')` },
  { table: "opportunities", sql: `INSERT INTO opportunities (posted_by, type, title, description, country) VALUES ($user,'scholarship','Smoke Scholarship','A description long enough to pass validation.','Canada')` },
  { table: "housing_listings", sql: `INSERT INTO housing_listings (landlord_id, title, city, country, rent_amount, currency) VALUES ($user,'Smoke Room','Berlin','Germany',650,'EUR')` },
  { table: "forum_categories", sql: `INSERT INTO forum_categories (name, slug) VALUES ('Smoke','smoke')` },
  { table: "forum_posts", sql: `INSERT INTO forum_posts (category_id, author_id, title, body) VALUES ((SELECT id FROM forum_categories LIMIT 1),$user,'Smoke post','Body text for the smoke test.')` },
  { table: "forum_replies", sql: `INSERT INTO forum_replies (post_id, author_id, body) VALUES ((SELECT id FROM forum_posts LIMIT 1),$user,'A reply.')` },
  { table: "forum_votes", sql: `INSERT INTO forum_votes (user_id, target_type, target_id, value) VALUES ($user,'post',(SELECT id FROM forum_posts LIMIT 1),1)` },
  { table: "conversations", sql: `INSERT INTO conversations (participant_a, participant_b) VALUES ($user,$mentor)` },
  { table: "messages", sql: `INSERT INTO messages (conversation_id, sender_id, body) VALUES ((SELECT id FROM conversations LIMIT 1),$user,'Hello.')` },
  { table: "notifications", sql: `INSERT INTO notifications (user_id, kind, title) VALUES ($user,'info','Smoke')` },
  { table: "saved_items", sql: `INSERT INTO saved_items (user_id, item_type, item_id) VALUES ($user,'opportunity',(SELECT id FROM opportunities LIMIT 1))` },
  { table: "user_documents", sql: `INSERT INTO user_documents (user_id, purpose, url, storage_key, original_name, mime, size_bytes) VALUES ($user,'avatar','/api/uploads/files/k.png','k.png','k.png','image/png',1024)` },
  { table: "visa_checklists", sql: `INSERT INTO visa_checklists (user_id, origin_country, destination_country, visa_type, items) VALUES ($user,'Ghana','Canada','study','[{"id":"a","title":"Step"}]'::jsonb)` },
  { table: "reports", sql: `INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($user,'listing',(SELECT id FROM housing_listings LIMIT 1),'Smoke')` },
  { table: "scam_alerts", sql: `INSERT INTO scam_alerts (reported_by, title, description) VALUES ($user,'Smoke alert','A description of the scam alert.')` },
  { table: "success_stories", sql: `INSERT INTO success_stories (author_id, name, origin, origin_flag, destination, dest_flag, program, outcome, year, quote) VALUES ($user,'Smoke','Ghana','gh','Canada','ca','MSc CS','Accepted',2026,'It worked.')` },
  { table: "knowledge_base", sql: `INSERT INTO knowledge_base (title, content, category) VALUES ('Smoke','Content.','visa')` },
  { table: "trusted_sources", sql: `INSERT INTO trusted_sources (name, type, base_url) VALUES ('Smoke','gov','https://smoke.example')` },
  { table: "ai_conversations", sql: `INSERT INTO ai_conversations (user_id, title) VALUES ($user,'Smoke')` },
  { table: "ai_messages", sql: `INSERT INTO ai_messages (conversation_id, role, content) VALUES ((SELECT id FROM ai_conversations LIMIT 1),'user','Hi')` },
  { table: "ai_usage_log", sql: `INSERT INTO ai_usage_log (user_id, feature, model, input_tokens, output_tokens) VALUES ($user,'chat','gpt-4o-mini',10,5)` },
  { table: "ai_feedback", sql: `INSERT INTO ai_feedback (message_id, user_id, rating) VALUES ((SELECT id FROM ai_messages LIMIT 1),$user,5)` },
  { table: "platform_settings", sql: `INSERT INTO platform_settings (key, value) VALUES ('smoke_key','"v"'::jsonb)` },
  { table: "admin_audit_log", sql: `INSERT INTO admin_audit_log (admin_id, action, target_type) VALUES ($user,'smoke.action','user')` },
  { table: "activity_log", sql: `INSERT INTO activity_log (user_id, action) VALUES ($user,'smoke')` },
  { table: "push_subscriptions", sql: `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($user,'https://push.example/1','p','a')` },
  { table: "contact_messages", sql: `INSERT INTO contact_messages (topic, name, email, message) VALUES ('general','Smoke','s@e.com','Hello')` },
  { table: "newsletter_subscribers", sql: `INSERT INTO newsletter_subscribers (email) VALUES ('smoke@example.com')` },
  { table: "library_items", sql: `INSERT INTO library_items (contributor_id, title, type, topic, duration_min, origin, origin_flag, destination, dest_flag, media_url) VALUES ($mentor,'Smoke','podcast','visa',20,'Ghana','gh','Canada','ca','https://media.example/1')` },
  { table: "safe_space_posts", sql: `INSERT INTO safe_space_posts (user_id, topic, alias, alias_color, title, body) VALUES ($user,'legal','BlueFox-1234','bg-sky-500','Smoke','Body of the post.')` },
  { table: "safe_space_replies", sql: `INSERT INTO safe_space_replies (post_id, user_id, alias, alias_color, body) VALUES ((SELECT id FROM safe_space_posts LIMIT 1),$user,'GreenOwl-1','bg-leaf-500','Reply.')` },
  { table: "safe_space_upvotes", sql: `INSERT INTO safe_space_upvotes (post_id, user_id) VALUES ((SELECT id FROM safe_space_posts LIMIT 1),$user)` },
  { table: "safe_space_support", sql: `INSERT INTO safe_space_support (post_id, user_id) VALUES ((SELECT id FROM safe_space_posts LIMIT 1),$user)` },
  { table: "peer_review_submissions", sql: `INSERT INTO peer_review_submissions (user_id, alias, alias_color, doc_type, target, body) VALUES ($user,'QuietHawk-9','bg-clay-500','SOP','LSE','Essay body.')` },
  { table: "peer_review_reviews", sql: `INSERT INTO peer_review_reviews (submission_id, reviewer_id, alias, alias_color, rubric_scores, overall_score) VALUES ((SELECT id FROM peer_review_submissions LIMIT 1),$mentor,'AmberDove-2','bg-amber-500','{"hook":70}'::jsonb,70)` },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let failed = false;

  try {
    console.log(`\nProvisioning an empty namespace: ${NAMESPACE}\n`);
    await client.query(`CREATE SCHEMA ${NAMESPACE}`);
    // Extensions live at database level; the namespace comes first so every
    // CREATE TABLE in schema.sql lands there rather than in public.
    await client.query(`SET search_path TO ${NAMESPACE}, public`);

    console.log("1. applying db/schema.sql ...");
    await client.query(fs.readFileSync(SCHEMA_SQL, "utf8"));

    const { rows: tables } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [NAMESPACE],
    );
    console.log(`   created ${tables.length} tables`);

    console.log("\n2. writing one row into every table the backend uses ...");
    const seedUser = await client.query<{ id: string }>(
      `INSERT INTO users (email, full_name, role, country_of_origin)
       VALUES ('seed-student@example.com','Seed Student','student','Ghana') RETURNING id`,
    );
    const seedMentor = await client.query<{ id: string }>(
      `INSERT INTO users (email, full_name, role, country_of_origin)
       VALUES ('seed-mentor@example.com','Seed Mentor','mentor','Ghana') RETURNING id`,
    );
    const USER = seedUser.rows[0].id;
    const MENTOR = seedMentor.rows[0].id;

    const failures: string[] = [];
    for (const { table, sql } of SMOKE_WRITES) {
      const stmt = sql.replace(/\$user/g, `'${USER}'`).replace(/\$mentor/g, `'${MENTOR}'`);
      try {
        await client.query(stmt);
        process.stdout.write(`   ok  ${table}\n`);
      } catch (e) {
        failures.push(`${table}: ${(e as Error).message}`);
        process.stdout.write(`   FAIL ${table}: ${(e as Error).message}\n`);
      }
    }

    console.log("\n3. checking the constraints the audit added ...");
    const checks: [string, string][] = [
      ["mentor_bookings overlap constraint", `SELECT 1 FROM pg_constraint WHERE conname = 'mentor_bookings_no_overlap'`],
      ["slot_time is TIME, not text", `SELECT 1 FROM information_schema.columns WHERE table_schema = '${NAMESPACE}' AND table_name = 'mentor_bookings' AND column_name = 'slot_time' AND data_type = 'time without time zone'`],
      ["users.share_country_of_origin", `SELECT 1 FROM information_schema.columns WHERE table_schema = '${NAMESPACE}' AND table_name = 'users' AND column_name = 'share_country_of_origin'`],
      ["users.profile_completed_at", `SELECT 1 FROM information_schema.columns WHERE table_schema = '${NAMESPACE}' AND table_name = 'users' AND column_name = 'profile_completed_at'`],
    ];
    for (const [label, sql] of checks) {
      const { rowCount } = await client.query(sql);
      console.log(`   ${rowCount ? "ok " : "FAIL"} ${label}`);
      if (!rowCount) failures.push(label);
    }

    if (failures.length) {
      failed = true;
      console.error(`\n${failures.length} failure(s):\n  ${failures.join("\n  ")}`);
    } else {
      console.log(`\nClean install verified: ${tables.length} tables, ${SMOKE_WRITES.length} write paths, all constraints present.`);
    }
  } catch (e) {
    failed = true;
    console.error("\nClean install FAILED:", e instanceof Error ? e.message : e);
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${NAMESPACE} CASCADE`).catch(() => {});
    client.release();
    await pool.end();
  }

  if (failed) process.exit(1);
}

main();
