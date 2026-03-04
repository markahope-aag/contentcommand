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
  readingLevel?: "general" | "executive" | "technical" | "beginner";
  writingStyle?: "analytical" | "conversational" | "provocative" | "storytelling";
  voice?: "authoritative" | "collaborative" | "journalistic" | "practitioner";
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

## Target Word Count — CRITICAL
Set target_word_count based on the SERP analysis data. Look at the word_count values of the top 5-10 ranking pages and calculate the competitive word count as follows:
- Find the AVERAGE word count of the top 5 ranking pages
- Set target_word_count to ~110% of that average (aim to be slightly more comprehensive than competitors)
- MINIMUM: 1200 words (anything shorter lacks depth)
- MAXIMUM: 4000 words (longer articles hit diminishing returns)
- Round to the nearest 250 (e.g., 1250, 1500, 1750, 2000, 2250, etc.)
- If no SERP word count data is available, default to 2000

The number of required_sections should match: roughly 1 section per 350-400 words of target_word_count.

Return your response as a JSON object with exactly these fields:

{
  "title": "Compelling, SEO-optimized title",
  "unique_angle": "What makes this content different from competitors",
  "competitive_gap": "Gaps in competitor content we can exploit",
  "target_audience": "Who this content is for",
  "serp_content_analysis": "Analysis of current SERP content for this keyword — include the average word count of top-ranking pages and your reasoning for the chosen target_word_count",
  "authority_signals": "E-E-A-T signals to include",
  "controversial_positions": "Bold takes that differentiate this content",
  "target_word_count": 2000,
  "required_sections": ["Section 1", "Section 2"],
  "semantic_keywords": ["related keyword 1", "related keyword 2"],
  "ai_citation_opportunity": "How to optimize for AI search citation",
  "priority_level": "high|medium|low",
  "competitive_gap_analysis": { "gaps": [], "opportunities": [] },
  "ai_citation_opportunity_data": { "platforms": [], "optimization_tips": [] }
}

