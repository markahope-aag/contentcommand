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
  briefType?: "optimization" | "refresh" | "consolidation" | "new" | "thin" | "opportunity" | "decaying" | "authority";
  existingPage?: Record<string, unknown> | null;
  pageKeywords?: Record<string, unknown>[] | null;
  cannibalizationData?: Record<string, unknown>[] | null;
  keywordGapData?: Record<string, unknown>[] | null;
  ppcData?: Record<string, unknown>[] | null;
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
  feedback?: string | null;
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

  const briefTypeGuidance: Record<string, string> = {
    optimization: "This is an OPTIMIZATION brief for an existing page. Focus on improving what already exists — better keyword targeting, expanded sections, improved authority signals. Do NOT suggest creating entirely new content; instead suggest specific improvements to the existing page.",
    refresh: "This is a REFRESH brief for content that needs updating. Review the existing page data and identify what information is outdated, what new developments should be added, and how the content structure can be modernized to match current SERP expectations.",
    decaying: "This is a DECAYING CONTENT brief. This page is actively losing traffic and/or rankings. The goal is to stop the decline and restore positive growth momentum. Analyze the existing page metrics to understand the severity of decay, identify what has changed in the competitive landscape since the page was performing well, and recommend specific updates — new sections, updated statistics, improved keyword targeting, better internal linking — that will reverse the decline.",
    thin: "This is a THIN CONTENT brief. This page has insufficient depth or word count to rank competitively. The goal is to substantially expand the article with authoritative, comprehensive coverage. Identify what subtopics, frameworks, case studies, and data points should be added to transform this from a thin page into a definitive resource. Recommend a target word count at least 2-3x the current length.",
    opportunity: "This is an OPPORTUNITY brief. This page has high impressions but low clicks/CTR, meaning it appears in search results but isn't compelling enough to earn clicks. Focus on improving the title tag, meta description, and opening content to increase click-through rate. Also recommend content improvements that would push rankings from page 2 into page 1 positions.",
    consolidation: "This is a CONSOLIDATION brief. Multiple pages are competing for the same keyword (cannibalization). Recommend which page should be the canonical target, what content from other pages should be merged in, and which pages should be redirected.",
    new: "This is a NEW content brief. No existing page covers this topic. Focus on creating something that fills a gap in the client's content portfolio.",
    authority: "This is a DOMAIN AUTHORITY brief. The goal is to build topical authority within an existing content cluster. Create a comprehensive, authoritative piece that strengthens the client's expertise signals for this topic area. Focus on depth, E-E-A-T signals, internal linking to related cluster content, and covering subtopics that establish the client as the definitive resource. Reference and link to the client's existing content on related topics.",
  };

  const briefTypeSection = input.briefType
    ? `\n## Brief Type: ${input.briefType.toUpperCase()}\n${briefTypeGuidance[input.briefType] || briefTypeGuidance.new}`
    : "";

  const existingPageSection = input.existingPage
    ? `\n## Existing Page Performance\nCurrent metrics for the page being optimized:\n${JSON.stringify(input.existingPage, null, 2)}`
    : "";

  const pageKeywordsSection = input.pageKeywords?.length
    ? `\n## Current Page Keywords\nKeywords this page already ranks for (preserve and strengthen these):\n${JSON.stringify(input.pageKeywords, null, 2)}`
    : "";

  const cannibalizationSection = input.cannibalizationData?.length
    ? `\n## Cannibalization Risk\nThese keywords have multiple competing pages on the same domain:\n${JSON.stringify(input.cannibalizationData, null, 2)}`
    : "";

  const keywordGapSection = input.keywordGapData?.length
    ? `\n## Competitor Keyword Gaps\nKeywords competitors rank for but the client does not — high-value content opportunities:\n${JSON.stringify(input.keywordGapData, null, 2)}`
    : "";

  const ppcSection = input.ppcData?.length
    ? `\n## PPC Commercial Intent\nKeywords competitors are paying for in Google Ads — indicates high commercial value:\n${JSON.stringify(input.ppcData, null, 2)}`
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
${briefTypeSection}
${serpAnalysisSection}
${fraseKeywordsSection}
${competitiveSection}
${citationSection}
${existingPageSection}
${pageKeywordsSection}
${cannibalizationSection}
${keywordGapSection}
${ppcSection}

