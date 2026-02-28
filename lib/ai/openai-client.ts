import OpenAI from "openai";
import { getRateLimiter } from "@/lib/integrations/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { RateLimitError } from "@/lib/integrations/base";
import type { AiUsageTrackingInsert } from "@/types/database";

const MODEL = "gpt-4o";
const COST_PER_M_INPUT = 10;
const COST_PER_M_OUTPUT = 30;

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

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

export async function generateWithOpenAI(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, systemPrompt, maxTokens = 4096, clientId, operation, briefId, contentId } = options;

  const limiter = getRateLimiter("openai");
  const { success, reset } = await limiter.limit("openai");
  if (!success) {
    throw new RateLimitError("openai", reset);
  }

  const client = getClient();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages,
  });

  const content = response.choices[0]?.message?.content || "";
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;

  // Fire-and-forget usage logging
  logUsage({
    client_id: clientId || null,
    provider: "openai",
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
