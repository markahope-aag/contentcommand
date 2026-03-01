// @ts-nocheck
/**
 * Tests for app/api/content/performance/[clientId]/route.ts
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

jest.mock("@/lib/supabase/queries", () => ({
  getAiUsageSummary: jest.fn(),
  getContentPipelineStats: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { GET } from "@/app/api/content/performance/[clientId]/route";
import { createClient } from "@/lib/supabase/server";
import { getAiUsageSummary, getContentPipelineStats } from "@/lib/supabase/queries";

const mockUser = { id: "user-1", email: "test@example.com" };

const mockUsageSummary = {
  totalCost: 5.0,
  totalInputTokens: 10000,
  totalOutputTokens: 5000,
  byProvider: { claude: { cost: 5.0, calls: 10 } },
  byOperation: { generate_content: { cost: 5.0, calls: 10 } },
};

const mockPipelineStats = { draft: 5, approved: 3, generated: 2 };

function makeParams(clientId: string) {
  return { params: Promise.resolve({ clientId }) };
}

describe("GET /api/content/performance/[clientId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const response = await GET({} as any, makeParams("client-1"));
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 403 when user does not have access to client", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    const response = await GET({} as any, makeParams("client-1"));
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Access denied");
  });

  it("returns usage summary and pipeline stats for authorized user", async () => {
    (getAiUsageSummary as jest.Mock).mockResolvedValue(mockUsageSummary);
    (getContentPipelineStats as jest.Mock).mockResolvedValue(mockPipelineStats);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await GET({} as any, makeParams("client-1"));
    expect(response.body.data.usageSummary).toEqual(mockUsageSummary);
    expect(response.body.data.pipelineStats).toEqual(mockPipelineStats);
  });

  it("calls getAiUsageSummary and getContentPipelineStats with clientId", async () => {
    (getAiUsageSummary as jest.Mock).mockResolvedValue(mockUsageSummary);
    (getContentPipelineStats as jest.Mock).mockResolvedValue(mockPipelineStats);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    await GET({} as any, makeParams("my-client"));

    expect(getAiUsageSummary).toHaveBeenCalledWith("my-client");
    expect(getContentPipelineStats).toHaveBeenCalledWith("my-client");
  });

  it("returns 500 when getAiUsageSummary throws", async () => {
    (getAiUsageSummary as jest.Mock).mockRejectedValue(new Error("DB error"));
    (getContentPipelineStats as jest.Mock).mockResolvedValue(mockPipelineStats);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await GET({} as any, makeParams("client-1"));
    expect(response.status).toBe(500);
  });

  it("verifies client access using user_has_client_access RPC", async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
    (getAiUsageSummary as jest.Mock).mockResolvedValue(mockUsageSummary);
    (getContentPipelineStats as jest.Mock).mockResolvedValue(mockPipelineStats);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: mockRpc,
    });

    await GET({} as any, makeParams("client-xyz"));

    expect(mockRpc).toHaveBeenCalledWith("user_has_client_access", {
      check_client_id: "client-xyz",
    });
  });
});
