import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWithClaude } from "./claude-client";
import { generateWithOpenAI } from "./openai-client";
import { analyzeContentQuality } from "./quality-analyzer";
import { buildBriefGenerationPrompt, buildContentGenerationPrompt, SYSTEM_PROMPTS } from "./prompts";
import { frase } from "@/lib/integrations/frase";
import { spyFu } from "@/lib/integrations/spyfu";
import {
  getContentPageKeywords,
  getCannibalizationGroups,
  getKeywordGaps,
} from "@/lib/supabase/queries";
import { logger } from "@/lib/logger";
import type {
  ContentBrief,
  GeneratedContent,
  ContentQualityAnalysis,
  ContentPage,
  ContentPageKeyword,
  CannibalizationGroup,
  KeywordGapOpportunity,
} from "@/types/database";
import type { SpyFuPpcKeyword } from "@/lib/integrations/spyfu";

interface GenerateBriefOptions {
  clientId: string;
  targetKeyword: string;
  contentType?: string;
  briefType?: "optimization" | "refresh" | "consolidation" | "new" | "thin" | "opportunity" | "decaying" | "authority";
  pagePath?: string;
}

interface GenerateContentOptions {
  briefId: string;
  model?: "claude" | "openai";
  clientId?: string;
  feedback?: string;
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

/**
 * Merge keyword arrays, deduplicating by lowercase. Frase keywords take priority.
 */
function mergeKeywords(fraseKeywords: string[] | null, aiKeywords: string[] | null): string[] | null {
  const frase = fraseKeywords || [];
  const ai = aiKeywords || [];
  if (!frase.length && !ai.length) return null;

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const kw of [...frase, ...ai]) {
    const lower = kw.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      merged.push(kw);
    }
  }
  return merged;
}

/**
 * Summarize an existing content page for prompt context.
 */
function summarizeExistingPage(page: ContentPage): Record<string, unknown> {
  return {
    page_path: page.page_path,
    clicks: page.clicks,
    impressions: page.impressions,
    ctr: page.ctr,
    position: Number(page.position).toFixed(1),
    prev_clicks: page.prev_clicks,
    prev_impressions: page.prev_impressions,
    prev_position: Number(page.prev_position).toFixed(1),
    status: page.status,
  };
}

/**
 * Summarize page keywords (top 20) for prompt context.
 */
function summarizePageKeywords(keywords: ContentPageKeyword[]): Record<string, unknown>[] {
  return keywords.slice(0, 20).map((kw) => ({
    keyword: kw.keyword,
    position: Number(kw.position).toFixed(1),
    clicks: kw.clicks,
    impressions: kw.impressions,
  }));
}

/**
 * Summarize cannibalization groups relevant to the target keyword.
 */
function summarizeCannibalization(
  groups: CannibalizationGroup[],
  targetKeyword: string
): Record<string, unknown>[] {
  const lower = targetKeyword.toLowerCase();
  const relevant = groups.filter(
    (g) => g.keyword.toLowerCase().includes(lower) || lower.includes(g.keyword.toLowerCase())
  );
  return relevant.slice(0, 5).map((g) => ({
    keyword: g.keyword,
    competing_pages: g.pages.map((p) => ({
      page_path: p.page_path,
      position: p.position,
      clicks: p.clicks,
    })),
  }));
}

/**
 * Summarize keyword gaps relevant to the target keyword.
 */
function summarizeKeywordGaps(
  gaps: KeywordGapOpportunity[],
  targetKeyword: string
): Record<string, unknown>[] {
  const lower = targetKeyword.toLowerCase();
  // Prefer gaps related to the keyword, fall back to highest volume
  const related = gaps.filter((g) =>
    g.keyword.toLowerCase().includes(lower) || lower.includes(g.keyword.toLowerCase())
  );
  const selected = related.length >= 5 ? related : gaps;
  return selected
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 15)
    .map((g) => ({
      keyword: g.keyword,
      search_volume: g.search_volume,
      difficulty: g.difficulty,
      competitor_domain: g.competitor_domain,
      competitor_position: g.competitor_position,
    }));
}

/**
 * Summarize PPC keywords relevant to the target keyword.
 */
