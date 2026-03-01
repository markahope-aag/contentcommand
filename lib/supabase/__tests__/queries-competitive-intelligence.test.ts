// @ts-nocheck
/**
 * Tests for competitive intelligence query helpers in lib/supabase/queries.ts
 * Covers lines 663-765: getCompetitiveSummary, getCompetitiveMetricsHistory,
 * getKeywordGaps, getTopOpportunities
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  withCache: jest.fn((key, fn, ttl) => fn()),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getCompetitiveSummary,
  getCompetitiveMetricsHistory,
  getKeywordGaps,
  getTopOpportunities,
} from "@/lib/supabase/queries";

// ── Chain builders matching the pattern from queries-extended.test.ts ──

/** RPC chain: resolves via rpc() call */
function buildRpcClient(resolveWith: any) {
  return {
    rpc: jest.fn().mockResolvedValue(resolveWith),
  };
}

/**
 * Order chain: select().eq().gte().order() — the result of order() is awaited,
 * and may optionally have .eq() chained on it (metricType filter).
 * Uses a thenable chain so both await patterns work.
 */
function buildOrderChain(resolveWith: any) {
  function makeThenableChain() {
    const obj: any = {};
    obj.then = (resolve: any, _reject: any) => Promise.resolve(resolveWith).then(resolve);
    obj.catch = (onRejected: any) => Promise.resolve(resolveWith).catch(onRejected);
    const methods = ["eq", "order", "gt", "gte", "select", "limit", "range", "single"];
    for (const method of methods) {
      obj[method] = jest.fn(() => makeThenableChain());
    }
    return obj;
  }

  const chain: any = {};
  const methods = ["select", "eq", "gte", "gt", "limit", "range", "single"];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.order = jest.fn(() => makeThenableChain());
  return chain;
}

/**
 * Chain for getKeywordGaps.
 *
 * The function builds: from().select().eq().eq().gt().order() → awaitable
 * Then optionally: query = query.eq("competitor_id", ...) → awaitable
 *
 * We achieve this by returning a "thenable chain" object from order() that:
 *  - Resolves (via then/catch) to resolveWith when awaited directly
 *  - Returns another thenable from .eq() for the optional competitor filter
 */
function buildFilterChain(resolveWith: any) {
  function makeThenableChain() {
    const obj: any = {};
    // Make it thenable so `await obj` works
    obj.then = (resolve: any, _reject: any) => Promise.resolve(resolveWith).then(resolve);
    obj.catch = (onRejected: any) => Promise.resolve(resolveWith).catch(onRejected);
    // Support chaining more methods on the awaitable
    const methods = ["eq", "order", "gt", "gte", "select", "limit", "range", "single"];
    for (const method of methods) {
      obj[method] = jest.fn(() => makeThenableChain());
    }
    return obj;
  }

  const chain: any = {};
  const methods = ["select", "eq", "gte", "gt", "limit", "range", "single"];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  // order() returns a thenable chain
  chain.order = jest.fn(() => makeThenableChain());
  return chain;
}

// ─────────────────────────────────────────────────────────────

describe("getCompetitiveSummary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns summary data returned by the RPC function", async () => {
    const raw = {
      competitor_count: 3,
      avg_strength: 72.5,
      organic_traffic: 15000,
      keyword_gap_count: 42,
      citation_sov: 0.18,
      last_analysis_at: "2026-03-01T00:00:00Z",
    };
    (createClient as jest.Mock).mockResolvedValue(buildRpcClient({ data: raw, error: null }));

    const result = await getCompetitiveSummary("client-1");

    expect(result).toEqual(raw);
  });

  it("returns zero defaults when RPC returns null data", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildRpcClient({ data: null, error: null }));

    const result = await getCompetitiveSummary("client-1");

    expect(result).toEqual({
      competitor_count: 0,
      avg_strength: 0,
      organic_traffic: 0,
      keyword_gap_count: 0,
      citation_sov: 0,
      last_analysis_at: null,
    });
  });

  it("throws when the RPC returns an error", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildRpcClient({ data: null, error: new Error("RPC failed") })
    );

    await expect(getCompetitiveSummary("client-1")).rejects.toThrow("RPC failed");
  });

  it("passes the clientId to the RPC call", async () => {
    const mockClient = buildRpcClient({ data: null, error: null });
    (createClient as jest.Mock).mockResolvedValue(mockClient);

    await getCompetitiveSummary("specific-client-id");

    expect(mockClient.rpc).toHaveBeenCalledWith("get_competitive_summary", {
      p_client_id: "specific-client-id",
    });
  });
});