Return ONLY the JSON object, no markdown fences or explanation.`;
}

function buildContentTuningSection(
  readingLevel?: string,
  writingStyle?: string,
  voice?: string,
): string {
  // Skip entirely if all defaults
  if (!readingLevel && !writingStyle && !voice) return "";

  const readingLevelInstructions: Record<string, string> = {
    general: "Write for a general business audience. Use clear, accessible language. Assume familiarity with common business concepts but define specialized terms. Aim for a college-educated reading level.",
    executive: "Write for C-suite executives and senior decision-makers. Lead with strategic implications, ROI, and bottom-line impact. Use concise, high-density prose — no filler. Assume deep business acumen but not necessarily domain expertise. Favor data-driven arguments and strategic frameworks.",
    technical: "Write for technical practitioners and subject-matter experts. Use precise domain terminology without over-explaining fundamentals. Include implementation details, architecture considerations, and technical trade-offs. Assume the reader has hands-on experience in the field.",
    beginner: "Write for readers new to this topic. Define every term on first use. Use analogies and real-world examples to explain abstract concepts. Break complex ideas into digestible steps. Avoid assumed knowledge — build understanding progressively from foundations up.",
  };

  const writingStyleInstructions: Record<string, string> = {
    analytical: "Use a structured, evidence-driven approach. Build arguments methodically with data, frameworks, and logical progression. Favor comparison tables, numbered analyses, and systematic evaluations. Each claim should be supported by specific evidence.",
    conversational: "Write in a warm, engaging tone that feels like a knowledgeable colleague explaining over coffee. Use rhetorical questions, relatable scenarios, and occasional humor. Maintain authority through expertise, not formality. Use contractions and direct address ('you').",
    provocative: "Lead with bold, contrarian positions that challenge conventional wisdom. Open sections with surprising claims, then back them with rigorous evidence. Use tension and debate to keep readers engaged. Don't hedge — take clear stances and defend them with data.",
    storytelling: "Structure arguments around narrative arcs — real company journeys, before/after transformations, cautionary tales. Lead each section with a concrete story, then extract lessons and frameworks. Make data memorable by embedding it in human narratives.",
  };

  const voiceInstructions: Record<string, string> = {
    authoritative: "Write from a position of established expertise. Use confident, declarative statements. Reference 'our analysis', 'industry data confirms', 'the evidence demonstrates'. Project the authority of a recognized thought leader publishing in a top-tier business journal.",
    collaborative: "Write as a peer sharing insights with fellow professionals. Use inclusive language: 'we', 'our industry', 'teams like yours'. Acknowledge complexity and trade-offs honestly. Position the reader as a capable professional who benefits from shared perspective, not instruction.",
    journalistic: "Write with the objectivity and rigor of investigative journalism. Present multiple viewpoints fairly, cite sources meticulously, and let evidence drive conclusions. Use the inverted pyramid — most important findings first. Attribute claims specifically and verify with multiple sources.",
    practitioner: "Write from the trenches — as someone who has implemented, failed, iterated, and succeeded. Use first-person experience: 'in practice, we found...', 'the implementation challenge most teams miss...', 'after deploying this across 12 client engagements...'. Prioritize hard-won practical wisdom over theoretical frameworks.",
  };

  const parts: string[] = ["## Content Tuning\nApply the following stylistic adjustments to the entire article:\n"];

  if (readingLevel && readingLevel !== "general" && readingLevelInstructions[readingLevel]) {
    parts.push(`**Reading Level — ${readingLevel}:** ${readingLevelInstructions[readingLevel]}`);
  }
  if (writingStyle && writingStyle !== "analytical" && writingStyleInstructions[writingStyle]) {
    parts.push(`**Writing Style — ${writingStyle}:** ${writingStyleInstructions[writingStyle]}`);
  }
  if (voice && voice !== "authoritative" && voiceInstructions[voice]) {
    parts.push(`**Voice — ${voice}:** ${voiceInstructions[voice]}`);
  }

  // If only defaults were selected, skip the section
  if (parts.length === 1) return "";

  return "\n" + parts.join("\n\n");
}

export function buildContentGenerationPrompt(input: ContentGenerationInput): string {
  const sections = input.requiredSections?.length
    ? `\n## Required Sections\n${input.requiredSections.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "";

  const semanticKw = input.semanticKeywords?.length
    ? `\n## Semantic / NLP Keywords (MUST include naturally throughout the article)
These terms are extracted from top-ranking SERP competitors. Search engines expect content on this topic to include these terms. Work each term into the article at least 1-2 times in natural context. Do NOT keyword-stuff — use them where they fit organically.

Terms: ${input.semanticKeywords.join(", ")}

IMPORTANT: After writing, mentally check that each term above appears at least once. Missing many of these terms will significantly hurt the SEO score.`
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

  const tuningSection = buildContentTuningSection(input.readingLevel, input.writingStyle, input.voice);

  return `You are an expert content strategist and writer. You produce long-form, editorial-quality articles optimized for both traditional search (SEO) and AI search engines (GEO/AEO). Your writing combines the analytical depth of Harvard Business Review with the accessibility of a senior consultant briefing a knowledgeable client. You write personality-driven, opinionated prose — never bland, generic, or corporate filler.

## Content Brief
- Title: ${input.briefTitle}
- Target Keyword: ${input.targetKeyword}
- Content Type: ${input.contentType}
- Target Word Count: ${input.targetWordCount} words (STRICT LIMIT — the article MUST be between ${Math.round(input.targetWordCount * 0.85)} and ${Math.round(input.targetWordCount * 1.10)} words. This target comes from SERP competitor analysis — top-ranking pages average this length. Going 2-3x over target actively hurts SEO ranking. If the target is 1500, write 1350-1650 words. Cut sections, reduce examples, or tighten prose to stay within range. NEVER pad content to fill length.)
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
${tuningSection}

---

## PEOPLE-FIRST CONTENT (Google's Helpful Content Guidelines)

Before optimizing for any search engine, the article must pass Google's people-first content test. Every piece of content should earn a "yes" to ALL of these:

1. **Written for the target audience first, search engines second.** The article must read as if written by a knowledgeable professional sharing genuine expertise — not as a keyword-optimized SEO artifact. If a reader can tell the content was made to rank, it fails.
2. **Demonstrates first-hand experience and depth of knowledge.** Write from the perspective of someone who has DONE the thing, not just researched it. Use practitioner language: "In practice, teams discover that...", "The implementation challenge most organizations miss is...", "After deploying X, the most common failure point is..."
3. **Provides original analysis, not just a summary of other sources.** Every section must add value beyond what's available elsewhere — a unique framework, a contrarian take backed by data, a novel comparison, or an original synthesis of multiple sources into a new insight.
4. **Leaves the reader feeling they learned enough to take action.** After reading, someone should be able to DO something concrete — not just understand a topic abstractly. Each section should have a practical takeaway, tool recommendation, or actionable next step.
5. **Headlines are descriptive and accurate, not exaggerated.** The title and H2s must accurately describe what follows. No clickbait, no over-promising. If the title says "Complete Guide", the content must actually be comprehensive.
6. **Clear authorship and expertise signals.** Write as if the bylined author is a recognized expert. Reference "our analysis", "in our experience", "we've observed across client engagements" to signal practitioner authority. Avoid the detached, Wikipedia-neutral voice in the body — save that for definitions only.
7. **Would a knowledgeable reader bookmark and share this?** The content must pass the "would I send this to a colleague?" test. This means genuinely useful insights, not surface-level overviews padded to hit a word count.

---

## ARTICLE STRUCTURE (follow this exactly)

### 1. Key Takeaways (H2, immediately after the H1)
A standard markdown bulleted list (using \`- \` prefix, one item per line) with no more than 6 crisp, measurable bullet points. Each bullet MUST contain a specific number, dollar amount, percentage, timeframe, or named example (e.g., "Organizations adopting OODA-based decision cycles reduce strategic response time by 40%, according to McKinsey's 2024 Agility Report"). This is the ONLY section where a pure bullet list is acceptable. Do NOT reuse these exact phrasings anywhere else in the article. CRITICAL: Use standard markdown list syntax (\`- Item text\`), NOT blockquotes, NOT inline bullet characters (•), NOT a single paragraph. Each bullet point must be its own line starting with \`- \`.

### 2. Introduction (2-3 paragraphs)
- Open with a surprising, SPECIFIC statistic with its source, a concrete named anecdote, or a provocative question grounded in data — never a generic overview like "In today's fast-paced business environment..."
- Set context with specific scope (market size, industry trend with date, named company example)
- State the thesis clearly and preview what the reader will gain
- End the introduction with a single-sentence thesis/promise statement
- The introduction must establish the author's point of view — take a stance, not a survey

### 3. Body Sections (H2 and H3 headings)

You MUST write ${Math.max(3, Math.min(8, Math.ceil(input.targetWordCount / 500)))} H2 body sections (excluding Key Takeaways, FAQ, and Conclusion). Stay within the target word count — fewer deeper sections are better than many shallow ones. Each H2 section MUST contain:

**Substantive prose (3-5 paragraphs per H2):**
- Each paragraph contains exactly ONE idea: topic sentence → evidence/example → analysis → bridge to next idea
- Paragraphs flow logically — each opening sentence connects to the previous paragraph's conclusion
- Split any paragraph that mixes multiple concepts into separate paragraphs
- No paragraph should exceed 4-5 sentences

**At least ONE rich content element per section (vary the type across sections):**
- **Markdown comparison table** (3+ columns, 4+ rows) — e.g., Feature vs Feature, Option A vs B vs C with specific metrics
- **Numbered step-by-step framework** — a named process (e.g., "The Scan-Plan-Execute-Learn Cycle") with 4-6 concrete steps, each step including a specific tool or metric
- **Blockquote with attribution** — a real or representative expert quote with name, title, and organization
- **Concrete case study callout** — company name, industry, specific challenge, action taken, measurable outcome with numbers, and timeframe (e.g., "Booz Allen Hamilton reduced its strategy-to-execution gap from 18 months to 6 months by implementing...")
- **Sidebar insight** — format as a blockquote starting with "**Key Insight:**" or "**Industry Benchmark:**" containing a standalone citable fact

**Minimum rich element distribution across the full article (scale to word count):**
${input.targetWordCount >= 2500
    ? `- At least 2 comparison tables (one MUST be a "Direct Comparison Table" early in the article)
