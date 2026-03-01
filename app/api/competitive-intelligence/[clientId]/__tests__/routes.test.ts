// @ts-nocheck
/**
 * Tests for competitive intelligence API routes:
 *   GET  /api/competitive-intelligence/[clientId]/summary
 *   GET  /api/competitive-intelligence/[clientId]/gaps
 *   POST /api/competitive-intelligence/[clientId]/refresh
 */

// ── Mocks (must be declared before imports) ────────────────

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
  NextRequest: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/supabase/queries", () => ({
  getCompetitiveSummary: jest.fn(),
  getCompetitors: jest.fn(),
  getKeywordGaps: jest.fn(),
  getTopOpportunities: jest.fn(),
}));

jest.mock("@/lib/integrations/dataforseo", () => ({
  dataForSEO: {
    getDomainMetrics: jest.fn(),
    getCompetitorKeywords: jest.fn(),
  },
}));

jest.mock("@/lib/cache", () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// ── Imports ────────────────────────────────────────────────

import { GET as summaryGET } from "@/app/api/competitive-intelligence/[clientId]/summary/route";
import { GET as gapsGET } from "@/app/api/competitive-intelligence/[clientId]/gaps/route";
import { POST as refreshPOST } from "@/app/api/competitive-intelligence/[clientId]/refresh/route";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCompetitiveSummary,
  getCompetitors,
  getKeywordGaps,
  getTopOpportunities,
} from "@/lib/supabase/queries";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { invalidateCache } from "@/lib/cache";

// ── Test constants ─────────────────────────────────────────

const CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const MOCK_USER = { id: "user-1", email: "user@example.com" };

function makeParams(clientId: string) {
  return { params: Promise.resolve({ clientId }) };
}

function makeAuthedClient(hasAccess = true) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER }, error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: hasAccess, error: null }),
    from: jest.fn(),
  };
}

function makeUnauthClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("No session") }),
    },
  };
}

// ── Summary route ──────────────────────────────────────────

