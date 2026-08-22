import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { costUsd, DAILY_CEILING_USD } from "../lib/ai-pricing";

export const aiRouter = Router();

// ====================
// CONVERSATION MANAGEMENT
// ====================

const createConversationSchema = z.object({
  title: z.string().max(255).optional(),
  origin_country: z.string().optional(),
  destination_country: z.string().optional(),
  visa_type: z.string().optional(),
});

aiRouter.post("/conversations", requireAuth, async (req, res, next) => {
  try {
    const body = createConversationSchema.parse(req.body);
    const row = await queryOne(
      `INSERT INTO ai_conversations (user_id, title, origin_country, destination_country, visa_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, title, created_at`,
      [req.user!.sub, body.title ?? "New conversation", body.origin_country ?? null, body.destination_country ?? null, body.visa_type ?? null],
    );
    res.status(201).json({ conversation: row });
  } catch (err) {
    next(err);
  }
});

aiRouter.get("/conversations", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const rows = await query(
      `SELECT id, title, origin_country, destination_country, visa_type, message_count, summary, topics, is_active, created_at, updated_at
       FROM ai_conversations
       WHERE user_id = $1 AND is_active = true
       ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.sub, limit, offset],
    );
    res.json({ conversations: rows });
  } catch (err) {
    next(err);
  }
});

aiRouter.get("/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    const conversation = await queryOne(
      `SELECT id, title, origin_country, destination_country, visa_type, message_count, summary, topics, is_active, created_at, updated_at
       FROM ai_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.sub],
    );
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const messages = await query(
      `SELECT id, role, content, sources, created_at FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id],
    );
    res.json({ conversation, messages });
  } catch (err) {
    next(err);
  }
});

aiRouter.patch("/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().max(255).optional(),
      is_active: z.boolean().optional(),
    }).parse(req.body);
    const row = await queryOne(
      `UPDATE ai_conversations SET
        title = COALESCE($1, title),
        is_active = COALESCE($2, is_active),
        updated_at = NOW()
       WHERE id = $3 AND user_id = $4 RETURNING id, title, updated_at`,
      [body.title ?? null, body.is_active ?? null, req.params.id, req.user!.sub],
    );
    if (!row) return res.status(404).json({ error: "Conversation not found" });
    res.json({ conversation: row });
  } catch (err) {
    next(err);
  }
});

aiRouter.delete("/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    await query(
      `UPDATE ai_conversations SET is_active = false, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.sub],
    );
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ====================
// USAGE LEDGER + DAILY SPEND CEILING
// ====================
// ai_usage_log had nine read sites in routes/admin.ts and zero write sites
// anywhere, so the admin AI observability console reported zeros forever and
// nothing capped what a single account could spend. These two endpoints are the
// write side and the enforcement point.