// ─────────────────────────────────────────────────────────────

describe("getCompetitiveMetricsHistory", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns metrics history rows from the database", async () => {
    const rows = [
      { id: "row-1", client_id: "client-1", metric_type: "organic_traffic", metric_value: 10000, recorded_at: "2026-02-28T00:00:00Z" },
      { id: "row-2", client_id: "client-1", metric_type: "organic_traffic", metric_value: 11000, recorded_at: "2026-03-01T00:00:00Z" },
    ];
    const chain = buildOrderChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getCompetitiveMetricsHistory("client-1");

    expect(result).toEqual(rows);
  });

  it("returns empty array when metricType filter is applied but no rows match", async () => {
    const chain = buildOrderChain({ data: [], error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getCompetitiveMetricsHistory("client-1", "keyword_count", 30);

    expect(result).toEqual([]);
  });

  it("returns all rows when no metricType filter is provided", async () => {
    const rows = [
      { id: "r1", metric_type: "organic_traffic", metric_value: 5000 },
      { id: "r2", metric_type: "keyword_count", metric_value: 200 },
    ];
    const chain = buildOrderChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getCompetitiveMetricsHistory("client-1");

    expect(result).toHaveLength(2);
  });

  it("throws when the database returns an error", async () => {
    const chain = buildOrderChain({ data: null, error: new Error("DB error") });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    await expect(getCompetitiveMetricsHistory("client-1")).rejects.toThrow("DB error");
  });

  it("queries the competitive_metrics_history table", async () => {
    const mockFrom = jest.fn().mockReturnValue(buildOrderChain({ data: [], error: null }));
    (createClient as jest.Mock).mockResolvedValue({ from: mockFrom });

    await getCompetitiveMetricsHistory("client-1");

    expect(mockFrom).toHaveBeenCalledWith("competitive_metrics_history");
  });
});

// ─────────────────────────────────────────────────────────────

