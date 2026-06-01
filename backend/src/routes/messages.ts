import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";

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

    const messages = await query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`,
      [req.params.id]
    );
    res.json({ messages });
  } catch (err) { next(err); }
});

const sendSchema = z.object({
  recipient_id: z.string().uuid(),
  body: z.string().min(1),
});

messagesRouter.post("/send", requireAuth, async (req, res, next) => {
  try {
    const { recipient_id, body } = sendSchema.parse(req.body);
    const me = req.user!.sub;
    if (recipient_id === me) {
      return res.status(400).json({ error: "You can't message yourself" });
    }
    const recipient = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1`,
      [recipient_id]
    );
    if (!recipient) return res.status(404).json({ error: "Recipient not found" });

    const [a, b] = [me, recipient_id].sort();
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
      [convo!.id, me, body]
    );
    await query(`UPDATE conversations SET last_message_at = NOW() WHERE id = $1`, [convo!.id]);
    res.status(201).json({ message: msg, conversation_id: convo!.id });
  } catch (err) { next(err); }
});
