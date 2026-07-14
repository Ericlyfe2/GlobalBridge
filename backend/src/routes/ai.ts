import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";

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
    const msg = await queryOne(
      `INSERT INTO ai_messages (conversation_id, role, content, sources)
       VALUES ($1, $2, $3, $4) RETURNING id, role, content, created_at`,
      [body.conversation_id, body.role, body.content, JSON.stringify(body.sources ?? [])],
    );
    // Update conversation message count and timestamp
    await query(
      `UPDATE ai_conversations SET message_count = message_count + 1, updated_at = NOW() WHERE id = $1`,
      [body.conversation_id],
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
