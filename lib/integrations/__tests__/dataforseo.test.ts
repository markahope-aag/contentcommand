// @ts-nocheck
/**
 * Tests for lib/integrations/dataforseo.ts
 */

jest.mock("@/lib/env", () => ({
  serverEnv: jest.fn(() => ({
    DATAFORSEO_LOGIN: "test-login",
    DATAFORSEO_PASSWORD: "test-password",
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

import { DataForSEOClient } from "@/lib/integrations/dataforseo";
import { APIError } from "@/lib/integrations/base";
import { getRateLimiter, getCached } from "@/lib/integrations/redis";

describe("DataForSEOClient", () => {
  let client: DataForSEOClient;
  let mockFetch: jest.Mock;
  let mockLimiter: { limit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new DataForSEOClient();

    mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true, reset: 0 }) };
    (getRateLimiter as jest.Mock).mockReturnValue(mockLimiter);
    (getCached as jest.Mock).mockResolvedValue(null);

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("has provider set to dataforseo", () => {
    expect(client.provider).toBe("dataforseo");
  });

  it("uses Basic auth header with login:password", async () => {
    const expectedBase64 = Buffer.from("test-login:test-password").toString("base64");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status_code: 20000,
          tasks: [{ result: { items: [] } }],
        }),
    });

    await client.getDomainMetrics("example.com");

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBe(`Basic ${expectedBase64}`);
  });

  it("throws APIError when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(client.getDomainMetrics("example.com")).rejects.toThrow(APIError);
  });

  it("throws APIError when HTTP response is a 4xx error (no retry)", async () => {
    // When the HTTP response itself is 4xx, the APIError statusCode is < 500
    // and the base class won't retry
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    });

    await expect(client.getDomainMetrics("example.com")).rejects.toThrow("DataForSEO error");
  });

  it("returns task result on success", async () => {
    const mockResult = { domain_rank: 85 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status_code: 20000,
          tasks: [{ result: mockResult }],
        }),
    });

    const result = await client.getDomainMetrics("example.com");
    expect(result).toEqual(mockResult);
  });

  describe("getCompetitorKeywords", () => {
    it("calls correct endpoint with domain intersection body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status_code: 20000,
            tasks: [{ result: [] }],
          }),
      });

      await client.getCompetitorKeywords("mysite.com", "competitor.com");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("domain_intersection");
      const body = JSON.parse(fetchCall[1].body);
      expect(body[0].target1).toBe("mysite.com");
      expect(body[0].target2).toBe("competitor.com");
    });
  });

  describe("getSerpResults", () => {
    it("calls correct endpoint with keyword in body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status_code: 20000,
            tasks: [{ result: [] }],
          }),
      });

      await client.getSerpResults("best seo tools");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("serp");
      const body = JSON.parse(fetchCall[1].body);
      expect(body[0].keyword).toBe("best seo tools");
    });
  });
});
