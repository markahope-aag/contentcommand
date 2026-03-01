import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWithClaude } from "./claude-client";
import { generateWithOpenAI } from "./openai-client";
import { analyzeContentQuality } from "./quality-analyzer";
import { buildBriefGenerationPrompt, buildContentGenerationPrompt, SYSTEM_PROMPTS } from "./prompts";
import type {
  ContentBrief,
  GeneratedContent,
  ContentQualityAnalysis,
} from "@/types/database";

interface GenerateBriefOptions {
  clientId: string;
  targetKeyword: string;
  contentType?: string;
}

interface GenerateContentOptions {
  briefId: string;
  model?: "claude" | "openai";
  clientId?: string;
}

function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}

/**
 * Summarize competitive analysis data to avoid blowing past token limits.
 * Raw DataForSEO responses can be 200K+ tokens — extract only what's useful for brief generation.
 */
function summarizeCompetitiveData(rawData: Record<string, unknown>[]): Record<string, unknown>[] {
  return rawData.map((data) => {
    if (!data || typeof data !== "object") return {};
    // Extract commonly useful fields from DataForSEO responses
    const summary: Record<string, unknown> = {};
    for (const key of [
      "domain", "competitor_domain", "organic_traffic", "keywords_count",
      "keyword_overlap", "competitive_strength", "top_keywords",
      "common_keywords", "missing_keywords", "domain_rank",
    ]) {
      if (key in data) summary[key] = data[key];
    }
    // If top_keywords/common_keywords/missing_keywords are arrays, limit to first 20
    for (const key of ["top_keywords", "common_keywords", "missing_keywords"]) {
      if (Array.isArray(summary[key]) && (summary[key] as unknown[]).length > 20) {
        summary[key] = (summary[key] as unknown[]).slice(0, 20);
      }
    }
    // Fallback: if we extracted nothing useful, return a truncated summary
    if (Object.keys(summary).length === 0) {
      const str = JSON.stringify(data);
      return { raw_summary: str.length > 2000 ? str.substring(0, 2000) + "...(truncated)" : str };
    }
    return summary;
  });
}

/**
 * Summarize citation data for prompt context.
 */
function summarizeCitationData(rawData: Record<string, unknown>[]): Record<string, unknown>[] {
  return rawData.map((data) => {
    if (!data || typeof data !== "object") return {};
    const summary: Record<string, unknown> = {};
    for (const key of [
      "platform", "query", "cited", "citation_url", "position",
      "share_of_voice", "competitors_cited", "total_citations",
    ]) {
      if (key in data) summary[key] = data[key];
    }
    if (Object.keys(summary).length === 0) {
      const str = JSON.stringify(data);
      return { raw_summary: str.length > 1000 ? str.substring(0, 1000) + "...(truncated)" : str };
    }
    return summary;
  });
}

