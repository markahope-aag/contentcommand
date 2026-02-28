import { z } from "zod";
import { NextResponse } from "next/server";
import {
  sanitizeStringMax,
  sanitizeDomain,
  sanitizeSlug,
  sanitizeStringArray,
} from "@/lib/sanitize";

// ── Sanitized primitives ────────────────────────────────

const clientId = z.string().uuid("Invalid clientId");

/** Free-text string: trimmed, HTML-stripped, max 500 chars */
const text = z.string().transform((s) => sanitizeStringMax(s, 500));

/** Short text: trimmed, HTML-stripped, max 200 chars */
const shortText = z.string().transform((s) => sanitizeStringMax(s, 200));

/** Domain field: normalized (lowercase, no protocol/path) */
const domain = z.string().min(1, "domain is required").transform(sanitizeDomain);

/** Keyword/query field: trimmed, HTML-stripped, max 200 chars */
const keyword = z.string().min(1).transform((s) => sanitizeStringMax(s, 200));

/** Trimmed non-empty string (for IDs and enum-like values) */
const trimmedId = z.string().min(1).transform((s) => s.trim());

/** Array of sanitized strings */
const stringArray = z.array(z.string()).transform(sanitizeStringArray);

// ── DataForSEO Competitors ─────────────────────────────

const dataforseoBase = z.object({
  clientId,
  domain,
});

export const dataforseoKeywordsSchema = dataforseoBase.extend({
  type: z.literal("keywords"),
  competitorDomain: z.string().min(1, "competitorDomain is required for keyword analysis").transform(sanitizeDomain),
});

export const dataforseoDomainMetricsSchema = dataforseoBase.extend({
  type: z.literal("domain_metrics"),
});

export const dataforseoSerpSchema = dataforseoBase.extend({
  type: z.literal("serp"),
  keyword: keyword.pipe(z.string().min(1, "keyword is required for SERP analysis")),
});

export const dataforseoSchema = z.discriminatedUnion("type", [
  dataforseoKeywordsSchema,
  dataforseoDomainMetricsSchema,
  dataforseoSerpSchema,
]);

// ── Frase Content Analysis ──────────────────────────────

const fraseBase = z.object({ clientId });

export const fraseSerpSchema = fraseBase.extend({
  type: z.literal("serp"),
  query: keyword.pipe(z.string().min(1, "query is required for SERP analysis")),
});

export const fraseUrlSchema = fraseBase.extend({
  type: z.literal("url"),
  url: z.string().url("url must be a valid URL").transform((s) => s.trim()),
});

export const fraseSemanticSchema = fraseBase.extend({
  type: z.literal("semantic"),
  keyword: keyword.pipe(z.string().min(1, "keyword is required for semantic analysis")),
});

export const fraseSchema = z.discriminatedUnion("type", [
  fraseSerpSchema,
  fraseUrlSchema,
  fraseSemanticSchema,
]);

// ── LLMrefs ─────────────────────────────────────────────

const llmrefsBase = z.object({
  clientId: clientId.optional(),
});

export const llmrefsOrgsSchema = llmrefsBase.extend({
  type: z.literal("organizations"),
});

export const llmrefsProjectsSchema = llmrefsBase.extend({
  type: z.literal("projects"),
  organizationId: trimmedId,
});

export const llmrefsKeywordsSchema = llmrefsBase.extend({
  type: z.literal("keywords"),
  organizationId: trimmedId,
  projectId: trimmedId,
});

export const llmrefsKeywordDetailSchema = llmrefsBase.extend({
  type: z.literal("keyword_detail"),
  organizationId: trimmedId,
  projectId: trimmedId,
  keywordId: trimmedId,
  searchEngines: z.array(z.string().transform((s) => s.trim())).optional(),
});

export const llmrefsSearchEnginesSchema = llmrefsBase.extend({
  type: z.literal("search_engines"),
});

