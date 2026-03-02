import { createClient } from "./server";
import { withCache, invalidateCache } from "@/lib/cache";
import type {
  Client,
  ClientInsert,
  ClientUpdate,
  Competitor,
  CompetitorInsert,
  CompetitorUpdate,
  ContentBrief,
  ContentBriefInsert,
  ContentBriefUpdate,
  GeneratedContent,
  GeneratedContentUpdate,
  ContentQualityAnalysis,
  AiUsageTracking,
  IntegrationHealth,
  ApiRequestLog,
  CompetitiveAnalysis,
  AiCitation,
  Organization,
  OrganizationMember,
  CompetitiveMetricsHistory,
  CompetitiveSummary,
  KeywordGapOpportunity,
} from "@/types/database";

// ── Organizations ───────────────────────────────────────────

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createOrganization(name: string, slug: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_org_with_owner", {
    org_name: name,
    org_slug: slug,
  });

  if (error) throw error;
  return data;
}

export async function updateOrganization(
  id: string,
  updates: { name?: string; slug?: string }
): Promise<Organization> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function addOrganizationMember(
  orgId: string,
  userId: string,
  role: "owner" | "admin" | "member" = "member"
): Promise<OrganizationMember> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .insert({ org_id: orgId, user_id: userId, role })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeOrganizationMember(orgId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) throw error;
}

// ── Pagination helper type ───────────────────────────────

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

// ── Clients ──────────────────────────────────────────────

export async function getClients(
  pagination?: PaginationOptions
): Promise<PaginatedResult<Client>> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const cacheKey = `cc:clients:p${page}:s${pageSize}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error, count } = await supabase
      .from("clients")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }, 300);
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createClientWithOwner(
  client: ClientInsert,
  orgId?: string
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_client_with_owner", {
    client_name: client.name,
    client_domain: client.domain,
    client_industry: client.industry,
    client_target_keywords: client.target_keywords,
    client_brand_voice: client.brand_voice,
    p_org_id: orgId || null,
  });

  if (error) throw error;
  await invalidateCache("cc:clients:all");
  return data;
}

export async function updateClient(
  id: string,
  updates: ClientUpdate
): Promise<Client> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  await invalidateCache("cc:clients:all");
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
  await invalidateCache("cc:clients:all");
}

// ── Competitors ──────────────────────────────────────────

export async function getCompetitors(
  clientId: string,
  pagination?: PaginationOptions
): Promise<PaginatedResult<Competitor>> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const cacheKey = `cc:competitors:${clientId}:p${page}:s${pageSize}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error, count } = await supabase
      .from("competitors")
      .select("*", { count: "exact" })
      .eq("client_id", clientId)
      .order("competitive_strength", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }, 300);
}

export async function createCompetitor(
  competitor: CompetitorInsert
): Promise<Competitor> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitors")
    .insert(competitor)
    .select()
    .single();

  if (error) throw error;
  await invalidateCache(`cc:competitors:${competitor.client_id}`);
  return data;
}

export async function updateCompetitor(
  id: string,
  updates: CompetitorUpdate
): Promise<Competitor> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  await invalidateCache(`cc:competitors:${data.client_id}`);
  return data;
}

export async function deleteCompetitor(id: string, clientId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  if (error) throw error;
  await invalidateCache(`cc:competitors:${clientId}`);
}

// ── Content Briefs ───────────────────────────────────────

