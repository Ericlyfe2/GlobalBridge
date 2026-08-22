import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { costUsd, DAILY_CEILING_USD } from "../lib/ai-pricing";

export const aiRouter = Router();

const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  conversation_id: z.string().uuid().optional(),
  origin_country: z.string().optional(),
  destination_country: z.string().optional(),
  visa_type: z.string().optional(),
});

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

const AI_TIMEOUT = 10000;

async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = AI_TIMEOUT) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

aiRouter.post("/chat", requireAuth, async (req, res, next) => {
  try {
    const body = chatSchema.parse(req.body);

    const resp = await fetchWithTimeout(`${AI_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: `AI service error: ${text.slice(0, 200)}` });
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const checklistSchema = z.object({
  origin_country: z.string(),
  destination_country: z.string(),
  visa_type: z.string(),
});

aiRouter.post("/checklist", requireAuth, async (req, res, next) => {
  try {
    const body = checklistSchema.parse(req.body);

    const resp = await fetch(`${AI_URL}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await resp.json()) as { items?: unknown };

    const saved = await queryOne(
      `INSERT INTO visa_checklists (user_id, origin_country, destination_country, visa_type, items)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        req.user!.sub,
        body.origin_country,
        body.destination_country,
        body.visa_type,
        JSON.stringify(data.items),
      ]
    );
    res.json({ checklist: saved });
  } catch (err) {
    next(err);
  }
});

aiRouter.get("/checklists", requireAuth, async (req, res, next) => {
  try {
    const items = await query(
      `SELECT * FROM visa_checklists WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.sub]
    );
    res.json({ checklists: items });
  } catch (err) {
    next(err);
  }
});

const docCheckSchema = z.object({
  document_type: z.string().optional(),
  country: z.string().optional(),
  text: z.string().min(1).max(50000),
});

aiRouter.post("/doc-check", requireAuth, async (req, res, next) => {
  try {
    const body = docCheckSchema.parse(req.body);
    const resp = await fetchWithTimeout(`${AI_URL}/doc-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  target_lang: z.string().min(2).max(10),
});

aiRouter.post("/translate", requireAuth, async (req, res, next) => {
  try {
    const { text, target_lang } = translateSchema.parse(req.body);
    const resp = await fetchWithTimeout(`${AI_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_lang }),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
