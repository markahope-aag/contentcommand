// @ts-nocheck
/**
 * Tests for lib/integrations/frase.ts
 */

jest.mock("@/lib/env", () => ({
  serverEnv: jest.fn(() => ({
    FRASE_API_KEY: "test-frase-key",
  })),
}));

jest.mock("@/lib/integrations/redis", () => ({
  getRateLimiter: jest.fn(),
  getCached: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ then: jest.fn() })),
      upsert: jest.fn(() => ({ then: jest.fn() })),
    })),
  })),
}));

import { FraseClient } from "@/lib/integrations/frase";
import { APIError } from "@/lib/integrations/base";
import { getRateLimiter, getCached } from "@/lib/integrations/redis";

describe("FraseClient", () => {
  let client: FraseClient;
  let mockFetch: jest.Mock;
  let mockLimiter: { limit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new FraseClient();

    mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true, reset: 0 }) };
    (getRateLimiter as jest.Mock).mockReturnValue(mockLimiter);
    (getCached as jest.Mock).mockResolvedValue(null);

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("has provider set to frase", () => {
    expect(client.provider).toBe("frase");
  });

  it("uses Bearer auth header with API key", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ topics: [] }),
    });

    await client.analyzeSerp("content marketing");

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBe("Bearer test-frase-key");
  });

  it("throws APIError when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    await expect(client.analyzeSerp("test query")).rejects.toThrow(APIError);
  });

  it("returns parsed JSON on success", async () => {
    const mockData = { topics: ["topic1", "topic2"], score: 85 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await client.analyzeSerp("seo tips");
    expect(result).toEqual(mockData);
  });

  describe("analyzeSerp", () => {
    it("calls /process/serp endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await client.analyzeSerp("keyword research");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("/process/serp");
    });

    it("sends query in request body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.analyzeSerp("best practices");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.query).toBe("best practices");
    });
  });

  describe("analyzeUrl", () => {
    it("calls /process/url endpoint with url body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: "" }),
      });

      await client.analyzeUrl("https://example.com/article");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("/process/url");
      const body = JSON.parse(fetchCall[1].body);
      expect(body.url).toBe("https://example.com/article");
    });
  });

  describe("getSemanticKeywords", () => {
    it("calls /process/semantic endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ keywords: [] }),
      });

      await client.getSemanticKeywords("content strategy");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("/process/semantic");
    });
  });
});
