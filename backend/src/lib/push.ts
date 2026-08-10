/**
 * Web push delivery.
 *
 * Push *complements* the in-app notification system, it never replaces it.
 * `dispatchNotification` writes the database row first — that row is the source
 * of truth and is what the user sees in /notifications. WebSocket delivery and
 * web push are both best-effort fan-out on top of it.
 *
 * That ordering matters: a user with notifications blocked, an expired
 * subscription, or an iOS version without web push must still see everything in
 * the app. Losing push must never lose information.
 *
 * Entirely optional. Without VAPID keys configured the module logs once and
 * every send becomes a no-op, exactly like Redis elsewhere in this codebase.
 */

import webpush from "web-push";
import { query } from "../db";
import { notifyUsers } from "../ws";

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@globalbridge.app";

export const pushEnabled = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);
} else {
  console.warn("⚠ VAPID keys not set — web push disabled (in-app + WebSocket notifications still work)");
}

export type NotificationKind =
  | "message" | "deadline" | "opportunity" | "housing"
  | "job" | "mentor" | "security" | "info";

export type NotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  /** In-app destination. Push notifications deep-link straight here. */
  href?: string;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Send a push to every device a user has registered.
 *
 * Dead subscriptions are pruned: once a browser drops a subscription the push
 * service answers 404/410 permanently, and retrying it forever would be both
 * wasted work and a slow leak of rows.
 */
async function sendPush(userId: string, payload: NotificationInput): Promise<void> {
  if (!pushEnabled) return;

  const subs = await query<SubscriptionRow>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId],
  );
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    kind: payload.kind,
    href: payload.href ?? "/notifications",
    timestamp: Date.now(),
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        await query(`UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1`, [s.id]);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await query(`DELETE FROM push_subscriptions WHERE id = $1`, [s.id]);
        } else {
          console.error("push send failed:", (err as Error).message);
        }
      }
    }),
  );
}

/**
 * The one call sites should use. Persists, then fans out to WebSocket and push.
 *
 * Never throws: a notification failing must not roll back the action that
 * triggered it. Booking a mentor should succeed even if push is misconfigured.
 */
export async function dispatchNotification(input: NotificationInput): Promise<void> {
  try {
    // 1 ── source of truth
    await query(
      `INSERT INTO notifications (user_id, kind, title, body, href)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.userId, input.kind, input.title, input.body ?? null, input.href ?? null],
    );

    // 2 ── live delivery to open tabs
    await notifyUsers([input.userId], {
      type: "notification",
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
    });

    // 3 ── push to closed/backgrounded devices
    await sendPush(input.userId, input);
  } catch (err) {
    console.error("dispatchNotification failed:", (err as Error).message);
  }
}
