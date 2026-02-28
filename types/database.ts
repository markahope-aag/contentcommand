export interface Client {
  id: string;
  name: string;
  domain: string;
  industry: string | null;
  target_keywords: string[] | null;
  brand_voice: Record<string, unknown> | null;
  created_at: string;
}

export interface Competitor {
  id: string;
  client_id: string;
  domain: string;
  name: string;
  competitive_strength: number;
  created_at: string;
}

export interface ContentBrief {
  id: string;
  client_id: string;
  title: string;
  target_keyword: string;
  competitive_gap: string | null;
  unique_angle: string | null;
  ai_citation_opportunity: string | null;
  status: string;
  content_requirements: Record<string, unknown> | null;
  created_at: string;
}

export interface GeneratedContent {
  id: string;
  brief_id: string;
  content: string | null;
  quality_score: number | null;
  seo_optimizations: Record<string, unknown> | null;
  ai_citations_ready: boolean;
  word_count: number | null;
  status: string;
  created_at: string;
}

export interface PerformanceTracking {
  id: string;
  content_id: string;
  platform: string | null;
  metric_type: string | null;
  metric_value: Record<string, unknown> | null;
  tracked_at: string;
}

export interface ApiIntegration {
  id: string;
  client_id: string;
  provider: string;
  credentials: Record<string, unknown> | null;
  status: string;
  last_sync: string | null;
  created_at: string;
}

export interface UserClient {
  id: string;
  user_id: string;
  client_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export type ClientInsert = Omit<Client, "id" | "created_at">;
export type ClientUpdate = Partial<ClientInsert>;

export type CompetitorInsert = Omit<Competitor, "id" | "created_at">;
export type CompetitorUpdate = Partial<Omit<CompetitorInsert, "client_id">>;

export type ContentBriefInsert = Omit<ContentBrief, "id" | "created_at">;
export type ContentBriefUpdate = Partial<Omit<ContentBriefInsert, "client_id">>;

// ── Stage 2: API Integration Layer ──────────────────────

export interface ApiRequestLog {
  id: string;
  client_id: string | null;
  provider: string;
  endpoint: string;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  request_metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ApiRequestLogInsert = Omit<ApiRequestLog, "id" | "created_at">;

export interface CompetitiveAnalysis {
  id: string;
  client_id: string;
  competitor_id: string | null;
  analysis_type: "keyword_gap" | "domain_metrics" | "serp_overlap";
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export type CompetitiveAnalysisInsert = Omit<CompetitiveAnalysis, "id" | "created_at">;
export type CompetitiveAnalysisUpdate = Partial<Omit<CompetitiveAnalysisInsert, "client_id">>;

export interface AiCitation {
  id: string;
  client_id: string;
  platform: string;
  query: string;
  cited: boolean;
  share_of_voice: number | null;
  citation_url: string | null;
  citation_context: string | null;
  data: Record<string, unknown> | null;
  tracked_at: string;
}

export type AiCitationInsert = Omit<AiCitation, "id" | "tracked_at">;

export interface IntegrationHealth {
  id: string;
  provider: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  last_success: string | null;
  last_failure: string | null;
  error_count: number;
  avg_response_ms: number | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
}

export type IntegrationHealthUpdate = Partial<Omit<IntegrationHealth, "id">>;

export interface GoogleOAuthToken {
  id: string;
  client_id: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string;
  token_expiry: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export type GoogleOAuthTokenInsert = Omit<GoogleOAuthToken, "id" | "created_at" | "updated_at">;
export type GoogleOAuthTokenUpdate = Partial<Omit<GoogleOAuthTokenInsert, "client_id">>;