function summarizePpcData(
  keywords: SpyFuPpcKeyword[],
  targetKeyword: string
): Record<string, unknown>[] {
  const lower = targetKeyword.toLowerCase();
  const related = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(lower) || lower.includes(k.keyword.toLowerCase())
  );
  const selected = related.length >= 3 ? related : keywords;
  return selected
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 10)
    .map((k) => ({
      keyword: k.keyword,
      search_volume: k.searchVolume,
      ad_position: k.adPosition,
      difficulty: k.keywordDifficulty,
      advertisers: k.adCount,
    }));
}

/**
 * Summarize Frase SERP analysis to keep prompt size manageable.
 * Extracts top-ranking page titles, word counts, headings, and key topics.
 */
function summarizeSerpAnalysis(data: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  // Frase SERP responses typically include results array with page analysis
  if (Array.isArray(data.results)) {
    summary.top_results = (data.results as Record<string, unknown>[]).slice(0, 10).map((r) => ({
      title: r.title,
      url: r.url,
      word_count: r.word_count || r.wordCount,
      headings: Array.isArray(r.headings) ? (r.headings as string[]).slice(0, 10) : undefined,
      topics: Array.isArray(r.topics) ? (r.topics as string[]).slice(0, 10) : undefined,
    }));
  }

  // Extract average metrics if available
  for (const key of ["avg_word_count", "avgWordCount", "topic_score", "topicScore", "questions"]) {
    if (key in data) summary[key] = data[key];
  }

  // If Frase returns questions people ask
  if (Array.isArray(data.questions)) {
    summary.questions = (data.questions as string[]).slice(0, 10);
  }

  // Fallback: if structure is unexpected, take safe truncated snapshot
  if (Object.keys(summary).length === 0) {
    const str = JSON.stringify(data);
    return { raw_summary: str.length > 3000 ? str.substring(0, 3000) + "...(truncated)" : str };
  }

  return summary;
}

/**
 * Extract semantic keyword strings from Frase response.
 */
function extractSemanticKeywords(data: Record<string, unknown>): string[] | null {
  // Frase semantic endpoint returns keywords in various formats
  if (Array.isArray(data.keywords)) {
    return (data.keywords as Array<string | Record<string, unknown>>)
      .slice(0, 50)
      .map((k) => (typeof k === "string" ? k : (k.keyword as string) || (k.term as string) || ""))
      .filter(Boolean);
  }
  if (Array.isArray(data.results)) {
    return (data.results as Array<string | Record<string, unknown>>)
      .slice(0, 50)
      .map((k) => (typeof k === "string" ? k : (k.keyword as string) || (k.term as string) || ""))
      .filter(Boolean);
  }
  if (Array.isArray(data.terms)) {
    return (data.terms as Array<string | Record<string, unknown>>)
      .slice(0, 50)
      .map((k) => (typeof k === "string" ? k : (k.term as string) || ""))
      .filter(Boolean);
  }
  return null;
}

