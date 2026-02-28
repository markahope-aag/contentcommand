interface BriefGenerationInput {
  clientName: string;
  clientDomain: string;
  industry: string | null;
  targetKeyword: string;
  brandVoice: Record<string, unknown> | null;
  targetKeywords: string[] | null;
  competitiveData: Record<string, unknown>[];
  citationData: Record<string, unknown>[];
  contentType?: string;
}

interface ContentGenerationInput {
  briefTitle: string;
  targetKeyword: string;
  contentType: string;
  targetWordCount: number;
  targetAudience: string | null;
  uniqueAngle: string | null;
  competitiveGap: string | null;
  requiredSections: string[] | null;
  semanticKeywords: string[] | null;
  internalLinks: string[] | null;
  authoritySignals: string | null;
  controversialPositions: string | null;
  brandVoice: Record<string, unknown> | null;
  serpContentAnalysis: string | null;
}

interface QualityScoringInput {
  content: string;
  targetKeyword: string;
  contentType: string;
  targetWordCount: number;
  title: string | null;
  metaDescription: string | null;
}

export function buildBriefGenerationPrompt(input: BriefGenerationInput): string {
  const competitiveSection = input.competitiveData.length > 0
    ? `\n## Competitive Intelligence\n${JSON.stringify(input.competitiveData, null, 2)}`
    : "\n## Competitive Intelligence\nNo competitive data available yet.";

  const citationSection = input.citationData.length > 0
    ? `\n## AI Citation Data\n${JSON.stringify(input.citationData, null, 2)}`
    : "\n## AI Citation Data\nNo AI citation data available yet.";

  const brandVoiceSection = input.brandVoice
    ? `\n## Brand Voice Profile\n${JSON.stringify(input.brandVoice, null, 2)}`
    : "";

  const existingKeywords = input.targetKeywords?.length
    ? `\n## Existing Target Keywords\n${input.targetKeywords.join(", ")}`
    : "";

  return `You are a strategic content intelligence analyst. Generate a comprehensive content brief for the following:

## Client
- Name: ${input.clientName}
- Domain: ${input.clientDomain}
- Industry: ${input.industry || "Not specified"}
${existingKeywords}
${brandVoiceSection}

## Target Keyword
${input.targetKeyword}

## Content Type
${input.contentType || "blog_post"}
${competitiveSection}
${citationSection}

## Instructions
Analyze the competitive landscape and AI citation opportunities to create a detailed content brief. Return your response as a JSON object with exactly these fields:

{
  "title": "Compelling, SEO-optimized title",
  "unique_angle": "What makes this content different from competitors",
  "competitive_gap": "Gaps in competitor content we can exploit",
  "target_audience": "Who this content is for",
  "serp_content_analysis": "Analysis of current SERP content for this keyword",
  "authority_signals": "E-E-A-T signals to include",
  "controversial_positions": "Bold takes that differentiate this content",
  "target_word_count": 1500,
  "required_sections": ["Section 1", "Section 2"],
  "semantic_keywords": ["related keyword 1", "related keyword 2"],
  "ai_citation_opportunity": "How to optimize for AI search citation",
  "priority_level": "high|medium|low",
  "competitive_gap_analysis": { "gaps": [], "opportunities": [] },
  "ai_citation_opportunity_data": { "platforms": [], "optimization_tips": [] }
}

Return ONLY the JSON object, no markdown fences or explanation.`;
}

