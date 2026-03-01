// @ts-nocheck
/**
 * Tests for lib/integrations/redis.ts
 * Mock @upstash/redis and @upstash/ratelimit to avoid ESM issues.
 */

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisKeys = jest.fn();
const mockRedisDel = jest.fn();
const mockRateLimitLimit = jest.fn();

const MockRedis = jest.fn().mockImplementation(() => ({
  get: mockRedisGet,
  set: mockRedisSet,
  keys: mockRedisKeys,
  del: mockRedisDel,
}));

const MockRatelimit = jest.fn().mockImplementation(() => ({
  limit: mockRateLimitLimit,
}));
MockRatelimit.slidingWindow = jest.fn().mockReturnValue("sliding-window-limiter");

jest.mock("@upstash/redis", () => ({
  Redis: MockRedis,
}));

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: MockRatelimit,
}));

jest.mock("@/lib/env", () => ({
  serverEnv: jest.fn(() => ({
    UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  })),
}));

// Must reset modules to clear the singleton redisInstance between tests
describe("lib/integrations/redis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCached", () => {
    it("returns data from Redis when key exists", async () => {
      // Re-import after clearing to get fresh module state
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      mockRedisGet.mockResolvedValueOnce({ data: "cached-value" });
      const { getCached } = await import("@/lib/integrations/redis");

      const result = await getCached("my-key");
      expect(result).toEqual({ data: "cached-value" });
      expect(mockRedisGet).toHaveBeenCalledWith("my-key");
    });

    it("returns null when key does not exist", async () => {
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      mockRedisGet.mockResolvedValueOnce(null);
      const { getCached } = await import("@/lib/integrations/redis");

      const result = await getCached("missing-key");
      expect(result).toBeNull();
    });
  });

  describe("setCache", () => {
    it("sets a value with TTL in Redis", async () => {
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      mockRedisSet.mockResolvedValueOnce("OK");
      const { setCache } = await import("@/lib/integrations/redis");

      await setCache("my-key", { data: "value" }, 300);
      expect(mockRedisSet).toHaveBeenCalledWith("my-key", { data: "value" }, { ex: 300 });
    });
  });

  describe("getRateLimiter", () => {
    it("returns a rate limiter for known providers", async () => {
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      const { getRateLimiter } = await import("@/lib/integrations/redis");

      const limiter = getRateLimiter("claude");
      expect(limiter).toBeDefined();
      expect(MockRatelimit).toHaveBeenCalled();
    });

    it("returns same instance on multiple calls for same provider", async () => {
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      const { getRateLimiter } = await import("@/lib/integrations/redis");

      const limiter1 = getRateLimiter("frase");
      const limiter2 = getRateLimiter("frase");
      expect(limiter1).toBe(limiter2);
    });

    it("returns limiter for unknown provider with default config", async () => {
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      const { getRateLimiter } = await import("@/lib/integrations/redis");

      const limiter = getRateLimiter("unknown-provider");
      expect(limiter).toBeDefined();
    });

    it("creates limiters for all known providers", async () => {
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      const { getRateLimiter } = await import("@/lib/integrations/redis");

      const providers = ["dataforseo", "frase", "google", "llmrefs", "claude", "openai"];
      for (const provider of providers) {
        expect(getRateLimiter(provider)).toBeDefined();
      }
    });
  });

  describe("getRedis", () => {
    it("creates Redis instance with correct config", async () => {
      jest.resetModules();
      jest.mock("@upstash/redis", () => ({ Redis: MockRedis }));
      jest.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
      jest.mock("@/lib/env", () => ({
        serverEnv: jest.fn(() => ({
          UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "test-token",
        })),
      }));

      const { getRedis } = await import("@/lib/integrations/redis");
      getRedis();

      expect(MockRedis).toHaveBeenCalledWith({
        url: "https://redis.upstash.io",
        token: "test-token",
      });
    });
  });
});
