// @ts-nocheck
/**
 * Tests for POST /api/integrations/llmrefs/sync
 */

// ── Mocks ──────────────────────────────────────────────────

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

jest.mock("@/lib/integrations/llmrefs", () => ({
  getKeywords: jest.fn(),
  getKeywordDetail: jest.fn(),
}));

jest.mock("@/lib/validations", () => ({
  llmrefsSyncSchema: {},
  validateBody: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// ── Imports ────────────────────────────────────────────────

import { POST } from "@/app/api/integrations/llmrefs/sync/route";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKeywords, getKeywordDetail } from "@/lib/integrations/llmrefs";
import { validateBody } from "@/lib/validations";
import { invalidateCache } from "@/lib/cache";

// ── Constants ──────────────────────────────────────────────

const CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const ORG_ID = "org-abc";
const PROJECT_ID = "proj-xyz";
const MOCK_USER = { id: "user-1", email: "user@example.com" };

const VALID_BODY = { clientId: CLIENT_ID, organizationId: ORG_ID, projectId: PROJECT_ID };

function makeRequest(body: object) {
  return { json: jest.fn().mockResolvedValue(body) } as any;
}

function makeAuthedClient(hasAccess = true) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER }, error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: hasAccess, error: null }),
  };
}

function makeUnauthClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("No session") }),
    },
  };
}

function makeAdminClient(insertResult = { error: null }) {
  const insertChain = { insert: jest.fn().mockResolvedValue(insertResult) };
  return { from: jest.fn().mockReturnValue(insertChain) };
}

// ── Tests ──────────────────────────────────────────────────

describe("POST /api/integrations/llmrefs/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: validation passes and returns parsed data
    (validateBody as jest.Mock).mockReturnValue({
      success: true,
      data: VALID_BODY,
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeUnauthClient());

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 400 when validation fails", async () => {
    const badResponse = { body: { error: "Validation failed", details: ["clientId is required"] }, status: 400 };
    (validateBody as jest.Mock).mockReturnValue({ success: false, response: badResponse });
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));

    const res = await POST(makeRequest({}));

    expect(res).toBe(badResponse);
  });

  it("returns 403 when user does not have access to the client", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(false));

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
  });

  it("returns success with synced count of 0 when keyword list is empty", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (createAdminClient as jest.Mock).mockReturnValue(makeAdminClient());
    (getKeywords as jest.Mock).mockResolvedValue([]);

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.synced).toBe(0);
  });

  it("inserts one citation record per keyword result", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ insert: insertMock }),
    });

    (getKeywords as jest.Mock).mockResolvedValue([
      { id: "kw-1", keyword: "content marketing" },
    ]);
    (getKeywordDetail as jest.Mock).mockResolvedValue({
      results: [
        { search_engine: "ChatGPT", cited: true, share_of_voice: 0.3, citation_url: "https://acme.com/blog" },
        { search_engine: "Perplexity", cited: false, share_of_voice: 0.0 },
      ],
    });

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(2);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("calls getKeywordDetail with correct org/project/keyword ids", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (createAdminClient as jest.Mock).mockReturnValue(makeAdminClient());

    (getKeywords as jest.Mock).mockResolvedValue([
      { id: "kw-99", keyword: "seo tools" },
    ]);
    (getKeywordDetail as jest.Mock).mockResolvedValue({ results: [] });

    await POST(makeRequest(VALID_BODY));

    expect(getKeywordDetail).toHaveBeenCalledWith(ORG_ID, PROJECT_ID, "kw-99", CLIENT_ID);
  });

  it("uses keyword_id field when id is not present on keyword object", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (createAdminClient as jest.Mock).mockReturnValue(makeAdminClient());

    (getKeywords as jest.Mock).mockResolvedValue([
      { keyword_id: "kw-alt", name: "alternative marketing" },
    ]);
    (getKeywordDetail as jest.Mock).mockResolvedValue({ results: [] });

    await POST(makeRequest(VALID_BODY));

    expect(getKeywordDetail).toHaveBeenCalledWith(ORG_ID, PROJECT_ID, "kw-alt", CLIENT_ID);
  });

  it("handles non-array keyword list gracefully", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (createAdminClient as jest.Mock).mockReturnValue(makeAdminClient());
    // LLMrefs returns unexpected non-array value
    (getKeywords as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(0);
    expect(getKeywordDetail).not.toHaveBeenCalled();
  });

  it("handles non-array results inside keyword detail gracefully", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (createAdminClient as jest.Mock).mockReturnValue(makeAdminClient());

    (getKeywords as jest.Mock).mockResolvedValue([{ id: "kw-1", keyword: "test" }]);
    (getKeywordDetail as jest.Mock).mockResolvedValue({ results: null });

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(0);
  });

  it("invalidates the competitive summary cache after sync", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    (createAdminClient as jest.Mock).mockReturnValue(makeAdminClient());
    (getKeywords as jest.Mock).mockResolvedValue([]);

    await POST(makeRequest(VALID_BODY));

    expect(invalidateCache).toHaveBeenCalledWith(`cc:competitive-summary:${CLIENT_ID}`);
  });

  it("maps citation fields correctly when inserting ai_citations record", async () => {
    (createClient as jest.Mock).mockResolvedValue(makeAuthedClient(true));
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ insert: insertMock }),
    });

    (getKeywords as jest.Mock).mockResolvedValue([{ id: "kw-5", keyword: "brand awareness" }]);
    (getKeywordDetail as jest.Mock).mockResolvedValue({
      results: [
        {
          search_engine: "Gemini",
          cited: true,
          share_of_voice: 0.45,
          citation_url: "https://example.com/page",
          context: "Great brand example",
        },
      ],
    });

    await POST(makeRequest(VALID_BODY));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        platform: "Gemini",
        query: "brand awareness",
        cited: true,
        share_of_voice: 0.45,
        citation_url: "https://example.com/page",
        citation_context: "Great brand example",
      })
    );
  });

  it("returns 500 when an unexpected error occurs", async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error("Unexpected failure"));

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
