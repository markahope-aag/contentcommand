// @ts-nocheck
/**
 * Tests for lib/ai/openai-client.ts
 */

const mockCreate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: { create: mockCreate },
    },
  })),
}));

jest.mock("@/lib/integrations/redis", () => ({
  getRateLimiter: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ then: jest.fn() })),
    })),
  })),
}));

jest.mock("@/lib/env", () => ({
  serverEnv: jest.fn(() => ({
    OPENAI_API_KEY: "test-openai-key",
  })),
}));

jest.mock("@/lib/integrations/base", () => {
  class RateLimitError extends Error {
    constructor(provider, retryAfter) {
      super(`Rate limit exceeded for ${provider}`);
      this.provider = provider;
      this.retryAfter = retryAfter;
      this.name = "RateLimitError";
    }
  }
  return { RateLimitError };
});

import { generateWithOpenAI } from "@/lib/ai/openai-client";
import { getRateLimiter } from "@/lib/integrations/redis";

describe("generateWithOpenAI", () => {
  let mockLimiter: { limit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true, reset: 0 }) };
    (getRateLimiter as jest.Mock).mockReturnValue(mockLimiter);
  });

  it("returns generated content on success", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"title": "Test article"}' } }],
      usage: { prompt_tokens: 150, completion_tokens: 300 },
    });

    const result = await generateWithOpenAI({
      prompt: "Write something",
      operation: "test_op",
    });

    expect(result.content).toBe('{"title": "Test article"}');
    expect(result.inputTokens).toBe(150);
    expect(result.outputTokens).toBe(300);
    expect(result.model).toBe("gpt-4o");
  });

  it("returns empty string when message content is null", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: { prompt_tokens: 10, completion_tokens: 0 },
    });

    const result = await generateWithOpenAI({
      prompt: "test",
      operation: "test_op",
    });

    expect(result.content).toBe("");
  });

  it("returns zero tokens when usage is undefined", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "response" } }],
      usage: undefined,
    });

    const result = await generateWithOpenAI({
      prompt: "test",
      operation: "test_op",
    });

    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
  });

  it("throws RateLimitError when rate limit exceeded", async () => {
    mockLimiter.limit.mockResolvedValue({ success: false, reset: 60000 });

    await expect(
      generateWithOpenAI({ prompt: "test", operation: "test_op" })
    ).rejects.toThrow("Rate limit exceeded for openai");
  });

  it("adds system message when systemPrompt provided", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 50, completion_tokens: 50 },
    });

    await generateWithOpenAI({
      prompt: "user message",
      systemPrompt: "System instructions",
      operation: "test_op",
    });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.messages[0]).toEqual({ role: "system", content: "System instructions" });
    expect(createCall.messages[1]).toEqual({ role: "user", content: "user message" });
  });

  it("only sends user message when no systemPrompt", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 50, completion_tokens: 50 },
    });

    await generateWithOpenAI({
      prompt: "user message",
      operation: "test_op",
    });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.messages).toHaveLength(1);
    expect(createCall.messages[0]).toEqual({ role: "user", content: "user message" });
  });

  it("uses default maxTokens of 4096", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 50, completion_tokens: 50 },
    });

    await generateWithOpenAI({ prompt: "test", operation: "test_op" });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.max_tokens).toBe(4096);
  });

  it("uses gpt-4o model", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 50, completion_tokens: 50 },
    });

    await generateWithOpenAI({ prompt: "test", operation: "test_op" });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.model).toBe("gpt-4o");
  });

  it("throws when OpenAI API throws", async () => {
    mockCreate.mockRejectedValue(new Error("OpenAI API error"));

    await expect(
      generateWithOpenAI({ prompt: "test", operation: "test_op" })
    ).rejects.toThrow("OpenAI API error");
  });
});