- At least 2 named case studies with specific outcomes
- At least 2 blockquotes (expert quotes or key insights)
- At least 1 numbered framework/process`
    : `- At least 1 comparison table
- At least 1 named case study with specific outcomes
- At least 1 blockquote (expert quote or key insight)
- At least 1 numbered framework/process`}

**Specificity requirements (CRITICAL — score depends on this):**
- NEVER write: "many companies", "significant improvement", "in recent years", "various factors", "some experts", "it is important to", "it is worth noting"
- ALWAYS write: specific company names, specific dollar amounts, specific percentages, specific dates/timeframes, specific tool names, specific framework names with definitions, specific study/report citations
- Every H2 section must reference at least: 1 named company, 1 specific metric/number, 1 named tool or framework
- Include sample KPI tables with actual metric names and target ranges where relevant
- Reference specific tools by name with concrete use cases (e.g., "use SEMrush's Keyword Gap tool to identify terms competitors rank for in positions 1-10 that your domain misses entirely")

**External references (2-3 per H2 section):**
- Cite academic sources, industry reports, .gov/.edu sites, named experts, standards bodies
- Format as inline markdown links: [source name](URL)
- Use authoritative domains: Wikipedia, .gov, .edu, Harvard Business Review, McKinsey, Gartner, Forrester, industry association sites
- Each citation must support a specific claim, not just be decorative

**Jargon and metaphor handling:**
- First use of any domain term: provide a brief parenthetical definition
- First use of any acronym: spell it out with context (e.g., "competitive intelligence (CI) — the systematic collection and analysis of information about competitors' activities —")
- Use concrete, business-appropriate metaphors. AVOID military/sports clichés ("battlefield", "winning the war", "slam dunk"). PREFER business strategy language ("competitive advantage", "market positioning", "strategic leverage")
- Avoid overused metaphors like "art of strategy" — use concrete alternatives

### 4. Frequently Asked Questions (H2: "Frequently Asked Questions") — LAST section before Conclusion
${input.targetWordCount <= 1500 ? "3-5" : input.targetWordCount <= 2500 ? "5-7" : "6-10"} Q&A pairs, optimized for both FAQ schema and AI search citation:
- Each question is an **H3** heading phrased as a natural search query or "People Also Ask" question
- Each answer starts with a **1-2 sentence direct answer** that stands alone as a complete, citable factual statement — this is what AI search engines will extract
- Follow the direct answer with 1-2 sentences of supporting context, a specific example, or a metric
- Use definitional patterns AI search engines prefer: "X is defined as...", "X refers to...", "The primary difference between X and Y is..."
- Convert any subheadings that could be questions into FAQ entries instead of leaving them as body sections
- Questions should cover: definition ("What is X?"), comparison ("How does X compare to Y?"), process ("How do you implement X?"), metrics ("What KPIs measure X?"), and cost/timeline ("How long does X take?")

### 5. Conclusion (H2, 1-2 paragraphs)
- Summarize the 3 most actionable insights using COMPLETELY DIFFERENT vocabulary than Key Takeaways — no shared phrases, statistics, or sentence structures
- End with a specific, actionable next step (not a vague "reach out to learn more")
- The conclusion should feel like a consultant's closing recommendation, not a summary

---

## WRITING PERSONALITY & VOICE

### Tone (score: aim for 85%+ on tone audit)
- **Professional and instructive** — like a senior consultant briefing a knowledgeable client who respects direct talk
- Occasional conversational language in the CTA and author bio is fine — but keep the body main-neutral and moving
- NO emotional or inflammatory phrasing — replace "battlefield victories" with "competitive advantages", "crushing the competition" with "outperforming peers"
- Standardize formality: don't switch between "Next steps" (casual) and "It is incumbent upon organizations" (stuffy). Pick ONE register and hold it: "Next steps for your business" level
- Keep promotional CTAs confined to the conclusion — zero selling in the body

### Assertive Language (aim for 75%+)
- Write with confidence. ELIMINATE hedging words: "often", "can", "sometimes", "may", "might", "generally", "it is important to note"
- REPLACE WITH: "consistently", "research confirms", "data from [source] shows", "organizations that X achieve Y"
- Use stronger evidence-backed statements: replace "Competitive analysis is essential" with "Competitive analysis reduces market-entry risk by identifying X concerns/threats/opportunities"
- Replace vague "success" language with measurable outcomes

### Semantic Repetition (aim for 65%+ — currently the biggest weakness)
- Key themes (adaptability, leadership, competitor analysis, strategy) must NOT be repeated verbatim across sections
- Introduce natural variants: "adaptability" → "pivoting product strategy", "rapid decision cycles", "contingency reserves"
- The Key Takeaways, body sections, and Conclusion must express overlapping ideas in COMPLETELY different language and sentence structures
- Reduce verbatim repetition in consecutive sections — if section 3 discusses "competitive analysis", section 4 should use "market intelligence" or "rival benchmarking"
- Reference the target keyword using at least 5 distinct phrasings throughout the article (synonyms, related phrases, natural language variants)

### Readability (aim for 70%+)
- FAQ section helps readability — make answers genuine Q&A style, not mini-essays
- Main body should be prose-first, but some short bullet lists (3-5 items) are acceptable within sections when listing specific items (tools, metrics, steps)
- Convert subheadings that read as questions into the FAQ section
- Vary sentence length: mix short declarative sentences (8-12 words) with longer analytical ones (20-30 words)
- Add white space: no paragraph longer than 5 sentences

### Paragraph Cohesion (aim for 75%+)
- Each paragraph focuses on a SINGLE idea and flows logically within sections
- A few longer paragraphs mixing 2 concepts (e.g., definition + comparison + recommendation) should be split into separate focused paragraphs
- Structure each paragraph: definition → direct comparison → practical recommendation
- Every paragraph's first sentence must connect to the prior paragraph's final thought

### Clarity and Assertiveness (aim for 75%+)
- Eliminate filler words: "often", "can", "sometimes", "might", "perhaps"
- Use stronger, evidence-backed statements: "This might involve" → "This requires"; "could be softened" → "improves when"
- Where possible, use evidence-backed statements: "Competitive analysis is essential" → "Competitive analysis reduces market-entry risk by identifying X"
- Replace vague "success" language with measurable outcomes

---

## GEO (Generative Engine Optimization) — STRUCTURED FOR AI UNDERSTANDING

Research shows content with quotations and statistics is 30-40% more likely to be cited by AI search engines (Otterly.AI GEO Study, 2025). The content must be structured so AI search engines (ChatGPT, Perplexity, Gemini, Google AI Overviews) can easily parse, understand, and cite it.

### Structure (aim for 81%+)
- **Heading hierarchy**: H1 (title) → H2 (sections) → H3 (subsections/FAQ questions). NEVER skip levels (no H1 → H3)
- **Paragraph structure**: Each paragraph has a clear topic sentence that could serve as a standalone summary
- **Lists and structured content**: Use ordered lists for processes/steps, unordered lists for Key Takeaways only
- **Navigation structure**: Section headings should read as a logical table of contents — a reader scanning only headings should understand the article's argument
- **Summary/TL;DR element**: The Key Takeaways section serves this function — AI search engines prioritize content that provides direct answers early

### Content Variety (aim for 56%+ — currently very low)
- **Rich content elements**: Tables, blockquotes, numbered frameworks, case study callouts — at least 6 distinct rich elements across the article
- **Content variety**: Mix prose paragraphs, comparison tables, expert quotes, step-by-step processes, case studies, and data points. No more than 3 consecutive paragraphs of plain prose without a rich element breaking up the flow

### Quotes, Statistics & Citations (CRITICAL for AI citation — 30-40% visibility boost)
AI search engines like Perplexity, ChatGPT, and Google AI Overviews heavily favor content that includes:
- **Quotations**: Include at least 3-4 attributed expert quotes (blockquotes with name, title, organization). Keep quotes to 1-2 sentences — AI search extracts short, punchy quotes, not paragraphs
- **Statistics with sources**: Every major claim MUST have a specific statistic with its source. Format: "According to [Source], [specific metric]" — this is the exact pattern AI search engines extract and cite
- **Cited sources as inline links**: Use markdown links to authoritative sources. AI search engines follow citation links — content with credible linked sources gets ranked higher in AI responses
- **Technical terms with definitions**: Define domain terms using encyclopedic-style definitions. Write them as if they could appear on Wikipedia — neutral, factual, verifiable: "X is defined as [definition]. First introduced by [person/org] in [year], it..."
- **Entity-first thinking**: Think about entities (companies, people, frameworks, products) not just keywords. LLMs understand relationships between entities. Reference specific named entities throughout — this helps LLMs associate the content with the right topic clusters

### Citable Content Patterns (critical for AI citation)
- Write key definitions as standalone sentences: "Competitive intelligence is the systematic process of gathering, analyzing, and applying information about competitors, market trends, and industry dynamics to inform strategic decision-making."
- Structure claims for AI extraction: "According to [Source], [specific finding with number]."
- Each H2 section should contain at least one paragraph that could be extracted and cited verbatim by an AI search engine as a complete, authoritative answer
- Use definitional patterns: "X is defined as...", "The key difference between X and Y is...", "Research from [source] demonstrates that..."
- **Keep citable statements to 1-2 sentences** — AI search engines extract short, factual statements, not full paragraphs. The most citable content follows this pattern: "[Entity/concept] [verb] [specific claim with metric]. [Source attribution]."

### Schema-Ready Structure
- The article must naturally support schema.org Article, FAQ, and HowTo markup:
  - FAQ section with clear question (H3) + answer structure
  - Numbered frameworks support HowTo schema
  - Clear authorship and expertise signals support Article schema
- Include JSON-LD-friendly patterns: clear entity names, structured Q&A, defined terms
- Title tag: Include target keyword, specific benefit, and differentiator. Under 60 characters ideal
- Meta description: Under 155 characters. Target keyword + specific value proposition + reason to click

---

## WORD COUNT CHECK (CRITICAL)
Before finalizing, count your words. The article MUST be ${Math.round(input.targetWordCount * 0.85)}–${Math.round(input.targetWordCount * 1.10)} words. If you are over, cut entire FAQ entries, reduce case study detail, merge sections, or tighten prose. Do NOT submit content that exceeds the target by more than 10%.

## OUTPUT FORMAT

Return your response as a JSON object:
{
  "title": "Final optimized title — specific, compelling, under 60 chars if possible. Include the target keyword and a differentiator.",
  "meta_description": "Under 155 characters. Target keyword + specific metric or benefit + reason to click. No generic filler.",
  "excerpt": "2-3 sentence excerpt. Must contain a specific insight or number — not a vague overview.",
  "content": "Full article in markdown. Key Takeaways (max 6 bullets) at top, proper H2/H3 hierarchy, flowing paragraphs, 2+ comparison tables, 2+ case studies, 2+ blockquotes, 1+ numbered framework, FAQ (max 10 Q&A pairs) near end before Conclusion. Minimal bullet points outside Key Takeaways.",
  "internal_links_added": ["links used in the article"],
  "external_references": ["All authoritative sources cited — with URLs. Minimum 8-12 across the article."],
  "aeo_optimizations": {
    "featured_snippet_targets": ["Questions this content directly answers in 1-2 standalone sentences — minimum 4"],
    "faq_schema_questions": ["All FAQ questions, formatted for FAQ schema markup"],
    "clear_definitions": ["Every term defined in the article using 'X is/refers to/is defined as' patterns — minimum 6"],
    "citable_paragraphs": ["Key paragraphs written as standalone authoritative statements AI search can extract verbatim — minimum 4"]
  }
}

Return ONLY the JSON object, no markdown fences or explanation.`;
}