export const llmrefsLocationsSchema = llmrefsBase.extend({
  type: z.literal("locations"),
});

export const llmrefsSchema = z.discriminatedUnion("type", [
  llmrefsOrgsSchema,
  llmrefsProjectsSchema,
  llmrefsKeywordsSchema,
  llmrefsKeywordDetailSchema,
  llmrefsSearchEnginesSchema,
  llmrefsLocationsSchema,
]);

// ── Sync ────────────────────────────────────────────────

const syncBase = z.object({
  clientId,
  provider: z.enum(["dataforseo", "frase", "llmrefs"]),
});

export const syncDataforseoSchema = syncBase.extend({
  provider: z.literal("dataforseo"),
});

export const syncFraseSchema = syncBase.extend({
  provider: z.literal("frase"),
});

export const syncLlmrefsSchema = syncBase.extend({
  provider: z.literal("llmrefs"),
  organizationId: trimmedId.pipe(z.string().min(1, "organizationId is required for LLMrefs sync")),
  projectId: trimmedId.pipe(z.string().min(1, "projectId is required for LLMrefs sync")),
});

export const syncSchema = z.discriminatedUnion("provider", [
  syncDataforseoSchema,
  syncFraseSchema,
  syncLlmrefsSchema,
]);

// ── Content: Brief Generation ───────────────────────────

export const briefGenerateSchema = z.object({
  clientId,
  targetKeyword: keyword.pipe(z.string().min(1, "targetKeyword is required")),
  contentType: shortText.optional(),
});

// ── Content: Brief Update ───────────────────────────────

export const briefUpdateSchema = z.object({
  title: shortText.pipe(z.string().min(1)).optional(),
  target_keyword: keyword.pipe(z.string().min(1)).optional(),
  target_audience: text.nullable().optional(),
  content_type: shortText.optional(),
  status: z.string().trim().optional(),
  target_word_count: z.number().int().positive().optional(),
  required_sections: stringArray.nullable().optional(),
  semantic_keywords: stringArray.nullable().optional(),
  internal_links: z.array(z.string().transform((s) => s.trim())).nullable().optional(),
  priority_level: z.enum(["high", "medium", "low"]).optional(),
  unique_angle: text.nullable().optional(),
  competitive_gap: text.nullable().optional(),
  ai_citation_opportunity: text.nullable().optional(),
  serp_content_analysis: text.nullable().optional(),
  authority_signals: text.nullable().optional(),
  controversial_positions: text.nullable().optional(),
  client_voice_profile: z.record(z.string(), z.unknown()).nullable().optional(),
  content_requirements: z.record(z.string(), z.unknown()).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

// ── Content: Generate ───────────────────────────────────

export const contentGenerateSchema = z.object({
  briefId: z.string().uuid("Invalid briefId"),
  model: z.enum(["claude", "openai"]).optional(),
});

// ── Content: Score ──────────────────────────────────────

export const contentScoreSchema = z.object({
  contentId: z.string().uuid("Invalid contentId"),
});

// ── Content: Review ─────────────────────────────────────

export const contentReviewSchema = z.object({
  action: z.enum(["approve", "revision"], {
    error: "action must be 'approve' or 'revision'",
  }),
  reviewerNotes: text.optional(),
  revisionRequests: stringArray.optional(),
  reviewTimeMinutes: z.number().positive().optional(),
});

// ── Organizations ───────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(1, "name is required").transform((s) => sanitizeStringMax(s, 100)),
  slug: z.string().min(1, "slug is required").transform(sanitizeSlug).pipe(
    z.string().min(1, "slug is required after sanitization").regex(
      /^[a-z0-9-]+$/,
      "slug must contain only lowercase letters, numbers, and hyphens"
    )
  ),
});

// ── Organization Members ────────────────────────────────

export const addOrgMemberSchema = z.object({
  userId: z.string().uuid("Invalid userId"),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

// ── Validation helper ───────────────────────────────────

export function validateBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((i) => i.message);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
