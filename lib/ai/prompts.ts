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
  serpAnalysis?: Record<string, unknown> | null;
  semanticKeywords?: string[] | null;
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

  const serpAnalysisSection = input.serpAnalysis
    ? `\n## SERP Analysis (Frase)\nReal-time analysis of top-ranking content for this keyword:\n${JSON.stringify(input.serpAnalysis, null, 2)}`
    : "\n## SERP Analysis\nNo SERP analysis data available.";

  const fraseKeywordsSection = input.semanticKeywords?.length
    ? `\n## Semantic Keywords (Frase)\nData-driven related keywords to include:\n${input.semanticKeywords.join(", ")}`
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
${serpAnalysisSection}
${fraseKeywordsSection}
${competitiveSection}
${citationSection}

## Instructions
Analyze the SERP data, semantic keywords, competitive landscape, and AI citation opportunities to create a detailed content brief. Use the Frase SERP analysis to understand what top-ranking content covers, identify gaps, and determine the optimal content structure. Incorporate the semantic keywords into your recommended sections and keyword strategy.

The final article will be a long-form editorial with flowing paragraphs (not bullet-point heavy), a Key Takeaways box at the top, and an FAQ section at the bottom. Design the required_sections accordingly — each section should be a topic area that will contain 3-5 paragraphs of substantive analysis, not a list heading.

Return your response as a JSON object with exactly these fields:

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

## Writing Style & Structure Instructions

Write a long-form, magazine-quality article that reads like a well-crafted editorial — NOT a list of bullet points. Follow this structure:

### Article Structure
1. **Key Takeaways** — Start with a "Key Takeaways" box (3-5 bullet points summarizing the article's core insights). This is the ONLY section that should be bullet points.
2. **Introduction** — 2-3 paragraphs with an engaging hook, context-setting, and a clear thesis. Draw the reader in with a story, surprising statistic, or provocative question.
3. **Body Sections** (H2/H3 headings) — The bulk of the article. Each section should contain:
   - **Flowing paragraphs** (3-5 sentences each) that explain, analyze, and argue — not bullets
   - Concrete examples, data points, and real-world scenarios woven into the prose
   - Smooth transitions between paragraphs and sections
   - Use bullet points or numbered lists ONLY when listing specific items (tools, steps, features) — never as the primary content format
4. **FAQ Section** — End with an "## Frequently Asked Questions" section containing 4-6 Q&A pairs formatted as H3 questions with paragraph answers. Base these on real questions people ask about this topic.
5. **Conclusion** — 1-2 paragraphs summarizing key insights and a clear call-to-action.

### Writing Quality
- Write in a confident, authoritative voice — like an industry expert explaining to a knowledgeable peer
- Every paragraph should contain substantive analysis, not just surface-level descriptions
- Use specific numbers, percentages, timeframes, and named examples (not vague generalities)
- Vary sentence length — mix short punchy sentences with longer explanatory ones
- Target the primary keyword naturally (2-3% density) and weave semantic keywords into the prose
- Demonstrate E-E-A-T: cite sources, reference methodologies, show first-hand expertise
- Optimize for AI search citation with clear, factual, well-attributed statements
- The content-to-bullet ratio should be at least 80% prose paragraphs, 20% or less lists

Return your response as a JSON object:
{
  "title": "Final optimized title",
  "meta_description": "155 character max meta description",
  "excerpt": "2-3 sentence excerpt for previews",
  "content": "Full article content in markdown format. Must be primarily flowing paragraphs with minimal bullet points. Must include Key Takeaways at top and FAQ section at bottom.",
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
  contentGeneration: "You are an expert content writer who creates long-form, magazine-quality articles. You write in flowing, analytical paragraphs — not bullet point lists. Your content reads like a well-crafted editorial with substantive analysis, specific examples, and authoritative voice. Every article must include Key Takeaways at the top and an FAQ section at the bottom. Always return valid JSON.",
  qualityScoring: "You are a content quality analyst who provides objective, consistent scoring of content across multiple dimensions. Always return valid JSON with scores from 0-100.",
};