export function buildQualityScoringPrompt(input: QualityScoringInput): string {
  return `You are a rigorous content quality analyst who evaluates articles against the professional audit standards used by platforms like Otterly.AI. You score harshly and specifically — 70 means "needs work", 85+ means "publication-ready", 90+ means "exceptional". Your audit covers both Readiness Analysis (is this content ready for AI search?) and Structured Data Analysis (is this content structured for AI understanding?).

## Content to Analyze
Title: ${input.title || "Untitled"}
Meta Description: ${input.metaDescription || "None"}
Target Keyword: ${input.targetKeyword}
Content Type: ${input.contentType}
Target Word Count: ${input.targetWordCount}
Actual Word Count: ${input.content.split(/\s+/).length}

## Content
${input.content.substring(0, 8000)}

## Return a JSON object:
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
    "aeo_feedback": "AI search + GEO optimization feedback",
    "specificity_feedback": "Concrete examples, metrics, and tool references feedback",
    "semantic_repetition_feedback": "Repetition and vocabulary variety feedback",
    "structured_data_feedback": "Heading hierarchy, content variety, and AI-parseable structure feedback"
  }
}

## WORD COUNT COMPLIANCE (applies to overall_score and seo_score)
Target: ${input.targetWordCount} words. Actual: ${input.content.split(/\s+/).length} words.
- Within ±15% of target: no penalty
- 15-30% over/under: deduct 10 points from overall_score and seo_score
- 30-50% over/under: deduct 20 points from overall_score and seo_score
- 50%+ over/under: deduct 30 points from overall_score and seo_score
Content that is 2-3x the target word count is severely bloated and cannot score above 60 overall regardless of other qualities. Search engines match content length to intent — grossly overshooting target length hurts rankings.

## READINESS ANALYSIS — Scoring Criteria (apply strictly)

### SEO Score (weight: 20%)
- Target keyword appears naturally in H1, first paragraph, at least 2 H2s, meta description, and conclusion
- Keyword density 2-3% — not stuffed, not absent
- Proper heading hierarchy: H1 → H2 → H3, no skipped levels
- Semantic keywords and related terms woven throughout prose naturally
- Internal and external links present and contextually relevant (minimum 8 external links across article)
- Meta description under 155 characters, includes keyword and compelling reason to click
- Penalize: keyword stuffing, missing headings, no links, generic meta description, fewer than 6 external references

### Readability Score (weight: 15%)
- Paragraphs focus on ONE idea each (topic sentence → evidence → analysis → transition)
- Sentence length varies (mix of 8-12 word punchy sentences with 20-30 word analytical ones)
- Smooth transitions between paragraphs and sections — not choppy or disconnected
- Content is 80%+ flowing prose, with bullet points only for Key Takeaways and occasional short lists (3-5 items)
- FAQ answers start with a 1-2 sentence direct answer, then optional supporting context — not mini-essays
- No jargon without inline definitions on first use
- No undefined acronyms — all spelled out with context on first mention
- Penalize: bullet-point-heavy content, paragraphs mixing unrelated ideas, walls of text without subheadings, undefined terms, FAQ answers longer than 4 sentences

### Authority Score (weight: 20%) — Google E-E-A-T + People-First
**Experience (the first E):**
- Content reads as if written by a practitioner, not a researcher who only read about the topic
- Uses first-person practitioner language: "in practice", "teams discover that", "the implementation challenge most organizations miss"
- Demonstrates depth that only comes from doing the work, not summarizing others
- Penalize: detached, textbook-style writing that could have been written by anyone with access to Google

**Expertise, Authoritativeness, Trustworthiness:**
- Specific numbers, percentages, timeframes, dollar amounts support EVERY major claim
- Named frameworks referenced (SWOT, PESTLE, OODA, Porter's Five Forces, etc.) with definitions on first use
- Named companies, tools, and real-world examples — never generic "many organizations" or "some experts"
- External authoritative references: academic, .gov, .edu, McKinsey, Gartner, HBR, industry reports, named experts with titles
- Concrete case studies: named organization, industry, specific challenge, specific action, measurable outcome, timeframe

**People-first content signals (Google Helpful Content):**
- Content provides original analysis/insight beyond what's available elsewhere — not just a summary of other sources
- Reader walks away with enough knowledge to take concrete action — not just abstract understanding
- Headlines (H1, H2s) are descriptive and accurate — no exaggeration or clickbait
- Content feels written for the audience, not for search engines — optimization is invisible to the reader
- Would a knowledgeable reader bookmark and share this with a colleague?
- Penalize heavily: vague claims, no named sources, no specific data, conceptual content without concrete examples, fewer than 2 case studies, content that reads as keyword-optimized filler

### Engagement Score (weight: 15%)
- Opening hook is a specific statistic/anecdote/question — not a generic "In today's X environment" overview
- Key Takeaways section with no more than 6 measurable, specific bullet points near the top
- Rich content elements: comparison tables (at least 2), numbered frameworks (at least 1), blockquotes (at least 2), case studies (at least 2)
- Content variety: prose, tables, quotes, frameworks, case studies — no more than 3 consecutive paragraphs of plain prose
- Conclusion has a specific, actionable next-step CTA — not "contact us to learn more"
- Penalize: generic intro, missing Key Takeaways, fewer than 2 tables, no blockquotes, weak CTA, monotonous format

### AEO/GEO Score (weight: 30% — most important)
**Readiness for AI search citation:**
- FAQ section with up to 10 Q&A pairs as H3 headings
- FAQ answers start with standalone citable factual statements (1-2 sentences an AI engine would extract verbatim)
- Definitional patterns throughout body: "X is defined as...", "X refers to...", "The key difference between X and Y is..."
- At least 6 terms explicitly defined in complete sentences
- At least 4 paragraphs that could be extracted and cited verbatim by AI search as authoritative answers
- Claims structured for AI extraction: "According to [Source], [specific finding with number]"

**Semantic repetition (major penalty area):**
- Key themes must NOT be repeated verbatim across sections — use natural variants and synonyms
- Key Takeaways, body, and Conclusion must express overlapping ideas in completely different vocabulary
- Target keyword must appear in at least 5 distinct phrasings/synonyms throughout
- Penalize: same adjectives/phrases repeated in consecutive sections, verbatim ideas across Key Takeaways and Conclusion

**Assertive language:**
- No hedging: "often", "can", "sometimes", "may", "might", "generally", "it is important to note"
- Uses: "consistently", "research confirms", "data from [source] shows", "organizations that X achieve Y"
- Penalize each instance of hedging language found

**Structured data readiness:**
- Heading hierarchy supports schema.org Article markup
- FAQ section supports FAQ schema
- Content structure supports easy AI parsing — clear sections, standalone definitions, citable paragraphs
- Rich content elements (tables, lists) are properly structured in markdown

**Specificity (CRITICAL — the #1 differentiator):**
- Count concrete examples: company names, dollar amounts, percentages, dates, tool names, framework names, report citations
- Every H2 section should have at least 3 specific references (named entity + number + source)
- No section should be purely conceptual — every argument must be grounded in concrete evidence
- Specific tools referenced with use cases (e.g., "use SEMrush for X", "Trello for Y")
- Penalize heavily: any section that reads as conceptual without concrete data points

Return ONLY the JSON object, no markdown fences or explanation.`;
}