export async function getContentBrief(id: string): Promise<ContentBrief | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllContentBriefs(filters?: {
  clientId?: string;
  status?: string;
  priorityLevel?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<ContentBrief>> {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const hasFilters = filters?.clientId || filters?.status || filters?.priorityLevel;
  const fetcher = async () => {
    const supabase = await createClient();
    let query = supabase
      .from("content_briefs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.clientId) query = query.eq("client_id", filters.clientId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.priorityLevel) query = query.eq("priority_level", filters.priorityLevel);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  };

  // Only cache the no-filter variant
  if (hasFilters) return fetcher();
  return withCache(`cc:briefs:all:p${page}:s${pageSize}`, fetcher, 60);
}

export async function getContentBriefs(
  clientId: string
): Promise<ContentBrief[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createContentBrief(brief: ContentBriefInsert): Promise<ContentBrief> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_briefs")
    .insert(brief)
    .select()
    .single();

  if (error) throw error;
  await invalidateCache("cc:briefs:all", "cc:pipeline-stats:*", "cc:content-queue:all");
  return data;
}

export async function updateContentBrief(
  id: string,
  updates: ContentBriefUpdate
): Promise<ContentBrief> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_briefs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  await invalidateCache("cc:briefs:all", "cc:pipeline-stats:*", "cc:content-queue:all");
  return data;
}

export async function deleteContentBrief(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("content_briefs").delete().eq("id", id);
  if (error) throw error;
  await invalidateCache("cc:briefs:all", "cc:pipeline-stats:*", "cc:content-queue:all");
}

// ── Generated Content ───────────────────────────────────

export async function getGeneratedContent(id: string): Promise<GeneratedContent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getGeneratedContentByBrief(briefId: string): Promise<GeneratedContent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getGeneratedContentByClient(clientId: string): Promise<GeneratedContent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getContentQueue(filters?: {
  clientId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<GeneratedContent & { content_briefs: ContentBrief }>> {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const hasFilters = filters?.clientId || filters?.status;
  const fetcher = async () => {
    const supabase = await createClient();
    let query = supabase
      .from("generated_content")
      .select("*, content_briefs(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.clientId) query = query.eq("client_id", filters.clientId);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: (data ?? []) as (GeneratedContent & { content_briefs: ContentBrief })[],
      count: count ?? 0,
    };
  };

  // Only cache the no-filter variant
  if (hasFilters) return fetcher();
  return withCache(`cc:content-queue:all:p${page}:s${pageSize}`, fetcher, 60);
}

export async function updateGeneratedContent(
  id: string,
  updates: GeneratedContentUpdate
): Promise<GeneratedContent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_content")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  await invalidateCache("cc:content-queue:all", "cc:pipeline-stats:*");
  return data;
}

export async function deleteGeneratedContent(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("generated_content").delete().eq("id", id);
  if (error) throw error;
  await invalidateCache("cc:content-queue:all", "cc:pipeline-stats:*");
}

// ── Quality Analysis ────────────────────────────────────

export async function getQualityAnalysis(contentId: string): Promise<ContentQualityAnalysis | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_quality_analysis")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// ── AI Usage Tracking ───────────────────────────────────

export async function getAiUsageByClient(clientId: string): Promise<AiUsageTracking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_usage_tracking")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function getAiUsageSummary(clientId?: string): Promise<{
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: Record<string, { cost: number; calls: number }>;
  byOperation: Record<string, { cost: number; calls: number }>;
}> {
  const cacheKey = clientId ? `cc:ai-usage:${clientId}` : "cc:ai-usage:global";
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_ai_usage_summary", {
      p_client_id: clientId || null,
    });

    if (error) throw error;

    const rows = (data || []) as {
      total_cost: number;
      total_input_tokens: number;
      total_output_tokens: number;
      provider: string;
      operation: string;
      group_cost: number;
      group_calls: number;
    }[];

    const summary = {
      totalCost: rows.length > 0 ? Number(rows[0].total_cost) : 0,
      totalInputTokens: rows.length > 0 ? Number(rows[0].total_input_tokens) : 0,
      totalOutputTokens: rows.length > 0 ? Number(rows[0].total_output_tokens) : 0,
      byProvider: {} as Record<string, { cost: number; calls: number }>,
      byOperation: {} as Record<string, { cost: number; calls: number }>,
    };

    for (const r of rows) {
      if (!summary.byProvider[r.provider]) {
        summary.byProvider[r.provider] = { cost: 0, calls: 0 };
      }
      summary.byProvider[r.provider].cost += Number(r.group_cost);
      summary.byProvider[r.provider].calls += Number(r.group_calls);

      if (!summary.byOperation[r.operation]) {
        summary.byOperation[r.operation] = { cost: 0, calls: 0 };
      }
      summary.byOperation[r.operation].cost += Number(r.group_cost);
      summary.byOperation[r.operation].calls += Number(r.group_calls);
    }

    return summary;
  }, 300);
}

// ── Pipeline Stats ──────────────────────────────────────

export async function getContentPipelineStats(clientId?: string): Promise<
  Record<string, number>
> {
  const cacheKey = clientId ? `cc:pipeline-stats:${clientId}` : "cc:pipeline-stats:global";
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_pipeline_stats", {
      p_client_id: clientId || null,
    });

    if (error) throw error;

    const stats: Record<string, number> = {};
    for (const row of (data || []) as { status: string; count: number }[]) {
      stats[row.status] = Number(row.count);
    }
    return stats;
  }, 60);
}

