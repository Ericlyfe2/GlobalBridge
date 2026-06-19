import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CACHE_TTL = 60 * 60 * 24; // 24 hours default
const PREFIX = "tcache:";

type CacheValue = {
  translations: string[];
  ts: number;
};

/** LRU in-memory fallback when Redis is unavailable. */
class MemoryCache {
  private max: number;
  private map = new Map<string, CacheValue>();

  constructor(max = 500) {
    this.max = max;
  }

  get(key: string): CacheValue | undefined {
    const val = this.map.get(key);
    if (val) {
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: string, val: CacheValue) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest) this.map.delete(oldest);
    }
    this.map.set(key, val);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }
}

let redisClient: Redis | null = null;
if (REDIS_URL && REDIS_TOKEN) {
  redisClient = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
}

const memory = new MemoryCache();

function cacheKey(texts: string[], target: string): string {
  const source = texts.join("\x00").slice(0, 200);
  return `${PREFIX}${target}:${source}`;
}

export async function getCachedTranslation(
  texts: string[],
  target: string,
): Promise<string[] | null> {
  const key = cacheKey(texts, target);

  if (redisClient) {
    try {
      const raw = await redisClient.get<string>(key);
      if (raw) {
        const parsed: CacheValue = JSON.parse(raw);
        return parsed.translations.length === texts.length ? parsed.translations : null;
      }
    } catch {
      return null;
    }
  }

  const cached = memory.get(key);
  if (cached && cached.translations.length === texts.length) {
    return cached.translations;
  }
  return null;
}

export async function setCachedTranslation(
  texts: string[],
  target: string,
  translations: string[],
) {
  const key = cacheKey(texts, target);
  const value: CacheValue = { translations, ts: Date.now() };

  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), { ex: CACHE_TTL });
      return;
    } catch {
      // fall through to memory
    }
  }

  memory.set(key, value);
}

export async function invalidateTranslationCache(target?: string) {
  if (redisClient && target) {
    try {
      const keys = await redisClient.keys(`${PREFIX}${target}:*`);
      if (keys.length > 0) await redisClient.del(...keys);
      return;
    } catch {
      // ignore
    }
  }
}