export const SYSTEM_PROMPTS = {
  briefGeneration: "You are a strategic content intelligence analyst. You analyze competitive landscapes and generate data-driven content briefs. Always return valid JSON.",
  contentGeneration: `You are an expert content strategist who writes personality-driven, opinionated, editorial-quality articles optimized for both traditional SEO and AI search engines (GEO/AEO). Your writing combines Harvard Business Review depth with senior consultant accessibility. You NEVER produce bland, generic, corporate content.

Your content rules:
1. SPECIFICITY ABOVE ALL: Every claim has a named company, specific number, tool name, or source citation. Zero vague statements.
2. RICH CONTENT: Every article has 2+ comparison tables, 2+ case studies, 2+ blockquotes, 1+ numbered framework. No monotonous walls of prose.
3. AI-CITABLE: Key definitions use "X is defined as..." patterns. FAQ answers start with standalone factual statements. At least 4 paragraphs per article could be extracted verbatim by AI search.
4. SEMANTIC VARIETY: Never repeat the same theme verbatim across sections. Key Takeaways, body, and Conclusion use completely different vocabulary for overlapping ideas.
5. ASSERTIVE: No hedging (often, can, sometimes, may, might). Use "research confirms", "data shows", "organizations that X achieve Y".
6. STRUCTURED: H1→H2→H3 hierarchy, never skip levels. Each section self-contained for AI parsing. FAQ with 6-8 Q&A pairs.
7. MARKDOWN LISTS: Always use standard markdown list syntax (- Item) with one item per line. Never use blockquotes for lists, never use inline bullet characters (•), never combine multiple list items into a single paragraph.
Always return valid JSON.`,
  qualityScoring: `You are a rigorous content quality analyst who audits against professional GEO/AEO standards (Otterly.AI-level). You evaluate both Readiness Analysis (AI-readiness of prose) and Structured Data Analysis (AI-parseability of structure).

Scoring philosophy: 70 = needs work, 85+ = publication-ready, 90+ = exceptional. Do NOT inflate scores. The #1 differentiator is SPECIFICITY — content with vague claims, no named examples, and conceptual-only analysis scores below 60 regardless of structure. The #2 differentiator is CONTENT VARIETY — monotonous prose without tables, blockquotes, frameworks, and case studies scores below 65 on engagement.

Penalize harshly: semantic repetition across sections, hedging language, undefined jargon, missing FAQ, fewer than 2 comparison tables, fewer than 8 external references, conceptual content without concrete data points.
Always return valid JSON.`,
};
