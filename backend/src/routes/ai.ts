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
      return res.status(502).json({ error: "AI service error", details: text });
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
