// @ts-nocheck
/**
 * Tests for lib/ai/content-engine.ts
 * Mocks all external dependencies.
 */

const mockSupabaseFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({
  from: mockSupabaseFrom,
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockCreateClient())),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => mockCreateClient()),
}));

jest.mock("@/lib/ai/claude-client", () => ({
  generateWithClaude: jest.fn(),
}));

jest.mock("@/lib/ai/openai-client", () => ({
  generateWithOpenAI: jest.fn(),
}));

jest.mock("@/lib/ai/quality-analyzer", () => ({
  analyzeContentQuality: jest.fn(),
}));

jest.mock("@/lib/ai/prompts", () => ({
  buildBriefGenerationPrompt: jest.fn(() => "brief prompt"),
  buildContentGenerationPrompt: jest.fn(() => "content prompt"),
  SYSTEM_PROMPTS: {
    briefGeneration: "brief system prompt",
    contentGeneration: "content system prompt",
    qualityScoring: "quality system prompt",
  },
}));

import { generateBrief, generateContent, scoreContent } from "@/lib/ai/content-engine";
import { generateWithClaude } from "@/lib/ai/claude-client";
import { generateWithOpenAI } from "@/lib/ai/openai-client";
import { analyzeContentQuality } from "@/lib/ai/quality-analyzer";

// Helper to create a chainable Supabase query mock
function createQueryChain(result: unknown) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gt: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    then: jest.fn((cb) => Promise.resolve(result).then(cb)),
  };
  // Make the chain resolve directly when awaited
  chain[Symbol.asyncIterator] = async function* () {};
  return chain;
}

describe("generateBrief", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when client not found", async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryChain({ data: null, error: new Error("not found") })
    );

    await expect(
      generateBrief({ clientId: "client-1", targetKeyword: "seo tools" })
    ).rejects.toThrow("Client not found");
  });

  it("generates a brief using Claude and inserts it", async () => {
    const mockClient = {
      id: "client-1",
      name: "Acme Corp",
      domain: "acme.com",
      industry: "SaaS",
      brand_voice: null,
      target_keywords: null,
    };
    const mockBrief = { id: "brief-1", title: "SEO Tools Guide" };

    // Client query
    mockSupabaseFrom
      .mockReturnValueOnce(createQueryChain({ data: mockClient, error: null }))
      // competitive_analysis query
      .mockReturnValueOnce(createQueryChain({ data: [], error: null }))
      // ai_citations query
      .mockReturnValueOnce(createQueryChain({ data: [], error: null }))
      // content_briefs insert (admin)
      .mockReturnValueOnce(createQueryChain({ data: mockBrief, error: null }));

    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        title: "SEO Tools Guide",
        unique_angle: "Data-driven",
        priority_level: "high",
        target_word_count: 2000,
      }),
      inputTokens: 100,
      outputTokens: 200,
      model: "claude-sonnet",
    });

    const result = await generateBrief({
      clientId: "client-1",
      targetKeyword: "seo tools",
    });

    expect(result).toEqual(mockBrief);
    expect(generateWithClaude).toHaveBeenCalledTimes(1);
  });

  it("throws when insert fails", async () => {
    const mockClient = {
      id: "client-1",
      name: "Acme",
      domain: "acme.com",
      industry: null,
      brand_voice: null,
      target_keywords: null,
    };

    mockSupabaseFrom
      .mockReturnValueOnce(createQueryChain({ data: mockClient, error: null }))
      .mockReturnValueOnce(createQueryChain({ data: [], error: null }))
      .mockReturnValueOnce(createQueryChain({ data: [], error: null }))
      .mockReturnValueOnce(createQueryChain({ data: null, error: new Error("Insert failed") }));

    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify({ title: "Test" }),
      inputTokens: 50,
      outputTokens: 50,
      model: "claude-sonnet",
    });

    await expect(
      generateBrief({ clientId: "client-1", targetKeyword: "test" })
    ).rejects.toThrow("Insert failed");
  });
});

