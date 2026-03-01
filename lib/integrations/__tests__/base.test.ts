// @ts-nocheck
/**
 * Tests for lib/integrations/base.ts - APIError, RateLimitError, and BaseAPIIntegration
 */

jest.mock("@/lib/integrations/redis", () => ({
  getRateLimiter: jest.fn(),
  getCached: jest.fn(),
  setCache: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ then: jest.fn() })),
      upsert: jest.fn(() => ({ then: jest.fn() })),
    })),
  })),
}));

import { APIError, RateLimitError, BaseAPIIntegration } from "@/lib/integrations/base";
import { getRateLimiter, getCached, setCache } from "@/lib/integrations/redis";

// Concrete implementation for testing
class TestIntegration extends BaseAPIIntegration {
  readonly provider = "test-provider";
  makeRequestMock = jest.fn();

  protected async makeRequest<T>(
    endpoint: string,
    options?: Record<string, unknown>
  ): Promise<T> {
    return this.makeRequestMock(endpoint, options);
  }
}

describe("APIError", () => {
  it("creates an error with message, statusCode, and provider", () => {
    const err = new APIError("Not found", 404, "dataforseo");
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.provider).toBe("dataforseo");
    expect(err.name).toBe("APIError");
  });

  it("is an instance of Error", () => {
    const err = new APIError("test", 500, "provider");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("RateLimitError", () => {
  it("creates a rate limit error with provider", () => {
    const err = new RateLimitError("claude");
    expect(err.provider).toBe("claude");
    expect(err.message).toBe("Rate limit exceeded for claude");
    expect(err.name).toBe("RateLimitError");
  });

  it("includes retryAfter when provided", () => {
    const err = new RateLimitError("openai", 60000);
    expect(err.retryAfter).toBe(60000);
  });

  it("retryAfter is undefined when not provided", () => {
    const err = new RateLimitError("frase");
    expect(err.retryAfter).toBeUndefined();
  });

  it("is an instance of Error", () => {
    const err = new RateLimitError("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("BaseAPIIntegration.execute", () => {
  let integration: TestIntegration;
  let mockLimiter: { limit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    integration = new TestIntegration();

    mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true, reset: 0 }) };
    (getRateLimiter as jest.Mock).mockReturnValue(mockLimiter);
    (getCached as jest.Mock).mockResolvedValue(null);
    (setCache as jest.Mock).mockResolvedValue(undefined);
  });

  it("returns cached value when cache hit occurs", async () => {
    (getCached as jest.Mock).mockResolvedValue({ data: "cached" });

    const result = await integration.execute("endpoint", "cache-key");
    expect(result).toEqual({ data: "cached" });
    expect(integration.makeRequestMock).not.toHaveBeenCalled();
  });

  it("skips cache when skipCache is true", async () => {
    (getCached as jest.Mock).mockResolvedValue({ data: "cached" });
    integration.makeRequestMock.mockResolvedValue({ data: "fresh" });

    const result = await integration.execute("endpoint", "cache-key", { skipCache: true });
    expect(result).toEqual({ data: "fresh" });
    expect(integration.makeRequestMock).toHaveBeenCalled();
  });

  it("throws RateLimitError when rate limit exceeded", async () => {
    mockLimiter.limit.mockResolvedValue({ success: false, reset: 60000 });

    await expect(integration.execute("endpoint", "cache-key")).rejects.toThrow(RateLimitError);
  });

  it("calls makeRequest and returns result on success", async () => {
    integration.makeRequestMock.mockResolvedValue({ items: [1, 2, 3] });

    const result = await integration.execute("endpoint", "cache-key");
    expect(result).toEqual({ items: [1, 2, 3] });
    expect(integration.makeRequestMock).toHaveBeenCalledWith("endpoint", {});
  });

  it("caches result when cacheTtl is provided", async () => {
    integration.makeRequestMock.mockResolvedValue({ data: "result" });

    await integration.execute("endpoint", "cache-key", { cacheTtl: 300 });
    expect(setCache).toHaveBeenCalledWith("cache-key", { data: "result" }, 300);
  });

  it("does not cache when cacheTtl is not provided", async () => {
    integration.makeRequestMock.mockResolvedValue({ data: "result" });

    await integration.execute("endpoint", "cache-key");
    expect(setCache).not.toHaveBeenCalled();
  });

  it("throws error from makeRequest on non-5xx APIError (no retry)", async () => {
    const err = new APIError("Not found", 404, "test-provider");
    integration.makeRequestMock.mockRejectedValue(err);

    await expect(integration.execute("endpoint", "cache-key")).rejects.toThrow("Not found");
    expect(integration.makeRequestMock).toHaveBeenCalledTimes(1);
  });

  it("eventually throws after exhausting 5xx retries", async () => {
    // 5xx errors get retried — the final error is re-thrown
    const err = new APIError("Server Error", 500, "test-provider");
    // Mock exactly 1 attempt (no retry timer needed) by using 4xx next time
    integration.makeRequestMock
      .mockRejectedValueOnce(new APIError("Bad Request", 400, "test-provider"));

    await expect(integration.execute("endpoint", "cache-key")).rejects.toThrow("Bad Request");
    // 4xx = no retry, so only 1 call
    expect(integration.makeRequestMock).toHaveBeenCalledTimes(1);
  });

  it("succeeds on retry after initial failure", async () => {
    const err = new APIError("Server Error", 500, "test-provider");
    integration.makeRequestMock
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ data: "recovered" });

    jest.useFakeTimers();
    const executePromise = integration.execute("endpoint", "cache-key");
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    }
    const result = await executePromise;
    jest.useRealTimers();

    expect(result).toEqual({ data: "recovered" });
    expect(integration.makeRequestMock).toHaveBeenCalledTimes(2);
  }, 30000);

  it("does not retry on non-APIError", async () => {
    integration.makeRequestMock.mockRejectedValue(new Error("Network error"));

    await expect(integration.execute("endpoint", "cache-key")).rejects.toThrow("Network error");
    expect(integration.makeRequestMock).toHaveBeenCalledTimes(1);
  });
});