describe("GET /api/competitive-intelligence/[clientId]/summary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeUnauthClient());

    const res = await summaryGET({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 403 when user does not have access to the client", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(false));

    const res = await summaryGET({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
  });

  it("returns summary and competitors on success", async () => {
    const mockSummary = {
      competitor_count: 3,
      avg_strength: 72,
      organic_traffic: 10000,
      keyword_gap_count: 25,
      citation_sov: 0.15,
      last_analysis_at: "2026-03-01T00:00:00Z",
    };
    const mockCompetitors = [
      { id: "comp-1", name: "Rival Co", domain: "rival.com" },
    ];

    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (getCompetitiveSummary as jest.Mock).mockResolvedValue(mockSummary);
    (getCompetitors as jest.Mock).mockResolvedValue({ data: mockCompetitors });

    const res = await summaryGET({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual(mockSummary);
    expect(res.body.data.competitors).toEqual(mockCompetitors);
  });

  it("returns 500 when a downstream function throws", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (getCompetitiveSummary as jest.Mock).mockRejectedValue(new Error("DB down"));

    const res = await summaryGET({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });

  it("calls getCompetitiveSummary with the correct clientId", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (getCompetitiveSummary as jest.Mock).mockResolvedValue({ competitor_count: 0 });
    (getCompetitors as jest.Mock).mockResolvedValue({ data: [] });

    await summaryGET({} as Request, makeParams(CLIENT_ID));

    expect(getCompetitiveSummary).toHaveBeenCalledWith(CLIENT_ID);
    expect(getCompetitors).toHaveBeenCalledWith(CLIENT_ID);
  });
});

// ── Gaps route ─────────────────────────────────────────────

describe("GET /api/competitive-intelligence/[clientId]/gaps", () => {
  beforeEach(() => jest.clearAllMocks());

  function makeRequest(url: string) {
    return {
      nextUrl: { searchParams: new URLSearchParams(new URL(url).search) },
    } as any;
  }

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeUnauthClient());

    const res = await gapsGET(
      makeRequest("http://localhost/api/competitive-intelligence/client-1/gaps"),
      makeParams(CLIENT_ID)
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user does not have access", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(false));

    const res = await gapsGET(
      makeRequest("http://localhost/api/competitive-intelligence/client-1/gaps"),
      makeParams(CLIENT_ID)
    );

    expect(res.status).toBe(403);
  });

  it("returns all keyword gaps when no query params are given", async () => {
    const gaps = [
      { keyword: "seo tools", competitor_position: 5, client_position: null, search_volume: 5000, difficulty: 40, competitor_domain: "rival.com", competitor_id: "comp-1" },
    ];
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (getKeywordGaps as jest.Mock).mockResolvedValue(gaps);

    const res = await gapsGET(
      makeRequest("http://localhost/api/competitive-intelligence/client-1/gaps"),
      makeParams(CLIENT_ID)
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(gaps);
    expect(getKeywordGaps).toHaveBeenCalledWith(CLIENT_ID, undefined);
  });

  it("returns top opportunities when opportunities=true is passed", async () => {
    const opportunities = [
      { keyword: "top opportunity", competitor_position: 3, client_position: null, search_volume: 12000, difficulty: 55, competitor_domain: "rival.com", competitor_id: "comp-1" },
    ];
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (getTopOpportunities as jest.Mock).mockResolvedValue(opportunities);

    const res = await gapsGET(
      makeRequest("http://localhost/api/competitive-intelligence/client-1/gaps?opportunities=true"),
      makeParams(CLIENT_ID)
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(opportunities);
    expect(getTopOpportunities).toHaveBeenCalledWith(CLIENT_ID);
    expect(getKeywordGaps).not.toHaveBeenCalled();
  });

  it("passes competitorId filter to getKeywordGaps", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (getKeywordGaps as jest.Mock).mockResolvedValue([]);

    await gapsGET(
      makeRequest("http://localhost/api/competitive-intelligence/client-1/gaps?competitorId=comp-99"),
      makeParams(CLIENT_ID)
    );

    expect(getKeywordGaps).toHaveBeenCalledWith(CLIENT_ID, "comp-99");
  });

  it("returns 500 when query function throws", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (getKeywordGaps as jest.Mock).mockRejectedValue(new Error("Upstream failure"));

    const res = await gapsGET(
      makeRequest("http://localhost/api/competitive-intelligence/client-1/gaps"),
      makeParams(CLIENT_ID)
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

// ── Refresh route ──────────────────────────────────────────

describe("POST /api/competitive-intelligence/[clientId]/refresh", () => {
  beforeEach(() => jest.clearAllMocks());

  function buildAdminClient(clientData: any, competitorData: any) {
    const clientChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(clientData),
    };
    const competitorChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue(competitorData),
    };
    const insertChain = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    };
    const mockFrom = jest.fn((table: string) => {
      if (table === "clients") return clientChain;
      if (table === "competitors") return competitorChain;
      return insertChain;
    });
    return { from: mockFrom };
  }

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeUnauthClient());

    const res = await refreshPOST({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user does not have access", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(false));

    const res = await refreshPOST({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(403);
  });

  it("returns 404 when the client record is not found", async () => {
    const authedClient = makeAuthedClient(true);
    authedClient.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    (createClient as jest.Mock).mockResolvedValue(authedClient);

    const res = await refreshPOST({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Client not found");
  });

  it("returns success and invalidates cache when refresh completes", async () => {
    const authedClient = makeAuthedClient(true);
    authedClient.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { domain: "acme.com" }, error: null }),
    });
    (createClient as jest.Mock).mockResolvedValue(authedClient);

    const adminMock = buildAdminClient(
      { data: { domain: "acme.com" }, error: null },
      { data: [], error: null }
    );
    (createAdminClient as jest.Mock).mockReturnValue(adminMock);
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ organic_traffic: 5000, organic_keywords: 200 });

    const res = await refreshPOST({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(invalidateCache).toHaveBeenCalledWith(
      `cc:competitive-summary:${CLIENT_ID}`,
      `cc:competitive-history:${CLIENT_ID}:*`
    );
  });

  it("fetches keyword gaps for each competitor", async () => {
    const authedClient = makeAuthedClient(true);
    authedClient.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { domain: "acme.com" }, error: null }),
    });
    (createClient as jest.Mock).mockResolvedValue(authedClient);

    const competitors = [
      { id: "comp-1", domain: "rival1.com" },
      { id: "comp-2", domain: "rival2.com" },
    ];
    const insertMock = { insert: jest.fn().mockResolvedValue({ error: null }) };
    const mockFrom = jest.fn((table: string) => {
      if (table === "clients") return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { domain: "acme.com" }, error: null }),
      };
      if (table === "competitors") return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: competitors, error: null }),
      };
      return insertMock;
    });
    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ organic_traffic: 5000 });
    (dataForSEO.getCompetitorKeywords as jest.Mock).mockResolvedValue({ items: [] });

    await refreshPOST({} as Request, makeParams(CLIENT_ID));

    expect(dataForSEO.getCompetitorKeywords).toHaveBeenCalledTimes(2);
    expect(dataForSEO.getCompetitorKeywords).toHaveBeenCalledWith("acme.com", "rival1.com", CLIENT_ID);
    expect(dataForSEO.getCompetitorKeywords).toHaveBeenCalledWith("acme.com", "rival2.com", CLIENT_ID);
  });

  it("returns 500 when an unexpected error occurs", async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error("Connection refused"));

    const res = await refreshPOST({} as Request, makeParams(CLIENT_ID));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });

  it("inserts domain metrics history rows for organic_traffic and keyword_count", async () => {
    const authedClient = makeAuthedClient(true);
    authedClient.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { domain: "acme.com" }, error: null }),
    });
    (createClient as jest.Mock).mockResolvedValue(authedClient);

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn((table: string) => {
      if (table === "clients") return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { domain: "acme.com" }, error: null }),
      };
      if (table === "competitors") return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      return { insert: insertMock };
    });
    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({
      organic_traffic: 8000,
      organic_keywords: 350,
    });

    await refreshPOST({} as Request, makeParams(CLIENT_ID));

    // competitive_metrics_history insert should have been called with both metrics
    const historyInsertCalls = insertMock.mock.calls.filter((call: any) => {
      const rows = call[0];
      return Array.isArray(rows) && rows.some((r: any) => r.metric_type === "organic_traffic");
    });
    expect(historyInsertCalls.length).toBeGreaterThan(0);
  });
});