export async function generateBrief(options: GenerateBriefOptions): Promise<ContentBrief> {
  const { clientId, targetKeyword, contentType = "blog_post", briefType, pagePath } = options;
  const supabase = await createClient();

  // Fetch client data
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();
  if (clientError || !client) throw new Error("Client not found");

  // Fetch competitive analysis — required for quality content
  const { data: competitiveData, error: compError } = await supabase
    .from("competitive_analysis")
    .select("*")
    .eq("client_id", clientId)
    .gt("expires_at", new Date().toISOString())
    .limit(5);

  if (compError) {
    throw new Error(`Failed to fetch competitive analysis: ${compError.message}`);
  }
  if (!competitiveData?.length) {
    throw new Error("No competitive analysis data available. Run a competitive analysis on the Competitive Intelligence page before generating content.");
  }

  // Fetch AI citations
  const { data: citationData } = await supabase
    .from("ai_citations")
    .select("*")
    .eq("client_id", clientId)
    .order("tracked_at", { ascending: false })
    .limit(10);

  // Fetch Frase SERP analysis and semantic keywords in parallel
  // All integrations are required — fail fast if any are unavailable
  const [serpResult, semanticResult] = await Promise.allSettled([
    frase.analyzeSerp(targetKeyword, clientId),
    frase.getSemanticKeywords(targetKeyword, clientId),
  ]);

  if (serpResult.status === "rejected") {
    throw new Error(`Frase SERP analysis failed: ${serpResult.reason?.message || serpResult.reason}. Fix the integration before generating content.`);
  }
  if (semanticResult.status === "rejected") {
    throw new Error(`Frase semantic keywords failed: ${semanticResult.reason?.message || semanticResult.reason}. Fix the integration before generating content.`);
  }

  const serpAnalysis = serpResult.value
    ? summarizeSerpAnalysis(serpResult.value as Record<string, unknown>)
    : null;
  const fraseSemanticKeywords = semanticResult.value
    ? extractSemanticKeywords(semanticResult.value as Record<string, unknown>)
    : null;

  // Fetch enrichment data — all optional, failures never block generation
  let existingPageData: Record<string, unknown> | null = null;
  let pageKeywordsData: Record<string, unknown>[] | null = null;
  let cannibalizationData: Record<string, unknown>[] | null = null;
  let keywordGapData: Record<string, unknown>[] | null = null;
  let ppcData: Record<string, unknown>[] | null = null;

  const enrichmentPromises: Promise<unknown>[] = [
    // Existing page data (only if pagePath provided)
    pagePath
      ? Promise.resolve(
          supabase
            .from("content_pages")
            .select("*")
            .eq("client_id", clientId)
            .eq("page_path", pagePath)
            .limit(1)
            .single()
        ).then(({ data }) => data)
      : Promise.resolve(null),
    // Page keywords (only if pagePath provided)
    pagePath
      ? getContentPageKeywords(clientId, pagePath)
      : Promise.resolve(null),
    // Cannibalization groups
    getCannibalizationGroups(clientId),
    // Keyword gaps
    getKeywordGaps(clientId),
    // SpyFu PPC keywords
    client.domain
      ? spyFu.getPpcKeywords(client.domain, clientId, 50).then((r) => r?.results ?? [])
      : Promise.resolve([]),
  ];

  const enrichmentResults = await Promise.allSettled(enrichmentPromises);

  if (enrichmentResults[0].status === "fulfilled" && enrichmentResults[0].value) {
    existingPageData = summarizeExistingPage(enrichmentResults[0].value as ContentPage);
  } else if (enrichmentResults[0].status === "rejected") {
    logger.warn("Enrichment: existing page fetch failed", { error: enrichmentResults[0].reason });
  }

  if (enrichmentResults[1].status === "fulfilled" && enrichmentResults[1].value) {
    const kws = enrichmentResults[1].value as ContentPageKeyword[];
    if (kws.length > 0) pageKeywordsData = summarizePageKeywords(kws);
  } else if (enrichmentResults[1].status === "rejected") {
    logger.warn("Enrichment: page keywords fetch failed", { error: enrichmentResults[1].reason });
  }

  if (enrichmentResults[2].status === "fulfilled" && enrichmentResults[2].value) {
    const groups = enrichmentResults[2].value as CannibalizationGroup[];
    const summarized = summarizeCannibalization(groups, targetKeyword);
    if (summarized.length > 0) cannibalizationData = summarized;
  } else if (enrichmentResults[2].status === "rejected") {
    logger.warn("Enrichment: cannibalization fetch failed", { error: enrichmentResults[2].reason });
  }

  if (enrichmentResults[3].status === "fulfilled" && enrichmentResults[3].value) {
    const gaps = enrichmentResults[3].value as KeywordGapOpportunity[];
    const summarized = summarizeKeywordGaps(gaps, targetKeyword);
    if (summarized.length > 0) keywordGapData = summarized;
  } else if (enrichmentResults[3].status === "rejected") {
    logger.warn("Enrichment: keyword gaps fetch failed", { error: enrichmentResults[3].reason });
  }

  if (enrichmentResults[4].status === "fulfilled" && enrichmentResults[4].value) {
    const ppc = enrichmentResults[4].value as SpyFuPpcKeyword[];
    const summarized = summarizePpcData(ppc, targetKeyword);
    if (summarized.length > 0) ppcData = summarized;
  } else if (enrichmentResults[4].status === "rejected") {
    logger.warn("Enrichment: PPC keywords fetch failed", { error: enrichmentResults[4].reason });
  }

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
    serpAnalysis,
    semanticKeywords: fraseSemanticKeywords,
    briefType,
    existingPage: existingPageData,
    pageKeywords: pageKeywordsData,
    cannibalizationData,
    keywordGapData,
    ppcData,
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
      serp_content_analysis: serpAnalysis
        ? JSON.stringify(serpAnalysis)
        : (briefData.serp_content_analysis as string || null),
      authority_signals: briefData.authority_signals as string || null,
      controversial_positions: briefData.controversial_positions as string || null,
      target_word_count: (briefData.target_word_count as number) || 1500,
      required_sections: briefData.required_sections as string[] || null,
      semantic_keywords: mergeKeywords(
        fraseSemanticKeywords,
        briefData.semantic_keywords as string[] | null,
      ),
      priority_level: briefData.priority_level as string || "medium",
      competitive_gap_analysis: {
        ...(briefData.competitive_gap_analysis as Record<string, unknown> || {}),
        ...(existingPageData ? { existing_page: existingPageData } : {}),
        ...(pageKeywordsData ? { page_keywords: pageKeywordsData } : {}),
        ...(cannibalizationData ? { cannibalization: cannibalizationData } : {}),
        ...(keywordGapData ? { keyword_gaps: keywordGapData } : {}),
        ...(ppcData ? { ppc_keywords: ppcData } : {}),
      },
      ai_citation_opportunity_data: briefData.ai_citation_opportunity_data || null,
      client_voice_profile: client.brand_voice || null,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return brief as ContentBrief;
}

