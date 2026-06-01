import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import jwt from "jsonwebtoken";
import Redis from "ioredis";
import { redis, pool } from "./db";

type Client = WebSocket & { userId?: string; authed?: boolean };
const clients = new Map<string, Set<Client>>();

let subRedis: Redis | null = null;

const AUTH_TIMEOUT = 10000;

export function initWebsocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws", perMessageDeflate: { zlibDeflateOptions: { level: 6 } } });

  wss.on("connection", (raw) => {
    const ws = raw as Client;
    ws.authed = false;

    // Wait for auth message within timeout
    const authTimer = setTimeout(() => {
      if (!ws.authed) ws.close(1008, "Auth timeout");
    }, AUTH_TIMEOUT);

    ws.once("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== "auth" || !msg.token) {
          ws.close(1008, "Expected auth message");
          return;
        }

        const payload = jwt.verify(msg.token, process.env.JWT_SECRET!) as { sub: string; ver?: number };

        // Verify token version
        const result = await pool.query("SELECT token_version FROM users WHERE id = $1", [payload.sub]);
        if (!result.rows.length || result.rows[0].token_version !== (payload.ver ?? 0)) {
          ws.close(1008, "Session expired");
          return;
        }

        clearTimeout(authTimer);
        ws.userId = payload.sub;
        ws.authed = true;
        addClient(payload.sub, ws);
        ws.send(JSON.stringify({ type: "auth_ok" }));

        // Regular message handler
        ws.on("message", (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
          } catch { /* ignore */ }
        });
      } catch {
        ws.close(1008, "Invalid auth");
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimer);
      if (ws.userId) removeClient(ws.userId, ws);
    });
  });

  // Redis pub/sub is optional — only wire up broadcast bridge if Redis available
  if (redis) {
    subRedis = redis.duplicate();
    subRedis.subscribe("ws:broadcast");
    subRedis.on("message", (_channel, raw) => {
      try {
        const { userIds, payload } = JSON.parse(raw);
        for (const id of userIds) {
          const set = clients.get(id);
          if (!set) continue;
          for (const c of set) {
            if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(payload));
          }
        }
      } catch { /* ignore */ }
    });
    console.log("🔌 WebSocket server initialized on /ws (with Redis pub/sub)");
  } else {
    console.log("🔌 WebSocket server initialized on /ws (single-instance mode, no Redis)");
  }

  // Cleanup on server close
  server.on("close", () => {
    if (subRedis) {
      subRedis.unsubscribe();
      subRedis.quit();
    }
    wss.close();
  });
}

function addClient(userId: string, ws: Client) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(ws);
}

function removeClient(userId: string, ws: Client) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(ws);
  if (!set.size) clients.delete(userId);
}

/**
 * Notify users via WebSocket. Uses Redis pub/sub if available (for multi-instance),
 * otherwise pushes directly to local clients only.
 */
export async function notifyUsers(userIds: string[], payload: unknown) {
  if (redis) {
    await redis.publish("ws:broadcast", JSON.stringify({ userIds, payload }));
    return;
  }
  // Fallback: direct local push
  for (const id of userIds) {
    const set = clients.get(id);
    if (!set) continue;
    for (const c of set) {
      if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(payload));
    }
  }
}
