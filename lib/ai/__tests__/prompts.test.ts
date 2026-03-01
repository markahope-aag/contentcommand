// @ts-nocheck
import {
  buildBriefGenerationPrompt,
  buildContentGenerationPrompt,
  buildQualityScoringPrompt,
  SYSTEM_PROMPTS,
} from "@/lib/ai/prompts";

describe("buildBriefGenerationPrompt", () => {
  const baseInput = {
    clientName: "Acme Corp",
    clientDomain: "acme.com",
    industry: "SaaS",
    targetKeyword: "content marketing automation",
    brandVoice: null,
    targetKeywords: null,
    competitiveData: [],
    citationData: [],
  };

  it("includes client name and domain in output", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("acme.com");
  });

  it("includes industry when provided", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).toContain("SaaS");
  });

  it("shows Not specified when industry is null", () => {
    const prompt = buildBriefGenerationPrompt({ ...baseInput, industry: null });
    expect(prompt).toContain("Not specified");
  });

  it("includes target keyword", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).toContain("content marketing automation");
  });

  it("shows no competitive data message when array is empty", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).toContain("No competitive data available yet.");
  });

  it("includes competitive data when provided", () => {
    const input = {
      ...baseInput,
      competitiveData: [{ domain: "competitor.com", score: 85 }],
    };
    const prompt = buildBriefGenerationPrompt(input);
    expect(prompt).toContain("competitor.com");
  });

  it("shows no citation data message when array is empty", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).toContain("No AI citation data available yet.");
  });

  it("includes citation data when provided", () => {
    const input = {
      ...baseInput,
      citationData: [{ platform: "ChatGPT", mentions: 5 }],
    };
    const prompt = buildBriefGenerationPrompt(input);
    expect(prompt).toContain("ChatGPT");
  });

  it("includes brand voice when provided", () => {
    const input = {
      ...baseInput,
      brandVoice: { tone: "professional", style: "concise" },
    };
    const prompt = buildBriefGenerationPrompt(input);
    expect(prompt).toContain("Brand Voice Profile");
    expect(prompt).toContain("professional");
  });

  it("omits brand voice section when null", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).not.toContain("Brand Voice Profile");
  });

  it("includes existing keywords when provided", () => {
    const input = {
      ...baseInput,
      targetKeywords: ["SEO tools", "content strategy"],
    };
    const prompt = buildBriefGenerationPrompt(input);
    expect(prompt).toContain("SEO tools");
    expect(prompt).toContain("content strategy");
  });

  it("uses blog_post as default content type", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).toContain("blog_post");
  });

  it("uses provided content type", () => {
    const prompt = buildBriefGenerationPrompt({ ...baseInput, contentType: "case_study" });
    expect(prompt).toContain("case_study");
  });

  it("returns a string containing JSON format instructions", () => {
    const prompt = buildBriefGenerationPrompt(baseInput);
    expect(prompt).toContain("JSON object");
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"priority_level"');
  });
});

describe("buildContentGenerationPrompt", () => {
  const baseInput = {
    briefTitle: "The Ultimate Guide to Content Marketing",
    targetKeyword: "content marketing",
    contentType: "blog_post",
    targetWordCount: 2000,
    targetAudience: "Marketing managers",
    uniqueAngle: "Data-driven approach",
    competitiveGap: "Missing actionable templates",
    requiredSections: null,
    semanticKeywords: null,
    internalLinks: null,
    authoritySignals: null,
    controversialPositions: null,
    brandVoice: null,
    serpContentAnalysis: null,
  };

  it("includes brief title", () => {
    const prompt = buildContentGenerationPrompt(baseInput);
    expect(prompt).toContain("The Ultimate Guide to Content Marketing");
  });

  it("includes target keyword", () => {
    const prompt = buildContentGenerationPrompt(baseInput);
    expect(prompt).toContain("content marketing");
  });

  it("includes target word count", () => {
    const prompt = buildContentGenerationPrompt(baseInput);
    expect(prompt).toContain("2000");
  });

  it("includes target audience when provided", () => {
    const prompt = buildContentGenerationPrompt(baseInput);
    expect(prompt).toContain("Marketing managers");
  });

  it("shows General audience when target audience is null", () => {
    const prompt = buildContentGenerationPrompt({ ...baseInput, targetAudience: null });
    expect(prompt).toContain("General audience");
  });

  it("includes required sections when provided", () => {
    const input = {
      ...baseInput,
      requiredSections: ["Introduction", "Key Benefits", "Case Studies"],
    };
    const prompt = buildContentGenerationPrompt(input);
    expect(prompt).toContain("Introduction");
    expect(prompt).toContain("Key Benefits");
    expect(prompt).toContain("Required Sections");
  });

  it("includes semantic keywords when provided", () => {
    const input = {
      ...baseInput,
      semanticKeywords: ["SEO strategy", "digital marketing"],
    };
    const prompt = buildContentGenerationPrompt(input);
    expect(prompt).toContain("SEO strategy");
    expect(prompt).toContain("digital marketing");
  });

  it("includes internal links when provided", () => {
    const input = {
      ...baseInput,
      internalLinks: ["/blog/seo-guide", "/blog/content-strategy"],
    };
    const prompt = buildContentGenerationPrompt(input);
    expect(prompt).toContain("/blog/seo-guide");
  });

  it("includes brand voice when provided", () => {
    const input = { ...baseInput, brandVoice: { tone: "friendly" } };
    const prompt = buildContentGenerationPrompt(input);
    expect(prompt).toContain("Brand Voice");
    expect(prompt).toContain("friendly");
  });

  it("includes authority signals", () => {
    const input = { ...baseInput, authoritySignals: "Cite peer-reviewed studies" };
    const prompt = buildContentGenerationPrompt(input);
    expect(prompt).toContain("Cite peer-reviewed studies");
  });

  it("falls back to default E-E-A-T message when authority signals null", () => {
    const prompt = buildContentGenerationPrompt(baseInput);
    expect(prompt).toContain("E-E-A-T");
  });

  it("returns JSON format instructions", () => {
    const prompt = buildContentGenerationPrompt(baseInput);
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"content"');
    expect(prompt).toContain('"meta_description"');
  });
});