export async function generateContent(options: GenerateContentOptions): Promise<GeneratedContent> {
  const { briefId, model = "claude", clientId, feedback } = options;
  const supabase = await createClient();

  // Fetch brief
  const { data: brief, error: briefError } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("id", briefId)
    .single();
  if (briefError || !brief) throw new Error("Brief not found");

  const allowedStatuses = ["approved", "generated", "revision_requested"];
  if (!allowedStatuses.includes(brief.status)) {
    throw new Error("Brief must be approved, generated, or revision_requested before generating content");
  }

  // Use provided clientId to avoid duplicate fetch, fall back to brief's client_id
  const resolvedClientId = clientId ?? brief.client_id;

  // Update brief status to generating
  const admin = createAdminClient();
  await admin
    .from("content_briefs")
    .update({ status: "generating" })
    .eq("id", briefId);

  // Enrich with fresh Frase SERP data for content generation
  // All integrations are required — fail fast if unavailable
  let serpContentAnalysis = brief.serp_content_analysis;
  let semanticKeywords = brief.semantic_keywords;

  const [serpResult, semanticResult] = await Promise.allSettled([
    frase.analyzeSerp(brief.target_keyword, resolvedClientId),
    !semanticKeywords?.length
      ? frase.getSemanticKeywords(brief.target_keyword, resolvedClientId)
      : Promise.resolve(null),
  ]);

  if (serpResult.status === "rejected") {
    // Reset brief status since generation failed before starting
    await admin.from("content_briefs").update({ status: brief.status }).eq("id", briefId);
    throw new Error(`Frase SERP analysis failed: ${serpResult.reason?.message || serpResult.reason}. Fix the integration before generating content.`);
  }
  if (semanticResult.status === "rejected") {
    await admin.from("content_briefs").update({ status: brief.status }).eq("id", briefId);
    throw new Error(`Frase semantic keywords failed: ${semanticResult.reason?.message || semanticResult.reason}. Fix the integration before generating content.`);
  }

  if (serpResult.value) {
    const serpData = summarizeSerpAnalysis(serpResult.value as Record<string, unknown>);
    serpContentAnalysis = JSON.stringify(serpData);
  }

  if (semanticResult.value) {
    const fraseKeywords = extractSemanticKeywords(semanticResult.value as Record<string, unknown>);
    if (fraseKeywords?.length) {
      const existing = new Set((semanticKeywords || []).map((k: string) => k.toLowerCase()));
      const merged = [...(semanticKeywords || [])];
      for (const kw of fraseKeywords) {
        if (!existing.has(kw.toLowerCase())) merged.push(kw);
      }
      semanticKeywords = merged;
    }
  }

  const prompt = buildContentGenerationPrompt({
    briefTitle: brief.title,
    targetKeyword: brief.target_keyword,
    contentType: brief.content_type || "blog_post",
    targetWordCount: brief.target_word_count || 1500,
    targetAudience: brief.target_audience,
    uniqueAngle: brief.unique_angle,
    competitiveGap: brief.competitive_gap,
    requiredSections: brief.required_sections,
    semanticKeywords,
    internalLinks: brief.internal_links,
    authoritySignals: brief.authority_signals,
    controversialPositions: brief.controversial_positions,
    brandVoice: brief.client_voice_profile,
    serpContentAnalysis,
    feedback,
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
