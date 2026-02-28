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
