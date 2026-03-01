// @ts-nocheck
/**
 * Additional tests for lib/supabase/queries.ts - covering lines 248-269, 321-332, 348-369,
 * 386-407, 446-460, 481-491, 585-655
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  withCache: jest.fn((key, fn, ttl) => fn()),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import { invalidateCache } from "@/lib/cache";

import {
  updateCompetitor,
  deleteCompetitor,
  getContentBriefs,
  createContentBrief,
  updateContentBrief,
  deleteContentBrief,
  getGeneratedContentByBrief,
  getGeneratedContentByClient,
  updateGeneratedContent,
  getAiUsageByClient,
  getApiRequestLogs,
  getGoogleOAuthStatus,
  getCompetitiveAnalysis,
  getAiCitations,
} from "@/lib/supabase/queries";

/**
 * Creates a chainable Supabase mock where every method returns `this`,
 * and `single` resolves with `resolveWith`.
 */
function buildChain(resolveWith: any) {
  const chain: any = {};
  const methods = ["select", "insert", "update", "delete", "eq", "order", "limit", "range", "single", "gt"];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.single.mockResolvedValue(resolveWith);
  return chain;
}

/**
 * Creates a chainable mock where the terminal `order` resolves with the given value.
 */
function buildOrderChain(resolveWith: any) {
  const chain: any = {};
  const methods = ["select", "insert", "update", "delete", "eq", "order", "limit", "range", "single", "gt"];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.order.mockResolvedValue(resolveWith);
  return chain;
}

/**
 * Creates a mock where eq() resolves directly (for delete chains).
 */
function buildDeleteChain(resolveWith: any) {
  const chain: any = {};
  const methods = ["select", "insert", "update", "delete", "eq", "order", "limit", "range", "single", "gt"];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.eq.mockResolvedValue(resolveWith);
  return chain;
}

