// @ts-nocheck
/**
 * Tests for lib/ai/quality-analyzer.ts
 */

jest.mock("@/lib/ai/claude-client", () => ({
  generateWithClaude: jest.fn(),
}));

jest.mock("@/lib/ai/prompts", () => ({
  buildQualityScoringPrompt: jest.fn(() => "quality scoring prompt"),
  SYSTEM_PROMPTS: {
    qualityScoring: "You are a quality analyzer",
  },
}));

jest.mock("@/lib/integrations/redis", () => ({
  getCached: jest.fn(),
  setCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

import { analyzeContentQuality } from "@/lib/ai/quality-analyzer";
import { generateWithClaude } from "@/lib/ai/claude-client";
import { getCached, setCache } from "@/lib/integrations/redis";
import { createAdminClient } from "@/lib/supabase/admin";

const baseInput = {
  contentId: "content-1",
  content: "This is a sample article about SEO strategies.",
  targetKeyword: "SEO strategies",
  contentType: "blog_post",
  targetWordCount: 1500,
  clientId: "client-1",
  title: "SEO Guide",
  metaDescription: "Learn SEO strategies",
};

const mockScores = {
  overall_score: 82,
  seo_score: 88,
  readability_score: 75,
  authority_score: 80,
  engagement_score: 78,
  aeo_score: 85,
  detailed_feedback: {
    strengths: ["Good keyword usage"],
    improvements: ["Add more examples"],
  },
};

describe("analyzeContentQuality", () => {
  let mockAdmin: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockSingle = jest.fn().mockResolvedValue({
      data: { id: "analysis-1", ...mockScores, content_id: "content-1" },
      error: null,
    });
    const mockSelect = jest.fn(() => ({ single: mockSingle }));
    const mockInsert = jest.fn(() => ({ select: mockSelect }));
    mockAdmin = {
      from: jest.fn(() => ({ insert: mockInsert })),
    };
    (createAdminClient as jest.Mock).mockReturnValue(mockAdmin);
  });

  it("returns cached analysis when cache hit occurs", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(mockScores);

    const result = await analyzeContentQuality(baseInput);
    expect(result).toBeDefined();
    expect(generateWithClaude).not.toHaveBeenCalled();
  });

  it("calls Claude when no cache hit", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify(mockScores),
      inputTokens: 500,
      outputTokens: 200,
      model: "claude-sonnet",
    });

    await analyzeContentQuality(baseInput);
    expect(generateWithClaude).toHaveBeenCalledTimes(1);
  });

  it("saves analysis to database after generation", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify(mockScores),
      inputTokens: 500,
      outputTokens: 200,
      model: "claude-sonnet",
    });

    await analyzeContentQuality(baseInput);
    expect(mockAdmin.from).toHaveBeenCalledWith("content_quality_analysis");
  });

  it("caches scores after generation", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify(mockScores),
      inputTokens: 500,
      outputTokens: 200,
      model: "claude-sonnet",
    });

    await analyzeContentQuality(baseInput);
    expect(setCache).toHaveBeenCalled();
  });

  it("handles JSON with markdown code fences", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    const contentWithFences = `\`\`\`json\n${JSON.stringify(mockScores)}\n\`\`\``;
    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: contentWithFences,
      inputTokens: 500,
      outputTokens: 200,
      model: "claude-sonnet",
    });

    // Should not throw - strips fences before parsing
    await expect(analyzeContentQuality(baseInput)).resolves.toBeDefined();
  });

  it("throws when database insert fails", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify(mockScores),
      inputTokens: 500,
      outputTokens: 200,
      model: "claude-sonnet",
    });

    const dbError = new Error("DB insert failed");
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
    const mockSelect = jest.fn(() => ({ single: mockSingle }));
    const mockInsert = jest.fn(() => ({ select: mockSelect }));
    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({ insert: mockInsert })),
    });

    await expect(analyzeContentQuality(baseInput)).rejects.toThrow("DB insert failed");
  });

  it("passes correct scoring parameters to Claude", async () => {
    (getCached as jest.Mock).mockResolvedValueOnce(null);
    (generateWithClaude as jest.Mock).mockResolvedValue({
      content: JSON.stringify(mockScores),
      inputTokens: 100,
      outputTokens: 100,
      model: "claude-sonnet",
    });

    await analyzeContentQuality({
      ...baseInput,
      contentId: "content-2",
      clientId: "client-2",
      operation: "quality_scoring",
    });

    const claudeCall = (generateWithClaude as jest.Mock).mock.calls[0][0];
    expect(claudeCall.operation).toBe("quality_scoring");
    expect(claudeCall.maxTokens).toBe(2048);
  });
});
