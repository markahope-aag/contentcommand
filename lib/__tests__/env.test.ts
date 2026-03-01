// @ts-nocheck
/**
 * Tests for lib/env.ts - environment variable validation
 * NOTE: We reset the module between tests to clear the cached env values.
 */

describe("env - clientEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns parsed client env when valid vars are present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-value";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    const { clientEnv } = await import("@/lib/env");
    const env = clientEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-key-value");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.example.com");
  });

  it("works without optional NEXT_PUBLIC_APP_URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-value";
    delete process.env.NEXT_PUBLIC_APP_URL;

    const { clientEnv } = await import("@/lib/env");
    const env = clientEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_APP_URL).toBeUndefined();
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-value";

    const { clientEnv } = await import("@/lib/env");
    expect(() => clientEnv()).toThrow(/Missing or invalid client environment variables/);
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is not a valid URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-value";

    const { clientEnv } = await import("@/lib/env");
    expect(() => clientEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL must be a valid URL/);
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { clientEnv } = await import("@/lib/env");
    expect(() => clientEnv()).toThrow(/Missing or invalid client environment variables/);
  });

  it("caches the result after first call", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-value";

    const { clientEnv } = await import("@/lib/env");
    const result1 = clientEnv();
    const result2 = clientEnv();
    expect(result1).toBe(result2);
  });
});

describe("env - serverEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function setValidServerEnv() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-value";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.DATAFORSEO_LOGIN = "dataforseo-login";
    process.env.DATAFORSEO_PASSWORD = "dataforseo-password";
    process.env.FRASE_API_KEY = "frase-api-key";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.LLMREFS_API_KEY = "llmrefs-api-key";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "redis-token";
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    process.env.CRON_SECRET = "cron-secret-at-least-16";
    process.env.ANTHROPIC_API_KEY = "anthropic-api-key";
    process.env.OPENAI_API_KEY = "openai-api-key";
  }

  it("returns parsed server env when all vars are valid", async () => {
    setValidServerEnv();
    const { serverEnv } = await import("@/lib/env");
    const env = serverEnv();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-key");
    expect(env.ANTHROPIC_API_KEY).toBe("anthropic-api-key");
    expect(env.ENCRYPTION_KEY).toBe("a".repeat(64));
  });

  it("throws when ENCRYPTION_KEY is not 64 characters", async () => {
    setValidServerEnv();
    process.env.ENCRYPTION_KEY = "too-short";
    const { serverEnv } = await import("@/lib/env");
    expect(() => serverEnv()).toThrow(/Missing or invalid server environment variables/);
  });

  it("throws when CRON_SECRET is less than 16 characters", async () => {
    setValidServerEnv();
    process.env.CRON_SECRET = "short";
    const { serverEnv } = await import("@/lib/env");
    expect(() => serverEnv()).toThrow(/Missing or invalid server environment variables/);
  });

  it("throws when UPSTASH_REDIS_REST_URL is not a valid URL", async () => {
    setValidServerEnv();
    process.env.UPSTASH_REDIS_REST_URL = "not-a-url";
    const { serverEnv } = await import("@/lib/env");
    expect(() => serverEnv()).toThrow(/Missing or invalid server environment variables/);
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    setValidServerEnv();
    delete process.env.ANTHROPIC_API_KEY;
    const { serverEnv } = await import("@/lib/env");
    expect(() => serverEnv()).toThrow(/Missing or invalid server environment variables/);
  });

  it("caches the result after first successful call", async () => {
    setValidServerEnv();
    const { serverEnv } = await import("@/lib/env");
    const result1 = serverEnv();
    const result2 = serverEnv();
    expect(result1).toBe(result2);
  });
});
