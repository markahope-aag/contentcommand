// @ts-nocheck
/**
 * Tests for app/api/integrations/sync/route.ts
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

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/integrations/dataforseo", () => ({
  dataForSEO: {
    getDomainMetrics: jest.fn(),
    getCompetitorKeywords: jest.fn(),
  },
}));

jest.mock("@/lib/integrations/frase", () => ({
  frase: {
    analyzeSerp: jest.fn(),
  },
}));

jest.mock("@/lib/integrations/llmrefs", () => ({
  getKeywords: jest.fn(),
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

import { POST } from "@/app/api/integrations/sync/route";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { frase } from "@/lib/integrations/frase";
import { getKeywords } from "@/lib/integrations/llmrefs";
import { RateLimitError } from "@/lib/integrations/base";

const mockUser = { id: "user-1", email: "test@example.com" };
const VALID_CLIENT_UUID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_ORG_UUID = "550e8400-e29b-41d4-a716-446655440002";
const VALID_PROJ_UUID = "550e8400-e29b-41d4-a716-446655440003";

function makeRequest(body: object) {
  return { json: jest.fn().mockResolvedValue(body) } as any;
}

function buildAdminFrom(clientData: any, competitorData: any) {
  const mockFrom = jest.fn();
  const clientChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(clientData),
  };
  const competitorChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(competitorData),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === "clients") return clientChain;
    if (table === "competitors") return competitorChain;
    return clientChain;
  });

  return mockFrom;
}

describe("POST /api/integrations/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, provider: "dataforseo" }));
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns error for invalid body (missing provider)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID }));
    expect(response).toBeDefined();
    expect(response.status).not.toBe(200);
  });

  it("returns 403 when user does not have access to client", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, provider: "dataforseo" }));
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden");
  });

  it("returns 404 when client is not found", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const mockFrom = buildAdminFrom(
      { data: null, error: null },
      { data: [], error: null }
    );

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, provider: "dataforseo" }));
    expect(response.status).toBe(404);
  });

  it("syncs dataforseo data successfully", async () => {
    const mockClient = { id: VALID_CLIENT_UUID, domain: "acme.com", target_keywords: ["seo"] };
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ metrics: true });

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const mockFrom = buildAdminFrom(
      { data: mockClient, error: null },
      { data: [], error: null }
    );

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, provider: "dataforseo" }));
    expect(response.body.data).toBeDefined();
    expect(response.body.data.domainMetrics).toEqual({ metrics: true });
  });

  it("syncs frase data when provider is frase", async () => {
    const mockClient = { id: VALID_CLIENT_UUID, domain: "acme.com", target_keywords: ["seo tools"] };
    (frase.analyzeSerp as jest.Mock).mockResolvedValue({ results: [] });

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const mockFrom = buildAdminFrom(
      { data: mockClient, error: null },
      { data: [], error: null }
    );

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, provider: "frase" }));
    expect(response.body.data.serpAnalysis).toBeDefined();
  });

  it("syncs llmrefs data when provider is llmrefs", async () => {
    const mockClient = { id: VALID_CLIENT_UUID, domain: "acme.com" };
    (getKeywords as jest.Mock).mockResolvedValue([{ id: "kw-1", keyword: "seo" }]);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const mockFrom = buildAdminFrom(
      { data: mockClient, error: null },
      { data: [], error: null }
    );

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const response = await POST(makeRequest({
      clientId: VALID_CLIENT_UUID,
      provider: "llmrefs",
      organizationId: VALID_ORG_UUID,
      projectId: VALID_PROJ_UUID,
    }));
    expect(response.body.data.keywords).toBeDefined();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const mockClient = { id: VALID_CLIENT_UUID, domain: "acme.com" };
    (dataForSEO.getDomainMetrics as jest.Mock).mockRejectedValue(new RateLimitError("dataforseo", 60));

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const mockFrom = buildAdminFrom(
      { data: mockClient, error: null },
      { data: [], error: null }
    );

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const response = await POST(makeRequest({ clientId: VALID_CLIENT_UUID, provider: "dataforseo" }));
    expect(response.status).toBe(429);
    expect(response.body.retryAfter).toBe(60);
  });
});
