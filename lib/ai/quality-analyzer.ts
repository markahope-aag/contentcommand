import { generateWithClaude } from "./claude-client";
import { buildQualityScoringPrompt, SYSTEM_PROMPTS } from "./prompts";
import { getCached, setCache } from "@/lib/integrations/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentQualityAnalysis, ContentQualityAnalysisInsert } from "@/types/database";

const CACHE_TTL = 86400; // 24h

function hashContent(content: string): string {
  // Simple hash for cache key — stable for same content
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `quality:${Math.abs(hash).toString(36)}`;
}

interface AnalyzeInput {
  contentId: string;
  content: string;
  targetKeyword: string;
  contentType: string;
  targetWordCount: number;
  clientId: string;
  title?: string | null;
  metaDescription?: string | null;
}

interface QualityScores {
  overall_score: number;
  seo_score: number;
  readability_score: number;
  authority_score: number;
  engagement_score: number;
  aeo_score: number;
  detailed_feedback: Record<string, unknown>;
}

export async function analyzeContentQuality(input: AnalyzeInput): Promise<ContentQualityAnalysis> {
  const cacheKey = hashContent(input.content + input.targetKeyword);

  // Check cache first
  const cached = await getCached<QualityScores>(cacheKey);
  if (cached) {
    return saveAnalysis(input.contentId, cached);
  }

  const prompt = buildQualityScoringPrompt({
    content: input.content,
    targetKeyword: input.targetKeyword,
    contentType: input.contentType,
    targetWordCount: input.targetWordCount,
    title: input.title || null,
    metaDescription: input.metaDescription || null,
  });

  const result = await generateWithClaude({
    prompt,
    systemPrompt: SYSTEM_PROMPTS.qualityScoring,
    maxTokens: 2048,
    clientId: input.clientId,
    operation: "quality_scoring",
    contentId: input.contentId,
  });

  const scores = parseJsonResponse<QualityScores>(result.content);

  // Cache the scores
  setCache(cacheKey, scores, CACHE_TTL).catch(() => {});

  return saveAnalysis(input.contentId, scores);
}

async function saveAnalysis(contentId: string, scores: QualityScores): Promise<ContentQualityAnalysis> {
  const admin = createAdminClient();
  const insert: ContentQualityAnalysisInsert = {
    content_id: contentId,
    overall_score: scores.overall_score,
    seo_score: scores.seo_score,
    readability_score: scores.readability_score,
    authority_score: scores.authority_score,
    engagement_score: scores.engagement_score,
    aeo_score: scores.aeo_score,
    detailed_feedback: scores.detailed_feedback,
  };

  const { data, error } = await admin
    .from("content_quality_analysis")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as ContentQualityAnalysis;
}

function parseJsonResponse<T>(text: string): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}