describe("updateCompetitor", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates competitor and returns updated data", async () => {
    const updated = { id: "comp-1", client_id: "client-1", name: "Updated", domain: "updated.com" };
    const chain = buildChain({ data: updated, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await updateCompetitor("comp-1", { name: "Updated" });
    expect(result).toEqual(updated);
    expect(invalidateCache).toHaveBeenCalledWith("cc:competitors:client-1");
  });

  it("throws when database returns error", async () => {
    const chain = buildChain({ data: null, error: new Error("Update failed") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(updateCompetitor("comp-1", { name: "Fail" })).rejects.toThrow("Update failed");
  });
});

describe("deleteCompetitor", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes competitor and invalidates cache", async () => {
    const chain = buildDeleteChain({ error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await deleteCompetitor("comp-1", "client-1");
    expect(invalidateCache).toHaveBeenCalledWith("cc:competitors:client-1");
  });

  it("throws when deletion fails", async () => {
    const chain = buildDeleteChain({ error: new Error("Delete failed") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(deleteCompetitor("comp-1", "client-1")).rejects.toThrow("Delete failed");
  });
});

describe("getContentBriefs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns briefs for a client", async () => {
    const briefs = [{ id: "b-1", client_id: "client-1" }];
    const chain = buildOrderChain({ data: briefs, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getContentBriefs("client-1");
    expect(result).toEqual(briefs);
  });

  it("throws when database returns error", async () => {
    const chain = buildOrderChain({ data: null, error: new Error("DB error") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(getContentBriefs("client-1")).rejects.toThrow("DB error");
  });
});

describe("createContentBrief", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates brief and invalidates cache", async () => {
    const newBrief = { id: "b-new", title: "New Brief", client_id: "c-1" };
    const chain = buildChain({ data: newBrief, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await createContentBrief({ title: "New Brief", client_id: "c-1" } as any);
    expect(result).toEqual(newBrief);
    expect(invalidateCache).toHaveBeenCalledWith(
      "cc:briefs:all",
      "cc:pipeline-stats:*",
      "cc:content-queue:all"
    );
  });

  it("throws when database returns error", async () => {
    const chain = buildChain({ data: null, error: new Error("Insert failed") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(createContentBrief({ title: "Fail" } as any)).rejects.toThrow("Insert failed");
  });
});

describe("updateContentBrief", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates brief and invalidates cache", async () => {
    const updated = { id: "b-1", title: "Updated" };
    const chain = buildChain({ data: updated, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await updateContentBrief("b-1", { title: "Updated" } as any);
    expect(result).toEqual(updated);
    expect(invalidateCache).toHaveBeenCalledWith(
      "cc:briefs:all",
      "cc:pipeline-stats:*",
      "cc:content-queue:all"
    );
  });
});

describe("deleteContentBrief", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes brief and invalidates cache", async () => {
    const chain = buildDeleteChain({ error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await deleteContentBrief("b-1");
    expect(invalidateCache).toHaveBeenCalledWith(
      "cc:briefs:all",
      "cc:pipeline-stats:*",
      "cc:content-queue:all"
    );
  });
});

describe("getGeneratedContentByBrief", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns content for a brief", async () => {
    const content = [{ id: "c-1", brief_id: "b-1" }];
    const chain = buildOrderChain({ data: content, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getGeneratedContentByBrief("b-1");
    expect(result).toEqual(content);
  });

  it("throws when database returns error", async () => {
    const chain = buildOrderChain({ data: null, error: new Error("Query failed") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(getGeneratedContentByBrief("b-1")).rejects.toThrow("Query failed");
  });
});

describe("getGeneratedContentByClient", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns content for a client", async () => {
    const content = [{ id: "c-1", client_id: "client-1" }];
    const chain = buildOrderChain({ data: content, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getGeneratedContentByClient("client-1");
    expect(result).toEqual(content);
  });
});

describe("updateGeneratedContent", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates content and invalidates cache", async () => {
    const updated = { id: "c-1", status: "published" };
    const chain = buildChain({ data: updated, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await updateGeneratedContent("c-1", { status: "published" } as any);
    expect(result).toEqual(updated);
    expect(invalidateCache).toHaveBeenCalledWith("cc:content-queue:all", "cc:pipeline-stats:*");
  });
});

describe("getAiUsageByClient", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns AI usage records for a client", async () => {
    const usage = [{ id: "u-1", client_id: "client-1", cost: 0.5 }];
    const chain = buildChain({ data: usage, error: null });
    // For this query, limit() is the terminal call
    chain.limit.mockResolvedValue({ data: usage, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getAiUsageByClient("client-1");
    expect(result).toEqual(usage);
  });

  it("throws when database returns error", async () => {
    const chain = buildChain({ data: null, error: new Error("Usage query failed") });
    chain.limit.mockResolvedValue({ data: null, error: new Error("Usage query failed") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(getAiUsageByClient("client-1")).rejects.toThrow("Usage query failed");
  });
});

describe("getApiRequestLogs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns logs with pagination", async () => {
    const logs = [{ id: "log-1", provider: "dataforseo" }];
    const chain = buildChain({ data: logs, error: null, count: 1 });
    chain.range.mockResolvedValue({ data: logs, error: null, count: 1 });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    // page=2 to bypass the withCache path (provider filter bypasses cache)
    const result = await getApiRequestLogs(undefined, { page: 2 });
    expect(result.data).toEqual(logs);
  });

  it("uses cache for default unfiltered first-page request", async () => {
    const logs = [{ id: "log-1" }];
    const chain = buildChain({ data: logs, error: null, count: 1 });
    chain.range.mockResolvedValue({ data: logs, error: null, count: 1 });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getApiRequestLogs();
    expect(result).toBeDefined();
  });
});

describe("getGoogleOAuthStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns list of client_ids with OAuth tokens", async () => {
    const tokens = [{ client_id: "client-1" }, { client_id: "client-2" }];
    const chain = buildChain({ data: tokens, error: null });
    chain.select.mockResolvedValue({ data: tokens, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getGoogleOAuthStatus();
    expect(result).toEqual(["client-1", "client-2"]);
  });

  it("throws when database returns error", async () => {
    const chain = buildChain({ data: null, error: new Error("OAuth query failed") });
    chain.select.mockResolvedValue({ data: null, error: new Error("OAuth query failed") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(getGoogleOAuthStatus()).rejects.toThrow("OAuth query failed");
  });
});

describe("getCompetitiveAnalysis", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns competitive analysis for a client", async () => {
    const analysis = [{ id: "ca-1", client_id: "client-1" }];
    const chain = buildOrderChain({ data: analysis, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getCompetitiveAnalysis("client-1");
    expect(result).toEqual(analysis);
  });
});

describe("getAiCitations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns AI citations for a client", async () => {
    const citations = [{ id: "cit-1", client_id: "client-1" }];
    const chain = buildOrderChain({ data: citations, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const result = await getAiCitations("client-1");
    expect(result).toEqual(citations);
  });

  it("throws when database returns error", async () => {
    const chain = buildOrderChain({ data: null, error: new Error("Citations query failed") });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue(chain),
    });

    await expect(getAiCitations("client-1")).rejects.toThrow("Citations query failed");
  });
});