describe("getKeywordGaps", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns an empty array when there are no analysis rows", async () => {
    const chain = buildFilterChain({ data: [], error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getKeywordGaps("client-1");

    expect(result).toEqual([]);
  });

  it("parses keyword gap items from JSONB data field", async () => {
    const rows = [
      {
        id: "analysis-1",
        client_id: "client-1",
        competitor_id: "comp-1",
        analysis_type: "keyword_gap",
        data: {
          items: [
            {
              keyword: "seo tools",
              client_position: null,
              competitor_position: 5,
              competitor_domain: "rival.com",
              search_volume: 5000,
              difficulty: 45,
            },
            {
              keyword: "content marketing",
              client_position: 25,
              competitor_position: 3,
              competitor_domain: "rival.com",
              search_volume: 8000,
              difficulty: 60,
            },
          ],
        },
      },
    ];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getKeywordGaps("client-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      keyword: "seo tools",
      client_position: null,
      competitor_position: 5,
      competitor_domain: "rival.com",
      competitor_id: "comp-1",
      search_volume: 5000,
      difficulty: 45,
    });
    expect(result[1].keyword).toBe("content marketing");
    expect(result[1].client_position).toBe(25);
  });

  it("skips rows where data.items is not an array", async () => {
    const rows = [
      {
        id: "analysis-1",
        client_id: "client-1",
        competitor_id: "comp-1",
        data: { items: "not-an-array" },
      },
      {
        id: "analysis-2",
        client_id: "client-1",
        competitor_id: "comp-2",
        data: { no_items_key: true },
      },
    ];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getKeywordGaps("client-1");

    expect(result).toEqual([]);
  });

  it("returns empty array when competitorId filter is applied but no rows match", async () => {
    const chain = buildFilterChain({ data: [], error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getKeywordGaps("client-1", "comp-specific");

    expect(result).toEqual([]);
  });

  it("returns gaps from all competitors when no competitorId is provided", async () => {
    const rows = [
      {
        id: "a1",
        client_id: "client-1",
        competitor_id: "comp-1",
        data: { items: [{ keyword: "kw1", client_position: null, competitor_position: 5, competitor_domain: "rival.com", search_volume: 1000, difficulty: 30 }] },
      },
    ];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getKeywordGaps("client-1");

    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe("kw1");
  });

  it("throws when the database returns an error", async () => {
    const chain = buildFilterChain({ data: null, error: new Error("Query failed") });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    await expect(getKeywordGaps("client-1")).rejects.toThrow("Query failed");
  });

  it("uses empty string for missing keyword/competitor_domain fields", async () => {
    const rows = [
      {
        id: "analysis-1",
        client_id: "client-1",
        competitor_id: "comp-1",
        data: {
          items: [
            {
              // intentionally missing keyword, competitor_domain
              client_position: null,
              competitor_position: 10,
              search_volume: 1000,
              difficulty: 20,
            },
          ],
        },
      },
    ];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getKeywordGaps("client-1");

    expect(result[0].keyword).toBe("");
    expect(result[0].competitor_domain).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────

describe("getTopOpportunities", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns only gaps where competitor ranks ≤20 and client does not", async () => {
    const rows = [
      {
        id: "a1",
        client_id: "client-1",
        competitor_id: "comp-1",
        data: {
          items: [
            // Opportunity: competitor ranks 5, client not ranking
            { keyword: "target keyword", client_position: null, competitor_position: 5, competitor_domain: "rival.com", search_volume: 9000, difficulty: 40 },
            // Opportunity: competitor ranks 15, client ranks 50
            { keyword: "second target", client_position: 50, competitor_position: 15, competitor_domain: "rival.com", search_volume: 4000, difficulty: 30 },
            // Not an opportunity: client already ranks ≤20
            { keyword: "already ranking", client_position: 10, competitor_position: 3, competitor_domain: "rival.com", search_volume: 7000, difficulty: 50 },
            // Not an opportunity: competitor ranks >20
            { keyword: "deep result", client_position: null, competitor_position: 25, competitor_domain: "rival.com", search_volume: 3000, difficulty: 20 },
          ],
        },
      },
    ];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getTopOpportunities("client-1");

    expect(result).toHaveLength(2);
    expect(result.map((r: any) => r.keyword)).toEqual(["target keyword", "second target"]);
  });

  it("sorts opportunities by search_volume descending", async () => {
    const rows = [
      {
        id: "a1",
        client_id: "client-1",
        competitor_id: "comp-1",
        data: {
          items: [
            { keyword: "low volume", client_position: null, competitor_position: 5, competitor_domain: "rival.com", search_volume: 500, difficulty: 20 },
            { keyword: "high volume", client_position: null, competitor_position: 8, competitor_domain: "rival.com", search_volume: 12000, difficulty: 55 },
            { keyword: "mid volume", client_position: null, competitor_position: 12, competitor_domain: "rival.com", search_volume: 3000, difficulty: 35 },
          ],
        },
      },
    ];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getTopOpportunities("client-1");

    expect(result[0].keyword).toBe("high volume");
    expect(result[1].keyword).toBe("mid volume");
    expect(result[2].keyword).toBe("low volume");
  });

  it("respects the limit parameter", async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      keyword: `keyword-${i}`,
      client_position: null,
      competitor_position: 5,
      competitor_domain: "rival.com",
      search_volume: 1000 + i,
      difficulty: 30,
    }));
    const rows = [{ id: "a1", client_id: "client-1", competitor_id: "comp-1", data: { items } }];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getTopOpportunities("client-1", 5);

    expect(result).toHaveLength(5);
  });

  it("returns empty array when there are no qualifying gaps", async () => {
    const rows = [
      {
        id: "a1",
        client_id: "client-1",
        competitor_id: "comp-1",
        data: {
          items: [
            // Client already ranks well
            { keyword: "ranked well", client_position: 5, competitor_position: 3, competitor_domain: "rival.com", search_volume: 5000, difficulty: 40 },
          ],
        },
      },
    ];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getTopOpportunities("client-1");

    expect(result).toEqual([]);
  });

  it("defaults to limit of 20", async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      keyword: `keyword-${i}`,
      client_position: null,
      competitor_position: 5,
      competitor_domain: "rival.com",
      search_volume: 1000,
      difficulty: 30,
    }));
    const rows = [{ id: "a1", client_id: "client-1", competitor_id: "comp-1", data: { items } }];
    const chain = buildFilterChain({ data: rows, error: null });
    (createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await getTopOpportunities("client-1");

    expect(result).toHaveLength(20);
  });
});