describe("generateContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when brief not found", async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryChain({ data: null, error: new Error("not found") })
    );

    await expect(
      generateContent({ briefId: "brief-1" })
    ).rejects.toThrow("Brief not found");
  });

  it("throws when brief is not approved", async () => {
    const mockBrief = { id: "brief-1", status: "draft", client_id: "client-1" };
    mockSupabaseFrom.mockReturnValue(
      createQueryChain({ data: mockBrief, error: null })
    );

    await expect(
      generateContent({ briefId: "brief-1" })
    ).rejects.toThrow("Brief must be approved before generating content");
  });

  it("uses Claude by default for content generation", async () => {
    const mockBrief = {
      id: "brief-1",
      status: "approved",
      client_id: "client-1",
      title: "SEO Guide",
      target_keyword: "seo",
      content_type: "blog_post",
      target_word_count: 1500,
      target_audience: null,
      unique_angle: null,
      competitive_gap: null,
      required_sections: null,
      semantic_keywords: null,
      internal_links: null,
      authority_signals: null,
      controversial_positions: null,
      client_voice_profile: null,
      serp_content_analysis: null,
    };
    const mockContent = { id: "content-1", content: "Article text" };

    mockSupabaseFrom
      .mockReturnValueOnce(createQueryChain({ data: mockBrief, error: null }))
      // update brief to "generating" (admin)
      .mockReturnValueOnce(createQueryChain({ data: null, error: null }))
      // insert generated_content (admin)
      .mockReturnValueOnce(createQueryChain({ data: mockContent, error: null }))
      // update brief to "generated" (admin)
      .mockReturnValueOnce(createQueryChain({ data: null, error: null }));

    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        title: "SEO Guide",
        content: "Full article content here",
        meta_description: "Learn SEO",
        excerpt: "A quick excerpt",
        internal_links_added: [],
        external_references: [],
        aeo_optimizations: {},
      }),
      inputTokens: 500,
      outputTokens: 1000,
      model: "claude-sonnet",
    });

    const result = await generateContent({ briefId: "brief-1" });
    expect(result).toEqual(mockContent);
    expect(generateWithClaude).toHaveBeenCalledTimes(1);
    expect(generateWithOpenAI).not.toHaveBeenCalled();
  });

  it("uses OpenAI when model=openai", async () => {
    const mockBrief = {
      id: "brief-1",
      status: "approved",
      client_id: "client-1",
      title: "Guide",
      target_keyword: "keyword",
      content_type: "blog_post",
      target_word_count: 1500,
      target_audience: null,
      unique_angle: null,
      competitive_gap: null,
      required_sections: null,
      semantic_keywords: null,
      internal_links: null,
      authority_signals: null,
      controversial_positions: null,
      client_voice_profile: null,
      serp_content_analysis: null,
    };
    const mockContent = { id: "content-2" };

    mockSupabaseFrom
      .mockReturnValueOnce(createQueryChain({ data: mockBrief, error: null }))
      .mockReturnValueOnce(createQueryChain({ data: null, error: null }))
      .mockReturnValueOnce(createQueryChain({ data: mockContent, error: null }))
      .mockReturnValueOnce(createQueryChain({ data: null, error: null }));

    (generateWithOpenAI as jest.Mock).mockResolvedValue({
      content: JSON.stringify({ title: "Guide", content: "Content" }),
      inputTokens: 500,
      outputTokens: 1000,
      model: "gpt-4o",
    });

    await generateContent({ briefId: "brief-1", model: "openai" });
    expect(generateWithOpenAI).toHaveBeenCalledTimes(1);
    expect(generateWithClaude).not.toHaveBeenCalled();
  });
});

describe("scoreContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when content not found", async () => {
    mockSupabaseFrom.mockReturnValue(
      createQueryChain({ data: null, error: new Error("not found") })
    );

    await expect(scoreContent("content-1")).rejects.toThrow("Content not found");
  });

  it("analyzes content quality and updates scores", async () => {
    const mockContent = {
      id: "content-1",
      content: "Article text",
      client_id: "client-1",
      title: "Guide",
      meta_description: "Learn more",
      content_briefs: {
        target_keyword: "seo",
        content_type: "blog_post",
        target_word_count: 1500,
      },
    };
    const mockAnalysis = {
      overall_score: 85,
      seo_score: 90,
      readability_score: 80,
      authority_score: 85,
    };

    mockSupabaseFrom
      .mockReturnValueOnce(createQueryChain({ data: mockContent, error: null }))
      // update generated_content (admin)
      .mockReturnValueOnce(createQueryChain({ data: null, error: null }));

    (analyzeContentQuality as jest.Mock).mockResolvedValue(mockAnalysis);

    const result = await scoreContent("content-1");
    expect(result).toEqual(mockAnalysis);
    expect(analyzeContentQuality).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: "content-1",
        content: "Article text",
        targetKeyword: "seo",
      })
    );
  });
});