describe("buildQualityScoringPrompt", () => {
  const baseInput = {
    content: "This is a sample article about content marketing strategies. ".repeat(50),
    targetKeyword: "content marketing",
    contentType: "blog_post",
    targetWordCount: 1500,
    title: "Content Marketing Guide",
    metaDescription: "Learn content marketing strategies in this guide.",
  };

  it("includes title in prompt", () => {
    const prompt = buildQualityScoringPrompt(baseInput);
    expect(prompt).toContain("Content Marketing Guide");
  });

  it("shows Untitled when title is null", () => {
    const prompt = buildQualityScoringPrompt({ ...baseInput, title: null });
    expect(prompt).toContain("Untitled");
  });

  it("includes target keyword", () => {
    const prompt = buildQualityScoringPrompt(baseInput);
    expect(prompt).toContain("content marketing");
  });

  it("includes content type", () => {
    const prompt = buildQualityScoringPrompt(baseInput);
    expect(prompt).toContain("blog_post");
  });

  it("includes target word count", () => {
    const prompt = buildQualityScoringPrompt(baseInput);
    expect(prompt).toContain("1500");
  });

  it("includes calculated actual word count", () => {
    const content = "word ".repeat(200).trim();
    const prompt = buildQualityScoringPrompt({ ...baseInput, content });
    expect(prompt).toContain("200");
  });

  it("shows None when meta description is null", () => {
    const prompt = buildQualityScoringPrompt({ ...baseInput, metaDescription: null });
    expect(prompt).toContain("None");
  });

  it("truncates content to 8000 chars", () => {
    const longContent = "x".repeat(10000);
    const prompt = buildQualityScoringPrompt({ ...baseInput, content: longContent });
    // Prompt should contain truncated version
    expect(prompt).toContain("x".repeat(100));
    // Should not contain beyond 8000 chars of content
    const contentStart = prompt.indexOf("## Content\n") + "## Content\n".length;
    const contentPart = prompt.substring(contentStart, contentStart + 8100);
    expect(contentPart.length).toBeLessThanOrEqual(8100);
  });

  it("returns JSON scoring format instructions", () => {
    const prompt = buildQualityScoringPrompt(baseInput);
    expect(prompt).toContain('"overall_score"');
    expect(prompt).toContain('"seo_score"');
    expect(prompt).toContain('"readability_score"');
    expect(prompt).toContain('"authority_score"');
  });
});

describe("SYSTEM_PROMPTS", () => {
  it("has briefGeneration prompt", () => {
    expect(SYSTEM_PROMPTS.briefGeneration).toBeTruthy();
    expect(typeof SYSTEM_PROMPTS.briefGeneration).toBe("string");
  });

  it("has contentGeneration prompt", () => {
    expect(SYSTEM_PROMPTS.contentGeneration).toBeTruthy();
    expect(typeof SYSTEM_PROMPTS.contentGeneration).toBe("string");
  });

  it("has qualityScoring prompt", () => {
    expect(SYSTEM_PROMPTS.qualityScoring).toBeTruthy();
    expect(typeof SYSTEM_PROMPTS.qualityScoring).toBe("string");
  });

  it("all prompts mention JSON output requirement", () => {
    expect(SYSTEM_PROMPTS.briefGeneration).toContain("JSON");
    expect(SYSTEM_PROMPTS.contentGeneration).toContain("JSON");
    expect(SYSTEM_PROMPTS.qualityScoring).toContain("JSON");
  });
});
