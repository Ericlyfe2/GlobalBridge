import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { dispatchNotification } from "../lib/push";

export const messagesRouter = Router();

messagesRouter.get("/conversations", requireAuth, async (req, res, next) => {
  try {
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
    const me = req.user!.sub;
    const convos = await query(
      `SELECT c.*,
              CASE WHEN c.participant_a = $1 THEN u_b.id ELSE u_a.id END AS partner_id,
              CASE WHEN c.participant_a = $1 THEN u_b.full_name ELSE u_a.full_name END AS partner_name,
              CASE WHEN c.participant_a = $1 THEN u_b.avatar_url ELSE u_a.avatar_url END AS partner_avatar
       FROM conversations c
       JOIN users u_a ON u_a.id = c.participant_a
       JOIN users u_b ON u_b.id = c.participant_b
       WHERE c.participant_a = $1 OR c.participant_b = $1
       ORDER BY c.last_message_at DESC
       LIMIT $2`,
      [me, limit]
    );
    res.json({ conversations: convos });
  } catch (err) { next(err); }
});

messagesRouter.get("/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    const me = req.user!.sub;
    // Authorize: caller must be a participant. 404 (not 403) so we don't leak
    // which conversation IDs exist.
    const convo = await queryOne<{ id: string }>(
      `SELECT id FROM conversations
       WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)`,
      [req.params.id, me]
    );
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    // DESC+LIMIT then re-sort ASC: the most recent 200 messages, in chronological
    // order. Plain "ORDER BY created_at ASC LIMIT 200" would instead pin the
    // conversation to its oldest 200 messages forever once it grows past that —
    // any new message becomes permanently invisible on the next fetch.
    const messages = await query(
      `SELECT * FROM (
         SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 200
       ) recent ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ messages });
  } catch (err) { next(err); }
});

const sendSchema = z.object({
  recipient_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

messagesRouter.post("/send", requireAuth, async (req, res, next) => {
  try {
    const safe = sendSchema.parse(req.body);
    const me = req.user!.sub;
    if (safe.recipient_id === me) {
      return res.status(400).json({ error: "You can't message yourself" });
    }
    const recipient = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1`,
      [safe.recipient_id]
    );
    if (!recipient) return res.status(404).json({ error: "Recipient not found" });

    const [a, b] = [me, safe.recipient_id].sort();
    let convo = await queryOne<{ id: string }>(
      `SELECT id FROM conversations WHERE participant_a = $1 AND participant_b = $2`,
      [a, b]
    );
    if (!convo) {
      convo = await queryOne<{ id: string }>(
        `INSERT INTO conversations (participant_a, participant_b) VALUES ($1, $2) RETURNING id`,
        [a, b]
      );
    }
    const msg = await queryOne(
      `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [convo!.id, me, safe.body]
    );
    await query(`UPDATE conversations SET last_message_at = NOW() WHERE id = $1`, [convo!.id]);

    // Respond first: delivery is best-effort and must never delay or fail the
    // send. The message is already committed at this point.
    res.status(201).json({ message: msg, conversation_id: convo!.id });

    // Notify the recipient — in-app row (source of truth), WebSocket to open
    // tabs, and web push to closed devices. Previously nothing was raised here
    // at all, so a recipient with the app shut had no idea a message arrived.
    const sender = await queryOne<{ full_name: string }>(
      `SELECT full_name FROM users WHERE id = $1`,
      [me],
    );
    const preview = safe.body.length > 120 ? `${safe.body.slice(0, 117)}…` : safe.body;
    await dispatchNotification({
      userId: safe.recipient_id,
      kind: "message",
      title: sender?.full_name ? `New message from ${sender.full_name}` : "New message",
      body: preview,
      // Deep-link straight to the thread rather than the app root.
      href: `/messages?c=${convo!.id}`,
    });
  } catch (err) { next(err); }
});