## Instructions
Analyze ALL available data — SERP analysis, semantic keywords, competitive landscape, AI citation opportunities, existing page performance, current page keywords, cannibalization risks, keyword gaps, and PPC commercial intent — to create a detailed content brief. Use the Frase SERP analysis to understand what top-ranking content covers, identify gaps, and determine the optimal content structure. Incorporate the semantic keywords into your recommended sections and keyword strategy. Factor in existing page data to preserve ranking signals and avoid cannibalization. Use PPC data to identify high-commercial-value angles.

The final article will be a long-form editorial written like a Harvard Business Review piece — flowing paragraphs with concrete data, named frameworks (SWOT, PESTLE, etc.), comparison tables, case studies, and authoritative source citations. It will have Key Takeaways at the top and an FAQ section at the bottom. Design the required_sections accordingly — each section should be a topic area that will contain 3-5 paragraphs of substantive, specific analysis with at least one rich content element (table, framework, case study, or expert quote). Sections should NOT be list headings.

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

  const feedbackSection = input.feedback
    ? `\n## Revision Feedback\nThe previous version of this content received the following feedback. Address every point in this revision:\n${input.feedback}\n`
    : "";

  return `You are an expert content strategist and writer who produces long-form, editorial-quality articles. Your writing style combines the analytical depth of Harvard Business Review with the accessibility of a senior consultant briefing a knowledgeable client. You write in flowing, substantive paragraphs — not bullet-point listicles.

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
${feedbackSection}
## ARTICLE STRUCTURE (follow this exactly)

### 1. Key Takeaways (immediately after the H1)
A bulleted list with no more than 6 crisp, measurable bullet points (e.g., "Companies using X see 34% higher Y"). Each bullet must contain a specific number, timeframe, or named example. This is the ONLY place where a pure bullet list is acceptable.

### 2. Introduction (2-3 paragraphs)
Open with a surprising statistic, a concrete anecdote, or a provocative question — not a generic overview. Set context, state the thesis clearly, and preview what the reader will learn. End the introduction with a one-sentence thesis or promise statement.

### 3. Body Sections (H2 and H3 headings)
Each H2 section should contain:
- **3-5 flowing paragraphs** of substantive analysis (not surface-level descriptions)
- Each paragraph focuses on ONE idea with definition, comparison, and practical recommendation
- **At least one rich content element per section**: a markdown comparison table, a numbered process/framework, a blockquote with attribution, or a concrete case study
- **Specific frameworks and models by name** (e.g., SWOT, PESTLE, OODA loop, Porter's Five Forces, Jobs-to-Be-Done) with brief definitions on first use
- **Concrete metrics**: sample KPIs, percentages, market share figures, timeframes, tool names (e.g., "use SEMrush for competitor keyword gaps", "use Trello/Jira for execution tracking")
- **2-3 authoritative external references per section** — cite academic sources, industry reports, named experts, government/standards bodies. Format as inline markdown links to plausible authoritative URLs (Wikipedia, .gov, .edu, industry association sites)
- Smooth transitions between paragraphs — each paragraph's opening sentence should connect to the previous paragraph's conclusion

### 4. Frequently Asked Questions (H2: "Frequently Asked Questions")
5-6 Q&A pairs. Each question is an H3. Each answer is 2-3 sentences giving a direct, concise response — not a mini-essay. Base questions on real search queries and "People Also Ask" patterns for this keyword. Answers should be written as standalone factual statements that AI search engines can cite directly.

### 5. Conclusion (1-2 paragraphs)
Summarize the 3 most important insights (using different phrasing than Key Takeaways — no verbatim repetition). End with a specific, actionable call-to-action.

## WRITING QUALITY REQUIREMENTS

### Specificity (critical — this is where most content fails)
- NEVER write vague statements like "many companies" or "significant improvement" or "in recent years"
- ALWAYS use specific: company names, dollar amounts, percentages, timeframes, tool names, framework names, study citations
- Every claim should have a concrete example, a number, or a named reference attached to it

### Semantic Repetition (avoid)
- Do NOT repeat the same key themes verbatim across sections. Use natural variants and synonyms
- The Key Takeaways and Conclusion should express the same ideas in completely different language
- Vary how you reference the target keyword — use synonyms, related phrases, and natural language variants

### Assertive Language
- Write with confidence. Avoid hedging words: "often", "can", "sometimes", "may", "might", "generally"
- Instead use: "consistently", "research shows", "data confirms", "organizations that X achieve Y"
- Make evidence-backed claims, not wishy-washy suggestions

### Terminology & Definitions
- Define every domain-specific term, acronym, or framework on first use with a brief inline definition
- Example: "the OODA loop (Observe, Orient, Decide, Act) — a decision-making framework originally developed by military strategist John Boyd —"

### Paragraph Cohesion
- Each paragraph should contain exactly ONE main idea
- Structure: topic sentence → evidence/example → analysis → transition to next idea
- Never mix multiple unrelated concepts in a single paragraph

### Rich Content Elements (MUST include at least 3 of these across the article)
- Markdown comparison tables (at least one, e.g., Feature vs Feature, Option A vs Option B)
- Numbered step-by-step processes or frameworks
- Blockquotes with attributed expert quotes
- Concrete case studies with named organizations, specific outcomes, and timeframes

### Tone
- Professional, instructive, authoritative — like a senior consultant briefing a knowledgeable client
- Keep promotional language confined to the CTA in the conclusion only
- No emotional or dramatic phrasing — "battlefield victories" is too inflammatory; use "competitive advantages" instead
- Standardize formality throughout — don't switch between casual and formal registers

## OUTPUT FORMAT

Return your response as a JSON object:
{
  "title": "Final optimized title — specific and compelling, not generic",
  "meta_description": "155 character max. Include target keyword, a specific benefit, and a reason to click.",
  "excerpt": "2-3 sentence excerpt for previews. Specific, not vague.",
  "content": "Full article in markdown. H2/H3 headings, flowing paragraphs, comparison tables, FAQ section, minimal bullet points except Key Takeaways.",
  "internal_links_added": ["links used in the article"],
  "external_references": ["authoritative sources referenced — Wikipedia, .gov, .edu, industry reports"],
  "aeo_optimizations": {
    "featured_snippet_targets": ["questions this content directly answers in 1-2 sentences"],
    "faq_schema_questions": ["questions from the FAQ section suitable for FAQ schema markup"],
    "clear_definitions": ["terms defined in the article that AI search can cite"]
  }
}

Return ONLY the JSON object, no markdown fences or explanation.`;
}

