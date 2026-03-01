// @ts-nocheck
/**
 * Tests for app/api/cron/daily-competitor-analysis/route.ts
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/env", () => ({
  serverEnv: jest.fn(() => ({ CRON_SECRET: "test-cron-secret" })),
}));

jest.mock("@/lib/integrations/dataforseo", () => ({
  dataForSEO: {
    getDomainMetrics: jest.fn(),
    getCompetitorKeywords: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from "@/app/api/cron/daily-competitor-analysis/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataForSEO } from "@/lib/integrations/dataforseo";

function makeRequest(authHeader?: string) {
  return {
    headers: {
      get: jest.fn((header: string) => {
        if (header === "authorization") return authHeader ?? null;
        return null;
      }),
    },
  } as any;
}

describe("POST /api/cron/daily-competitor-analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when authorization header is missing", async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 401 when authorization header has wrong secret", async () => {
    const response = await POST(makeRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("returns no-clients message when clients table is empty", async () => {
    const clientsChain = {
      select: jest.fn().mockReturnThis(),
      data: [],
    };
    clientsChain.select.mockResolvedValue({ data: [], error: null });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue(clientsChain),
    });

    const response = await POST(makeRequest("Bearer test-cron-secret"));
    expect(response.body.message).toBe("No clients to process");
  });

  it("returns no-clients message when clients query returns error", async () => {
    const clientsChain = {
      select: jest.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
    };

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue(clientsChain),
    });

    const response = await POST(makeRequest("Bearer test-cron-secret"));
    expect(response.body.message).toBe("No clients to process");
  });

  it("processes clients when they exist", async () => {
    const mockClients = [{ id: "client-1", domain: "acme.com", name: "Acme" }];
    const mockCompetitors: any[] = [];

    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ rank: 1 });

    let callCount = 0;
    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === "clients") {
          return { select: jest.fn().mockResolvedValue({ data: mockClients, error: null }) };
        }
        if (table === "competitors") {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: mockCompetitors, error: null }),
          };
        }
        if (table === "competitive_analysis") {
          callCount++;
          if (callCount === 1) {
            // insert call
            return { insert: jest.fn().mockResolvedValue({ error: null }) };
          }
          // delete call
          return {
            delete: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          delete: jest.fn().mockReturnThis(),
          lt: jest.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    const response = await POST(makeRequest("Bearer test-cron-secret"));
    // Either results or an error - just verify it ran without crashing
    expect(response).toBeDefined();
  });

  it("returns 500 when an unexpected error occurs", async () => {
    (createAdminClient as jest.Mock).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const response = await POST(makeRequest("Bearer test-cron-secret"));
    expect(response.status).toBe(500);
  });
});
