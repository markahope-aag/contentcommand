import Anthropic from "@anthropic-ai/sdk";
import { getRateLimiter } from "@/lib/integrations/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { RateLimitError } from "@/lib/integrations/base";
import type { AiUsageTrackingInsert } from "@/types/database";

const MODEL = "claude-sonnet-4-20250514";
const COST_PER_M_INPUT = 3;
const COST_PER_M_OUTPUT = 15;

interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  clientId?: string;
  operation: string;
  briefId?: string;
  contentId?: string;
}

interface GenerateResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

export async function generateWithClaude(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, systemPrompt, maxTokens = 4096, clientId, operation, briefId, contentId } = options;

  const limiter = getRateLimiter("claude");
  const { success, reset } = await limiter.limit("claude");
  if (!success) {
    throw new RateLimitError("claude", reset);
  }

  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const content = textBlock ? textBlock.text : "";
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  // Fire-and-forget usage logging
  logUsage({
    client_id: clientId || null,
    provider: "anthropic",
    model: MODEL,
    operation,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: (inputTokens / 1_000_000) * COST_PER_M_INPUT + (outputTokens / 1_000_000) * COST_PER_M_OUTPUT,
    brief_id: briefId || null,
    content_id: contentId || null,
  });

  return { content, inputTokens, outputTokens, model: MODEL };
}

function logUsage(usage: AiUsageTrackingInsert) {
  try {
    const admin = createAdminClient();
    admin.from("ai_usage_tracking").insert(usage).then();
  } catch {
    // Fire-and-forget
  }
}
