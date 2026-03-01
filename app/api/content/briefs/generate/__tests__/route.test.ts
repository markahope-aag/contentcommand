// @ts-nocheck
/**
 * Tests for app/api/content/briefs/generate/route.ts
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/ai/content-engine", () => ({
  generateBrief: jest.fn(),
}));

jest.mock("@/lib/integrations/base", () => {
  class RateLimitError extends Error {
    constructor(provider: string, public retryAfter: number) {
      super(`Rate limit exceeded for ${provider}`);
      this.name = "RateLimitError";
    }
  }
  return { RateLimitError };
});

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from "@/app/api/content/briefs/generate/route";
import { createClient } from "@/lib/supabase/server";
import { generateBrief } from "@/lib/ai/content-engine";
import { RateLimitError } from "@/lib/integrations/base";

const mockUser = { id: "user-1", email: "test@example.com" };
const VALID_CLIENT_UUID = "550e8400-e29b-41d4-a716-446655440001";

function makeRequest(body: object) {
  return { json: jest.fn().mockResolvedValue(body) } as any;
}

describe("POST /api/content/briefs/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, targetKeyword: "seo" }));
    expect(response.status).toBe(401);
  });

  it("returns error for invalid body (missing clientId)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    });

    const response = await POST(makeRequest({ targetKeyword: "seo" }));
    expect(response).toBeDefined();
    expect(response.status).not.toBe(200);
  });

  it("returns 403 when user does not have access to client", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, targetKeyword: "seo" }));
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Access denied");
  });

  it("generates brief and returns data on success", async () => {
    const mockBrief = { id: "brief-1", title: "SEO Guide", target_keyword: "seo" };
    (generateBrief as jest.Mock).mockResolvedValue(mockBrief);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, targetKeyword: "seo" }));
    expect(response.body.data).toEqual(mockBrief);
  });

  it("calls generateBrief with correct params", async () => {
    (generateBrief as jest.Mock).mockResolvedValue({ id: "brief-1" });

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    await POST(makeRequest({ clientId: VALID_CLIENT_UUID, targetKeyword: "content marketing", contentType: "blog_post" }));

    expect(generateBrief).toHaveBeenCalledWith({
      clientId: VALID_CLIENT_UUID,
      targetKeyword: "content marketing",
      contentType: "blog_post",
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    (generateBrief as jest.Mock).mockRejectedValue(new RateLimitError("claude", 30));

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, targetKeyword: "seo" }));
    expect(response.status).toBe(429);
    expect(response.body.retryAfter).toBe(30);
  });

  it("returns 500 when generateBrief throws unexpected error", async () => {
    (generateBrief as jest.Mock).mockRejectedValue(new Error("AI service down"));

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, targetKeyword: "seo" }));
    expect(response.status).toBe(500);
  });
});
