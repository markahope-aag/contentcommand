// @ts-nocheck
/**
 * Tests for lib/ai/claude-client.ts
 */

const mockMessagesCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
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
    ANTHROPIC_API_KEY: "test-anthropic-key",
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

import { generateWithClaude } from "@/lib/ai/claude-client";
import { getRateLimiter } from "@/lib/integrations/redis";

describe("generateWithClaude", () => {
  let mockLimiter: { limit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true, reset: 0 }) };
    (getRateLimiter as jest.Mock).mockReturnValue(mockLimiter);
  });

  it("returns generated content on success", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"result": "generated content"}' }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await generateWithClaude({
      prompt: "Write something",
      operation: "test_op",
    });

    expect(result.content).toBe('{"result": "generated content"}');
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(200);
    expect(result.model).toBe("claude-sonnet-4-20250514");
  });

  it("returns empty string when no text block in response", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "image", source: {} }],
      usage: { input_tokens: 10, output_tokens: 0 },
    });

    const result = await generateWithClaude({
      prompt: "test",
      operation: "test_op",
    });

    expect(result.content).toBe("");
  });

  it("throws RateLimitError when rate limit exceeded", async () => {
    mockLimiter.limit.mockResolvedValue({ success: false, reset: 60000 });

    await expect(
      generateWithClaude({ prompt: "test", operation: "test_op" })
    ).rejects.toThrow("Rate limit exceeded for claude");
  });

  it("passes systemPrompt to Anthropic API when provided", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
      usage: { input_tokens: 50, output_tokens: 50 },
    });

    await generateWithClaude({
      prompt: "test prompt",
      systemPrompt: "You are a test assistant",
      operation: "test_op",
    });

    const createCall = mockMessagesCreate.mock.calls[0][0];
    expect(createCall.system).toBe("You are a test assistant");
  });

  it("does not include system field when systemPrompt not provided", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
      usage: { input_tokens: 50, output_tokens: 50 },
    });

    await generateWithClaude({
      prompt: "test prompt",
      operation: "test_op",
    });

    const createCall = mockMessagesCreate.mock.calls[0][0];
    expect(createCall.system).toBeUndefined();
  });

  it("uses default maxTokens of 4096", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
      usage: { input_tokens: 50, output_tokens: 50 },
    });

    await generateWithClaude({ prompt: "test", operation: "test_op" });

    const createCall = mockMessagesCreate.mock.calls[0][0];
    expect(createCall.max_tokens).toBe(4096);
  });

  it("uses provided maxTokens", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
      usage: { input_tokens: 50, output_tokens: 50 },
    });

    await generateWithClaude({ prompt: "test", operation: "test_op", maxTokens: 2048 });

    const createCall = mockMessagesCreate.mock.calls[0][0];
    expect(createCall.max_tokens).toBe(2048);
  });

  it("throws when Anthropic API throws", async () => {
    mockMessagesCreate.mockRejectedValue(new Error("API error"));

    await expect(
      generateWithClaude({ prompt: "test", operation: "test_op" })
    ).rejects.toThrow("API error");
  });

  it("sends user message correctly", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
      usage: { input_tokens: 50, output_tokens: 50 },
    });

    await generateWithClaude({ prompt: "my prompt", operation: "test_op" });

    const createCall = mockMessagesCreate.mock.calls[0][0];
    expect(createCall.messages).toEqual([{ role: "user", content: "my prompt" }]);
  });
});
