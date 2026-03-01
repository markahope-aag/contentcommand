// @ts-nocheck
/**
 * Tests for app/api/content/score/route.ts
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
  scoreContent: jest.fn(),
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

import { POST } from "@/app/api/content/score/route";
import { createClient } from "@/lib/supabase/server";
import { scoreContent } from "@/lib/ai/content-engine";
import { RateLimitError } from "@/lib/integrations/base";

const mockUser = { id: "user-1", email: "test@example.com" };
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440001";

function makeRequest(body: object) {
  return { json: jest.fn().mockResolvedValue(body) } as any;
}

describe("POST /api/content/score", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const response = await POST(makeRequest({ contentId: VALID_UUID }));
    expect(response.status).toBe(401);
  });

  it("returns error for invalid body (missing contentId)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    });

    const response = await POST(makeRequest({}));
    expect(response).toBeDefined();
    expect(response.status).not.toBe(200);
  });

  it("returns 404 when content is not found", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await POST(makeRequest({ contentId: VALID_UUID }));
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Content not found");
  });

  it("returns 403 when user does not have access", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: "550e8400-e29b-41d4-a716-111111110001" }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    const response = await POST(makeRequest({ contentId: VALID_UUID }));
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Access denied");
  });

  it("returns analysis when scoring succeeds", async () => {
    const mockAnalysis = { overallScore: 85, readabilityScore: 90 };
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: "550e8400-e29b-41d4-a716-111111110001" }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (scoreContent as jest.Mock).mockResolvedValue(mockAnalysis);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await POST(makeRequest({ contentId: VALID_UUID }));
    expect(response.body.data).toEqual(mockAnalysis);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: null }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (scoreContent as jest.Mock).mockRejectedValue(new RateLimitError("claude", 60));

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await POST(makeRequest({ contentId: VALID_UUID }));
    expect(response.status).toBe(429);
    expect(response.body.error).toBe("Rate limit exceeded");
    expect(response.body.retryAfter).toBe(60);
  });

  it("returns 500 when scoreContent throws unexpected error", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: null }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (scoreContent as jest.Mock).mockRejectedValue(new Error("Unexpected error"));

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await POST(makeRequest({ contentId: VALID_UUID }));
    expect(response.status).toBe(500);
  });
});
