// @ts-nocheck
/**
 * Additional tests to cover uncovered branches in lib/validations.ts
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ data, options })),
  },
}));

import {
  fraseSchema,
  fraseUrlSchema,
  llmrefsSchema,
  llmrefsKeywordDetailSchema,
  briefUpdateSchema,
  syncSchema,
  briefGenerateSchema,
  contentScoreSchema,
  contentReviewSchema,
  createOrgSchema,
  addOrgMemberSchema,
  dataforseoSchema,
} from "@/lib/validations";

describe("fraseUrlSchema", () => {
  const validClientId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates a valid URL for type=url", () => {
    const result = fraseUrlSchema.safeParse({
      clientId: validClientId,
      type: "url",
      url: "https://example.com/blog",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://example.com/blog");
    }
  });

  it("rejects an invalid URL", () => {
    const result = fraseUrlSchema.safeParse({
      clientId: validClientId,
      type: "url",
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from URL", () => {
    const result = fraseUrlSchema.safeParse({
      clientId: validClientId,
      type: "url",
      url: "  https://example.com/article  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://example.com/article");
    }
  });
});

describe("fraseSchema discriminated union", () => {
  const validClientId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates serp type", () => {
    const result = fraseSchema.safeParse({
      clientId: validClientId,
      type: "serp",
      query: "content marketing tips",
    });
    expect(result.success).toBe(true);
  });

  it("validates semantic type", () => {
    const result = fraseSchema.safeParse({
      clientId: validClientId,
      type: "semantic",
      keyword: "SEO optimization",
    });
    expect(result.success).toBe(true);
  });
});

describe("llmrefsKeywordDetailSchema", () => {
  it("validates without searchEngines", () => {
    const result = llmrefsKeywordDetailSchema.safeParse({
      type: "keyword_detail",
      organizationId: "org-1",
      projectId: "proj-1",
      keywordId: "kw-1",
    });
    expect(result.success).toBe(true);
  });

  it("validates with searchEngines array", () => {
    const result = llmrefsKeywordDetailSchema.safeParse({
      type: "keyword_detail",
      organizationId: "org-1",
      projectId: "proj-1",
      keywordId: "kw-1",
      searchEngines: ["chatgpt", "perplexity", "  gemini  "],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Should trim whitespace from search engines
      expect(result.data.searchEngines).toContain("gemini");
    }
  });

  it("rejects when organizationId is missing", () => {
    const result = llmrefsKeywordDetailSchema.safeParse({
      type: "keyword_detail",
      projectId: "proj-1",
      keywordId: "kw-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("llmrefsSchema discriminated union", () => {
  it("validates organizations type", () => {
    const result = llmrefsSchema.safeParse({ type: "organizations" });
    expect(result.success).toBe(true);
  });

  it("validates projects type", () => {
    const result = llmrefsSchema.safeParse({
      type: "projects",
      organizationId: "org-1",
    });
    expect(result.success).toBe(true);
  });

  it("validates search_engines type", () => {
    const result = llmrefsSchema.safeParse({ type: "search_engines" });
    expect(result.success).toBe(true);
  });

  it("validates locations type", () => {
    const result = llmrefsSchema.safeParse({ type: "locations" });
    expect(result.success).toBe(true);
  });

  it("validates keywords type with org and project", () => {
    const result = llmrefsSchema.safeParse({
      type: "keywords",
      organizationId: "org-1",
      projectId: "proj-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("briefUpdateSchema", () => {
  it("validates with internal_links array", () => {
    const result = briefUpdateSchema.safeParse({
      internal_links: ["/blog/seo-guide", "  /blog/content-strategy  "],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Links should be trimmed
      expect(result.data.internal_links).toContain("/blog/seo-guide");
      expect(result.data.internal_links).toContain("/blog/content-strategy");
    }
  });

  it("validates with priority_level", () => {
    const result = briefUpdateSchema.safeParse({ priority_level: "high" });
    expect(result.success).toBe(true);
  });

  it("validates with all optional fields", () => {
    const result = briefUpdateSchema.safeParse({
      title: "New Title",
      target_keyword: "seo tools",
      target_audience: "Marketing managers",
      content_type: "blog_post",
      target_word_count: 2000,
      priority_level: "medium",
      unique_angle: "Unique perspective",
      competitive_gap: "Gap analysis here",
      authority_signals: "E-E-A-T signals",
      controversial_positions: "Bold takes",
    });
    expect(result.success).toBe(true);
  });

  it("validates with client_voice_profile as record", () => {
    const result = briefUpdateSchema.safeParse({
      client_voice_profile: { tone: "professional", style: "concise" },
    });
    expect(result.success).toBe(true);
  });

  it("validates with content_requirements as record", () => {
    const result = briefUpdateSchema.safeParse({
      content_requirements: { min_word_count: 1500, include_images: true },
    });
    expect(result.success).toBe(true);
  });

  it("validates with null internal_links", () => {
    const result = briefUpdateSchema.safeParse({ internal_links: null });
    expect(result.success).toBe(true);
  });
});

describe("dataforseoSchema", () => {
  const validClientId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates keywords type", () => {
    const result = dataforseoSchema.safeParse({
      clientId: validClientId,
      domain: "example.com",
      type: "keywords",
      competitorDomain: "competitor.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates domain_metrics type", () => {
    const result = dataforseoSchema.safeParse({
      clientId: validClientId,
      domain: "example.com",
      type: "domain_metrics",
    });
    expect(result.success).toBe(true);
  });

  it("validates serp type with keyword", () => {
    const result = dataforseoSchema.safeParse({
      clientId: validClientId,
      domain: "example.com",
      type: "serp",
      keyword: "content marketing",
    });
    expect(result.success).toBe(true);
  });
});

describe("syncSchema", () => {
  const validClientId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates dataforseo sync", () => {
    const result = syncSchema.safeParse({
      clientId: validClientId,
      provider: "dataforseo",
    });
    expect(result.success).toBe(true);
  });

  it("validates frase sync", () => {
    const result = syncSchema.safeParse({
      clientId: validClientId,
      provider: "frase",
    });
    expect(result.success).toBe(true);
  });

  it("validates llmrefs sync with org and project", () => {
    const result = syncSchema.safeParse({
      clientId: validClientId,
      provider: "llmrefs",
      organizationId: "org-1",
      projectId: "proj-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects llmrefs sync without organizationId", () => {
    const result = syncSchema.safeParse({
      clientId: validClientId,
      provider: "llmrefs",
      projectId: "proj-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("contentScoreSchema", () => {
  it("validates a valid UUID contentId", () => {
    const result = contentScoreSchema.safeParse({
      contentId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid contentId", () => {
    const result = contentScoreSchema.safeParse({ contentId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("contentReviewSchema", () => {
  it("validates approve action", () => {
    const result = contentReviewSchema.safeParse({ action: "approve" });
    expect(result.success).toBe(true);
  });

  it("validates revision action", () => {
    const result = contentReviewSchema.safeParse({
      action: "revision",
      revisionRequests: ["Fix introduction"],
      reviewTimeMinutes: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = contentReviewSchema.safeParse({ action: "reject" });
    expect(result.success).toBe(false);
  });
});

describe("addOrgMemberSchema", () => {
  it("validates with valid userId and role", () => {
    const result = addOrgMemberSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to member when not provided", () => {
    const result = addOrgMemberSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("member");
    }
  });

  it("rejects invalid userId", () => {
    const result = addOrgMemberSchema.safeParse({
      userId: "not-a-uuid",
      role: "member",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = addOrgMemberSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });
});