export async function generateBrief(options: GenerateBriefOptions): Promise<ContentBrief> {
  const { clientId, targetKeyword, contentType = "blog_post" } = options;
  const supabase = await createClient();

  // Fetch client data
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();
  if (clientError || !client) throw new Error("Client not found");

  // Fetch competitive analysis
  const { data: competitiveData } = await supabase
    .from("competitive_analysis")
    .select("*")
    .eq("client_id", clientId)
    .gt("expires_at", new Date().toISOString())
    .limit(5);

  // Fetch AI citations
  const { data: citationData } = await supabase
    .from("ai_citations")
    .select("*")
    .eq("client_id", clientId)
    .order("tracked_at", { ascending: false })
    .limit(10);

  const prompt = buildBriefGenerationPrompt({
    clientName: client.name,
    clientDomain: client.domain,
    industry: client.industry,
    targetKeyword,
    brandVoice: client.brand_voice,
    targetKeywords: client.target_keywords,
    competitiveData: summarizeCompetitiveData((competitiveData || []).map((d) => d.data)),
    citationData: summarizeCitationData((citationData || []).map((d) => d.data || {})),
    contentType,
  });

  const result = await generateWithClaude({
    prompt,
    systemPrompt: SYSTEM_PROMPTS.briefGeneration,
    maxTokens: 2048,
    clientId,
    operation: "brief_generation",
  });
  const briefData = parseJsonResponse<Record<string, unknown>>(result.content);

  // Insert the brief
  const admin = createAdminClient();
  const { data: brief, error: insertError } = await admin
    .from("content_briefs")
    .insert({
      client_id: clientId,
      title: briefData.title as string || `Brief: ${targetKeyword}`,
      target_keyword: targetKeyword,
      content_type: contentType,
      status: "draft",
      unique_angle: briefData.unique_angle as string || null,
      competitive_gap: briefData.competitive_gap as string || null,
      ai_citation_opportunity: briefData.ai_citation_opportunity as string || null,
      target_audience: briefData.target_audience as string || null,
      serp_content_analysis: briefData.serp_content_analysis as string || null,
      authority_signals: briefData.authority_signals as string || null,
      controversial_positions: briefData.controversial_positions as string || null,
      target_word_count: (briefData.target_word_count as number) || 1500,
      required_sections: briefData.required_sections as string[] || null,
      semantic_keywords: briefData.semantic_keywords as string[] || null,
      priority_level: briefData.priority_level as string || "medium",
      competitive_gap_analysis: briefData.competitive_gap_analysis || null,
      ai_citation_opportunity_data: briefData.ai_citation_opportunity_data || null,
      client_voice_profile: client.brand_voice || null,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return brief as ContentBrief;
}

export async function generateContent(options: GenerateContentOptions): Promise<GeneratedContent> {
  const { briefId, model = "claude", clientId } = options;
  const supabase = await createClient();

  // Fetch brief
  const { data: brief, error: briefError } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("id", briefId)
    .single();
  if (briefError || !brief) throw new Error("Brief not found");

  if (brief.status !== "approved") {
    throw new Error("Brief must be approved before generating content");
  }

  // Use provided clientId to avoid duplicate fetch, fall back to brief's client_id
  const resolvedClientId = clientId ?? brief.client_id;

  // Update brief status to generating
  const admin = createAdminClient();
  await admin
    .from("content_briefs")
    .update({ status: "generating" })
    .eq("id", briefId);

  const prompt = buildContentGenerationPrompt({
    briefTitle: brief.title,
    targetKeyword: brief.target_keyword,
    contentType: brief.content_type || "blog_post",
    targetWordCount: brief.target_word_count || 1500,
    targetAudience: brief.target_audience,
    uniqueAngle: brief.unique_angle,
    competitiveGap: brief.competitive_gap,
    requiredSections: brief.required_sections,
    semanticKeywords: brief.semantic_keywords,
    internalLinks: brief.internal_links,
    authoritySignals: brief.authority_signals,
    controversialPositions: brief.controversial_positions,
    brandVoice: brief.client_voice_profile,
    serpContentAnalysis: brief.serp_content_analysis,
  });

  const startTime = Date.now();

  const generate = model === "openai" ? generateWithOpenAI : generateWithClaude;
  const result = await generate({
    prompt,
    systemPrompt: SYSTEM_PROMPTS.contentGeneration,
    maxTokens: 8192,
    clientId: resolvedClientId,
    operation: "content_generation",
    briefId,
  });

  const generationTime = (Date.now() - startTime) / 1000;
  const contentData = parseJsonResponse<Record<string, unknown>>(result.content);
  const articleContent = contentData.content as string || "";
  const wordCount = articleContent.split(/\s+/).length;

  // Insert generated content
  const { data: content, error: insertError } = await admin
    .from("generated_content")
    .insert({
      brief_id: briefId,
      client_id: resolvedClientId,
      content: articleContent,
      title: contentData.title as string || brief.title,
      meta_description: contentData.meta_description as string || null,
      excerpt: contentData.excerpt as string || null,
      word_count: wordCount,
      ai_model_used: result.model,
      generation_prompt: prompt.substring(0, 5000),
      generation_time_seconds: generationTime,
      status: "generated",
      ai_citations_ready: false,
      internal_links_added: contentData.internal_links_added as string[] || null,
      external_references: contentData.external_references as string[] || null,
      aeo_optimizations: contentData.aeo_optimizations as Record<string, unknown> || null,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Update brief status
  await admin
    .from("content_briefs")
    .update({ status: "generated" })
    .eq("id", briefId);

  return content as GeneratedContent;
}

export async function scoreContent(contentId: string): Promise<ContentQualityAnalysis> {
  const supabase = await createClient();

  const { data: content, error } = await supabase
    .from("generated_content")
    .select("*, content_briefs(*)")
    .eq("id", contentId)
    .single();

  if (error || !content) throw new Error("Content not found");

  const brief = content.content_briefs as ContentBrief;

  const analysis = await analyzeContentQuality({
    contentId,
    content: content.content || "",
    targetKeyword: brief?.target_keyword || "",
    contentType: brief?.content_type || "blog_post",
    targetWordCount: brief?.target_word_count || 1500,
    clientId: content.client_id,
    title: content.title,
    metaDescription: content.meta_description,
  });

  // Update generated_content with scores
  const admin = createAdminClient();
  await admin
    .from("generated_content")
    .update({
      quality_score: analysis.overall_score,
      readability_score: analysis.readability_score,
      authority_score: analysis.authority_score,
      optimization_score: analysis.seo_score,
    })
    .eq("id", contentId);

  return analysis;
}