/** Today's spend for the caller, and whether they have hit the ceiling. */
aiRouter.get("/usage/today", requireAuth, async (req, res, next) => {
  try {
    // Grouped by model because each model has its own price; summing tokens
    // across models first would apply one price to all of them.
    const rows = await query<{ model: string | null; in_tok: string; out_tok: string; calls: string }>(
      `SELECT model,
              COALESCE(SUM(input_tokens), 0)::text  AS in_tok,
              COALESCE(SUM(output_tokens), 0)::text AS out_tok,
              COUNT(*)::text                        AS calls
         FROM ai_usage_log
        WHERE user_id = $1
          AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'utc')
        GROUP BY model`,
      [req.user!.sub],
    );

    let spent = 0;
    let calls = 0;
    for (const r of rows) {
      spent += costUsd(r.model, Number(r.in_tok), Number(r.out_tok));
      calls += Number(r.calls);
    }
    const spentUsd = Math.round(spent * 1e6) / 1e6;

    res.json({
      spent_usd: spentUsd,
      limit_usd: DAILY_CEILING_USD,
      exceeded: spentUsd >= DAILY_CEILING_USD,
      calls,
      // UTC midnight, so the client can say when the budget resets.
      resets_at: new Date(Date.UTC(
        new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1,
      )).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

const usageSchema = z.object({
  feature: z.string().min(1).max(100),
  model: z.string().max(100).optional(),
  input_tokens: z.number().int().min(0).max(10_000_000).default(0),
  output_tokens: z.number().int().min(0).max(10_000_000).default(0),
  cache_hit: z.boolean().optional(),
  response_time_ms: z.number().int().min(0).max(600_000).optional(),
  error: z.string().max(500).optional(),
});

/** Record one completed (or failed) AI call against the caller's ledger. */
aiRouter.post("/usage", requireAuth, async (req, res, next) => {
  try {
    const b = usageSchema.parse(req.body);
    // user_id comes from the verified token, never from the body — otherwise a
    // caller could bill their spend to somebody else's daily budget.
    await query(
      `INSERT INTO ai_usage_log
         (user_id, feature, model, input_tokens, output_tokens, cache_hit, response_time_ms, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        req.user!.sub, b.feature, b.model ?? null,
        b.input_tokens, b.output_tokens, b.cache_hit ?? false,
        b.response_time_ms ?? null, b.error ?? null,
      ],
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ====================
// SAVE MESSAGE
// ====================

const saveMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sources: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
});

aiRouter.post("/messages", requireAuth, async (req, res, next) => {
  try {
    const body = saveMessageSchema.parse(req.body);
    // Ownership check, matching every other /conversations/:id endpoint in this
    // file — without it, any authenticated user who knows a conversation_id
    // could write fabricated "assistant" content into someone else's history.
    const owned = await queryOne(
      `UPDATE ai_conversations SET message_count = message_count + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [body.conversation_id, req.user!.sub],
    );
    if (!owned) return res.status(404).json({ error: "Conversation not found" });

    const msg = await queryOne(
      `INSERT INTO ai_messages (conversation_id, role, content, sources)
       VALUES ($1, $2, $3, $4) RETURNING id, role, content, created_at`,
      [body.conversation_id, body.role, body.content, JSON.stringify(body.sources ?? [])],
    );
    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
});

// ====================
// VISA ROADMAP PERSISTENCE
// ====================
// visa_checklists had exactly one writer: POST /checklist, which proxied to the
// removed Python service and could never succeed. So the table stayed empty,
// the "visa progress" tile on the student dashboard was null for every user,
// and a generated roadmap vanished on refresh — the AI produced it, nothing
// stored it.
//
// These endpoints are that missing write path. The roadmap itself is generated
// by the Next.js route handler at /api/ai/visa-roadmap; this is where the
// result lives afterwards.

/** One phase of a roadmap, as produced by /api/ai/visa-roadmap. */
const phaseSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  timeframe: z.string().max(120).optional(),
  cost: z.string().max(120).optional(),
  documents: z.array(z.string().max(300)).max(40).optional(),
  tip: z.string().max(1000).optional(),
});

const saveChecklistSchema = z.object({
  origin_country: z.string().min(1).max(100),
  destination_country: z.string().min(1).max(100),
  visa_type: z.string().min(1).max(100).default("study"),
  items: z.array(phaseSchema).min(1).max(40),
});

/**
 * Save a generated roadmap.
 *
 * Replaces the caller's existing checklist for the same destination + visa type
 * rather than accumulating duplicates every time they regenerate — but keeps
 * the completions they had already ticked off for phases that still exist, so
 * regenerating does not silently reset someone's progress.
 */
aiRouter.post("/checklists", requireAuth, async (req, res, next) => {
  try {
    const b = saveChecklistSchema.parse(req.body);

    const previous = await queryOne<{ id: string; completed_items: string[] | null }>(
      `SELECT id, completed_items FROM visa_checklists
        WHERE user_id = $1 AND destination_country = $2 AND visa_type = $3
        ORDER BY created_at DESC LIMIT 1`,
      [req.user!.sub, b.destination_country, b.visa_type],
    );

    const stillPresent = new Set(b.items.map((i) => i.id));
    const carriedOver = (previous?.completed_items ?? []).filter((id) => stillPresent.has(id));

    if (previous) {
      await query(`DELETE FROM visa_checklists WHERE id = $1`, [previous.id]);
    }

    const checklist = await queryOne(
      `INSERT INTO visa_checklists
         (user_id, origin_country, destination_country, visa_type, items, completed_items)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        req.user!.sub,
        b.origin_country,
        b.destination_country,
        b.visa_type,
        JSON.stringify(b.items),
        carriedOver,
      ],
    );

    res.status(201).json({ checklist });
  } catch (err) {
    next(err);
  }
});

aiRouter.get("/checklists", requireAuth, async (req, res, next) => {
  try {
    const items = await query(
      `SELECT * FROM visa_checklists WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.sub],
    );
    res.json({ checklists: items });
  } catch (err) {
    next(err);
  }
});

const toggleSchema = z.object({
  phase_id: z.string().min(1).max(80),
  completed: z.boolean(),
});

/**
 * Tick a phase off, or un-tick it.
 *
 * The completion set is computed in SQL rather than read-modify-written in the
 * handler, so two devices toggling different phases at once cannot clobber each
 * other's change.
 */
aiRouter.patch("/checklists/:id", requireAuth, async (req, res, next) => {
  try {
    const b = toggleSchema.parse(req.body);

    const checklist = await queryOne<{ id: string; items: { id: string }[] }>(
      `SELECT id, items FROM visa_checklists WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.sub],
    );
    // 404 rather than 403: whose checklist a given id belongs to is not
    // something a stranger should be able to probe.
    if (!checklist) return res.status(404).json({ error: "Checklist not found" });

    const known = Array.isArray(checklist.items) && checklist.items.some((i) => i?.id === b.phase_id);
    if (!known) return res.status(400).json({ error: "That phase isn't part of this checklist." });

    const updated = await queryOne(
      b.completed
        ? `UPDATE visa_checklists
              SET completed_items =
                (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(completed_items, '{}') || ARRAY[$3::text])))
            WHERE id = $1 AND user_id = $2 RETURNING *`
        : `UPDATE visa_checklists
              SET completed_items =
                (SELECT ARRAY(SELECT unnest(COALESCE(completed_items, '{}')) EXCEPT SELECT $3::text))
            WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user!.sub, b.phase_id],
    );

    res.json({ checklist: updated });
  } catch (err) {
    next(err);
  }
});

aiRouter.delete("/checklists/:id", requireAuth, async (req, res, next) => {
  try {
    const removed = await queryOne<{ id: string }>(
      `DELETE FROM visa_checklists WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user!.sub],
    );
    if (!removed) return res.status(404).json({ error: "Checklist not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