// ── Integration Health ──────────────────────────────────

export async function getIntegrationHealth(): Promise<IntegrationHealth[]> {
  return withCache("cc:integration-health:all", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integration_health")
      .select("*")
      .order("provider");

    if (error) throw error;
    return data;
  }, 900);
}

// ── API Request Logs ────────────────────────────────────

export async function getApiRequestLogs(
  provider?: string,
  pagination?: PaginationOptions
): Promise<PaginatedResult<ApiRequestLog>> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const fetcher = async () => {
    const supabase = await createClient();
    let query = supabase
      .from("api_request_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  };

  if (provider || page !== 1 || pageSize !== 50) return fetcher();
  return withCache("cc:api-logs:all", fetcher, 900);
}

// ── Google OAuth Status ─────────────────────────────────

export async function getGoogleOAuthStatus(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .select("client_id");

  if (error) throw error;
  return data.map((row) => row.client_id);
}

// ── Competitive Analysis ────────────────────────────────

export async function getCompetitiveAnalysis(
  clientId: string
): Promise<CompetitiveAnalysis[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitive_analysis")
    .select("*")
    .eq("client_id", clientId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// ── AI Citations ────────────────────────────────────────

export async function getAiCitations(clientId: string): Promise<AiCitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_citations")
    .select("*")
    .eq("client_id", clientId)
    .order("tracked_at", { ascending: false });

  if (error) throw error;
  return data;
}

// ── Competitive Intelligence (Stage 4) ──────────────────

export async function getCompetitiveSummary(
  clientId: string
): Promise<CompetitiveSummary> {
  const cacheKey = `cc:competitive-summary:${clientId}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_competitive_summary", {
      p_client_id: clientId,
    });

    if (error) throw error;

    const raw = data as CompetitiveSummary | null;
    return {
      competitor_count: raw?.competitor_count ?? 0,
      avg_strength: raw?.avg_strength ?? 0,
      organic_traffic: raw?.organic_traffic ?? 0,
      keyword_gap_count: raw?.keyword_gap_count ?? 0,
      citation_sov: raw?.citation_sov ?? 0,
      last_analysis_at: raw?.last_analysis_at ?? null,
    };
  }, 300);
}

export async function getCompetitiveMetricsHistory(
  clientId: string,
  metricType?: string,
  days = 30
): Promise<CompetitiveMetricsHistory[]> {
  const cacheKey = `cc:competitive-history:${clientId}:${metricType ?? "all"}:${days}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = supabase
      .from("competitive_metrics_history")
      .select("*")
      .eq("client_id", clientId)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });

    if (metricType) query = query.eq("metric_type", metricType);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }, 300);
}

export async function getKeywordGaps(
  clientId: string,
  competitorId?: string
): Promise<KeywordGapOpportunity[]> {
  const supabase = await createClient();
  let query = supabase
    .from("competitive_analysis")
    .select("*")
    .eq("client_id", clientId)
    .eq("analysis_type", "keyword_gap")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (competitorId) query = query.eq("competitor_id", competitorId);

  const { data, error } = await query;
  if (error) throw error;

  // Parse JSONB keyword_gap data into KeywordGapOpportunity[]
  const gaps: KeywordGapOpportunity[] = [];
  for (const row of data) {
    const items = (row.data as Record<string, unknown>)?.items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const i = item as Record<string, unknown>;
      gaps.push({
        keyword: String(i.keyword ?? ""),
        client_position: i.client_position != null ? Number(i.client_position) : null,
        competitor_position: i.competitor_position != null ? Number(i.competitor_position) : null,
        competitor_domain: String(i.competitor_domain ?? row.data?.competitor_domain ?? ""),
        competitor_id: row.competitor_id ?? "",
        search_volume: Number(i.search_volume ?? 0),
        difficulty: Number(i.difficulty ?? 0),
      });
    }
  }
  return gaps;
}

export async function getTopOpportunities(
  clientId: string,
  limit = 20
): Promise<KeywordGapOpportunity[]> {
  const allGaps = await getKeywordGaps(clientId);
  // Filter to gaps where competitor ranks but client doesn't (or ranks much lower)
  return allGaps
    .filter(
      (g) =>
        g.competitor_position != null &&
        g.competitor_position <= 20 &&
        (g.client_position == null || g.client_position > 20)
    )
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, limit);
}