export function buildQualityScoringPrompt(input: QualityScoringInput): string {
  return `You are a rigorous content quality analyst who evaluates articles against the standards used by professional content auditing platforms. You score harshly and specifically — a score of 70 means "acceptable but needs work", 85+ means "publication-ready", and 90+ means "exceptional".

## Content to Analyze
Title: ${input.title || "Untitled"}
Meta Description: ${input.metaDescription || "None"}
Target Keyword: ${input.targetKeyword}
Content Type: ${input.contentType}
Target Word Count: ${input.targetWordCount}
Actual Word Count: ${input.content.split(/\s+/).length}

## Content
${input.content.substring(0, 8000)}

## Scoring Dimensions

Score each dimension from 0-100 based on the specific criteria below. Be strict — do not inflate scores. If the content fails a criterion, penalize meaningfully.

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

## Scoring Criteria (apply these strictly)

### SEO Score
- Target keyword appears naturally in H1, first paragraph, at least 2 H2s, meta description, and conclusion
- Keyword density is 2-3% (not stuffed, not absent)
- Proper heading hierarchy (H1 → H2 → H3, no skipped levels)
- Semantic keywords and related terms are woven throughout the prose
- Internal and external links are present and contextually relevant
- Meta description is under 155 characters, includes keyword and a compelling reason to click
- Penalize: keyword stuffing, missing headings, no links, generic meta description

### Readability Score
- Paragraphs focus on ONE idea each (topic sentence → evidence → analysis → transition)
- Sentence length varies (mix of short punchy and longer explanatory sentences)
- Smooth transitions between paragraphs and sections — not choppy or disconnected
- Content is primarily flowing prose (80%+ paragraphs). Bullet points used sparingly and only for listing specific items
- No jargon without inline definitions on first use
- FAQ answers are direct and concise (2-3 sentences), not mini-essays
- Penalize heavily: bullet-point-heavy content, paragraphs mixing multiple unrelated ideas, wall-of-text sections without subheadings, undefined acronyms

### Authority Score
- Specific numbers, percentages, timeframes, and dollar amounts support claims
- Named frameworks referenced (SWOT, PESTLE, Porter's Five Forces, etc.) with definitions
- Named companies, tools, and real-world examples cited (not generic "many organizations")
- External authoritative references present (academic, .gov, .edu, industry reports, named experts)
- Concrete case studies with named organizations, specific outcomes, and measurable results
- E-E-A-T signals: demonstrates experience, expertise, authoritativeness, and trustworthiness
- Penalize heavily: vague claims ("significant improvement", "many companies"), no named sources, no specific data points, conceptual content without concrete examples

### Engagement Score
- Opening hook is specific and compelling (statistic, anecdote, or provocative question — not a generic overview)
- Key Takeaways section present near the top with no more than 6 crisp, measurable bullet points in a bulleted list
- Rich content elements present: comparison tables, numbered frameworks, blockquotes with attribution, case study callouts
- At least one markdown table in the article
- Conclusion has a specific, actionable call-to-action
- Content variety: not monotonous in format — mixes prose, tables, quotes, frameworks
- Penalize: generic introduction, no Key Takeaways, no tables or rich elements, weak/missing CTA, monotonous format

### AEO (AI Engine Optimization) Score
- FAQ section present with 5-6 Q&A pairs formatted as H3 questions
- FAQ answers are clear, factual, standalone statements that AI can cite directly
- Key terms and concepts are explicitly defined in complete sentences
- Claims are structured as citable factual statements ("X is defined as...", "According to [source], Y results in Z")
- No semantic repetition — Key Takeaways, body, and Conclusion express the same ideas in different language
- Assertive language throughout — no hedging with "often", "can", "sometimes", "may", "might"
- Penalize: missing FAQ, hedging language, undefined terms, repetitive phrasing across sections, no citable definitions

Return ONLY the JSON object, no markdown fences or explanation.`;
}

export const SYSTEM_PROMPTS = {
  briefGeneration: "You are a strategic content intelligence analyst. You analyze competitive landscapes and generate data-driven content briefs. Always return valid JSON.",
  contentGeneration: "You are an expert content strategist who writes like a senior consultant — analytical, specific, and authoritative. Your articles use flowing paragraphs with concrete data, named frameworks, comparison tables, and real-world case studies. You never write bullet-point listicles. Every article includes Key Takeaways at the top and FAQ at the bottom. You define technical terms on first use and cite authoritative sources throughout. Always return valid JSON.",
  qualityScoring: "You are a rigorous content quality analyst. You score strictly against professional editorial standards — specificity, rich content elements, paragraph cohesion, assertive language, FAQ quality, semantic variety, and authoritative sourcing. A 70 is acceptable, 85+ is publication-ready, 90+ is exceptional. Do not inflate scores. Always return valid JSON.",
};
