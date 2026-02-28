import { getCached, setCache, getRedis } from "@/lib/integrations/redis";

/**
 * Cache-through helper: checks Redis first, falls back to fetcher on miss.
 * Cache is non-critical — Redis errors fall through to the database.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  try {
    const cached = await getCached<T>(key);
    if (cached !== null) return cached;
  } catch {
    // Redis down — fall through to DB
  }

  const data = await fetcher();
  setCache(key, data, ttlSeconds).catch(() => {}); // fire-and-forget
  return data;
}

/**
 * Invalidate one or more cache keys. Supports glob-style patterns with '*'.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    const redis = getRedis();
    const allKeys: string[] = [];

    for (const key of keys) {
      if (key.includes("*")) {
        const matched = await redis.keys(key);
        allKeys.push(...matched);
      } else {
        allKeys.push(key);
      }
    }

    if (allKeys.length > 0) await redis.del(...allKeys);
  } catch {
    // Cache invalidation failure is non-critical
  }
}
