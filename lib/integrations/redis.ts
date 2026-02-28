import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

// Per-provider rate limiters
const rateLimiters = new Map<string, Ratelimit>();

function createRateLimiter(
  provider: string,
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h`
): Ratelimit {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `ratelimit:${provider}`,
  });
}

export function getRateLimiter(provider: string): Ratelimit {
  if (!rateLimiters.has(provider)) {
    const config: Record<string, { requests: number; window: `${number} s` | `${number} m` | `${number} h` }> = {
      dataforseo: { requests: 2000, window: "1 m" },
      frase: { requests: 500, window: "1 h" },
      google: { requests: 100, window: "1 m" },
    };

    const providerConfig = config[provider] || { requests: 60, window: "1 m" };
    rateLimiters.set(
      provider,
      createRateLimiter(provider, providerConfig.requests, providerConfig.window)
    );
  }

  return rateLimiters.get(provider)!;
}

// Cache helpers with TTL
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const data = await redis.get<T>(key);
  return data;
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  await redis.set(key, value, { ex: ttlSeconds });
}