export function buildContentGenerationPrompt(input: ContentGenerationInput): string {
  const sections = input.requiredSections?.length
    ? `\n## Required Sections\n${input.requiredSections.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "";

  const semanticKw = input.semanticKeywords?.length
    ? `\n## Semantic Keywords to Include\n${input.semanticKeywords.join(", ")}`
    : "";

  const links = input.internalLinks?.length
    ? `\n## Internal Links to Include\n${input.internalLinks.join("\n")}`
    : "";

  const brandVoice = input.brandVoice
    ? `\n## Brand Voice\n${JSON.stringify(input.brandVoice, null, 2)}`
    : "";

  return `You are an expert content writer specializing in SEO-optimized, authoritative content that ranks well in both traditional search and AI search engines.

## Content Brief
- Title: ${input.briefTitle}
- Target Keyword: ${input.targetKeyword}
- Content Type: ${input.contentType}
- Target Word Count: ${input.targetWordCount}
- Target Audience: ${input.targetAudience || "General audience"}
- Unique Angle: ${input.uniqueAngle || "Not specified"}
- Competitive Gap: ${input.competitiveGap || "Not specified"}
${sections}
${semanticKw}
${links}

## Authority & Expertise
${input.authoritySignals || "Include relevant E-E-A-T signals"}

## Bold Positions
${input.controversialPositions || "Take well-reasoned positions backed by data"}

## SERP Analysis
${input.serpContentAnalysis || "No SERP analysis available"}
${brandVoice}

## Instructions
Write a comprehensive, well-structured article that:
1. Targets the primary keyword naturally (2-3% density)
2. Includes semantic keywords throughout
3. Uses proper heading hierarchy (H2, H3)
4. Includes an engaging introduction with a hook
5. Has a clear, actionable conclusion
6. Is optimized for AI search citation (clear, factual statements)
7. Demonstrates E-E-A-T signals throughout
8. Includes data points and specific examples

Return your response as a JSON object:
{
  "title": "Final optimized title",
  "meta_description": "155 character max meta description",
  "excerpt": "2-3 sentence excerpt for previews",
  "content": "Full article content in markdown format",
  "internal_links_added": ["links used"],
  "external_references": ["sources referenced"],
  "aeo_optimizations": {
    "featured_snippet_targets": [],
    "faq_schema_questions": [],
    "clear_definitions": []
  }
}

Return ONLY the JSON object, no markdown fences or explanation.`;
}

export function buildQualityScoringPrompt(input: QualityScoringInput): string {
  return `You are a content quality analyst. Score the following content on multiple dimensions.

## Content to Analyze
Title: ${input.title || "Untitled"}
Meta Description: ${input.metaDescription || "None"}
Target Keyword: ${input.targetKeyword}
Content Type: ${input.contentType}
Target Word Count: ${input.targetWordCount}
Actual Word Count: ${input.content.split(/\s+/).length}

## Content
${input.content.substring(0, 8000)}

## Scoring Instructions
Score each dimension from 0-100 and provide specific feedback:

Return a JSON object:
{
  "overall_score": 0-100,
  "seo_score": 0-100,
  "readability_score": 0-100,
  "authority_score": 0-100,
  "engagement_score": 0-100,
  "aeo_score": 0-100,
  "detailed_feedback": {
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"],
    "seo_feedback": "Specific SEO feedback",
    "readability_feedback": "Specific readability feedback",
    "authority_feedback": "E-E-A-T signal feedback",
    "engagement_feedback": "Hook and CTA feedback",
    "aeo_feedback": "AI search optimization feedback"
  }
}

Scoring guidelines:
- SEO: keyword usage, heading structure, meta description, internal linking
- Readability: sentence length variety, paragraph structure, transitions, jargon usage
- Authority: E-E-A-T signals, data citations, expert positioning, specificity
- Engagement: hook quality, storytelling, CTAs, visual content suggestions
- AEO: clear definitions, factual statements, FAQ potential, structured data readiness

Return ONLY the JSON object, no markdown fences or explanation.`;
}

export const SYSTEM_PROMPTS = {
  briefGeneration: "You are a strategic content intelligence analyst. You analyze competitive landscapes and generate data-driven content briefs. Always return valid JSON.",
  contentGeneration: "You are an expert content writer who creates SEO-optimized, authoritative articles. You write engaging, well-researched content that ranks in both traditional and AI search. Always return valid JSON.",
  qualityScoring: "You are a content quality analyst who provides objective, consistent scoring of content across multiple dimensions. Always return valid JSON with scores from 0-100.",
};
