import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";
import type Redis from "ioredis";

/**
 * Redis-backed store for express-rate-limit.
 *
 * The default store is an in-process Map, so each instance counted separately:
 * with N instances behind a load balancer the effective limit was N × max, and
 * every deploy reset all counters to zero. That is the horizontal-scaling
 * weakness the audit called out.
 *
 * Written against the existing ioredis client rather than pulling in
 * rate-limit-redis, because the client, its failure handling and its optional-
 * ness are already established in db.ts and this is a small amount of protocol.
 *
 * INCR then PEXPIRE-on-first-hit is the standard fixed-window counter. The two
 * commands go in one pipeline so a crash between them cannot leave a key
 * without a TTL — which would pin a client at "limit reached" forever.
 */
export class RedisRateLimitStore implements Store {
  private windowMs = 60_000;
  private keyPrefix: string;

  constructor(private client: Redis, prefix = "rl:") {
    this.keyPrefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(k: string): string {
    return `${this.keyPrefix}${k}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const k = this.key(key);
    const results = await this.client
      .multi()
      .incr(k)
      .pttl(k)
      .exec();

    const totalHits = Number(results?.[0]?.[1] ?? 1);
    let ttl = Number(results?.[1]?.[1] ?? -1);

    // -1 = key exists with no TTL (first hit, or a TTL that went missing).
    if (ttl < 0) {
      await this.client.pexpire(k, this.windowMs);
      ttl = this.windowMs;
    }

    return { totalHits, resetTime: new Date(Date.now() + ttl) };
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(this.key(key));
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }
}

/**
 * How many proxy hops to trust when deriving the client IP.
 *
 * Express defaults to trusting none, so behind Railway/Vercel `req.ip` was the
 * load balancer's address and every user shared one rate-limit bucket. Setting
 * this to `true` would be the opposite mistake: X-Forwarded-For is
 * client-writable, so trusting the whole chain lets anyone mint a fresh bucket
 * per request by prepending a fake hop.
 *
 * A count means "trust exactly this many proxies closest to us", which is the
 * only setting that is both correct and unspoofable. One is right for a single
 * platform load balancer; raise it if you add a CDN in front.
 */
export function trustProxyHops(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.TRUST_PROXY_HOPS);
  if (Number.isInteger(raw) && raw >= 0) return raw;
  // Production sits behind exactly one platform proxy; local dev behind none.
  return env.NODE_ENV === "production" ? 1 : 0;
}
