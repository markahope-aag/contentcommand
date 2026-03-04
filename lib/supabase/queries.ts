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
  ContentPage,
  ContentPageKeyword,
  ContentAuditSync,
  ContentAuditSummary,
  StrikingDistanceKeyword,
  CannibalizationGroup,
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
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin.from("generated_content").delete().eq("id", id);
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

const ALL_PROVIDERS = ["dataforseo", "frase", "google", "llmrefs", "spyfu"] as const;

export async function getIntegrationHealth(): Promise<IntegrationHealth[]> {
  return withCache("cc:integration-health:all", async () => {
    const supabase = await createClient();
    const [{ data, error }, { data: googleTokens }] = await Promise.all([
      supabase.from("integration_health").select("*").order("provider"),
      supabase.from("google_oauth_tokens").select("client_id").limit(1),
    ]);

    if (error) throw error;

    const byProvider = new Map((data || []).map((h) => [h.provider, h]));
    const googleConnected = (googleTokens || []).length > 0;

    return ALL_PROVIDERS.map((provider) => {
      const existing = byProvider.get(provider);
      if (existing) return existing;

      return {
        id: `default-${provider}`,
        provider,
        status: provider === "google" && googleConnected ? "healthy" : "unknown",
        last_success: null,
        last_failure: null,
        error_count: 0,
        avg_response_ms: null,
        metadata: null,
        updated_at: new Date().toISOString(),
      } as unknown as IntegrationHealth;
    });
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
    const rowData = row.data as Record<string, unknown>;

    // DataForSEO domain_intersection stores response as an array element.
    // The base `execute` unwraps tasks[0].result[0], but the result is stored
    // as { "0": { items: [...], target1, target2, ... } } when the raw response
    // was an array. Try: data["0"].items, data.items, then tasks path as fallback.
    let container: Record<string, unknown> = rowData;
    if (rowData?.["0"] && typeof rowData["0"] === "object") {
      container = rowData["0"] as Record<string, unknown>;
    }

    let items: unknown[] | undefined;
    if (Array.isArray(container?.items)) {
      items = container.items as unknown[];
    }
    // Fallback: tasks[0].result[0].items (in case execute didn't unwrap)
    if (!items) {
      const tasks = rowData?.tasks;
      if (Array.isArray(tasks) && tasks.length > 0) {
        const task = tasks[0] as Record<string, unknown>;
        const results = task?.result;
        if (Array.isArray(results) && results.length > 0) {
          const result = results[0] as Record<string, unknown>;
          if (Array.isArray(result?.items)) items = result.items as unknown[];
        }
      }
    }
    if (!items) continue;

    // target1 = client domain, target2 = competitor domain
    const competitorDomain = String(container?.target2 ?? "");

    for (const item of items) {
      const i = item as Record<string, unknown>;

      // DataForSEO domain_intersection item structure:
      //   keyword_data.keyword, keyword_data.keyword_info.search_volume
      //   first_domain_serp_element.rank_group  (client position)
      //   second_domain_serp_element.rank_group (competitor position)
      const kwData = i.keyword_data as Record<string, unknown> | undefined;
      const kwInfo = kwData?.keyword_info as Record<string, unknown> | undefined;
      const keyword = String(kwData?.keyword ?? i.keyword ?? "");
      if (!keyword) continue;

      const firstSerp = i.first_domain_serp_element as Record<string, unknown> | undefined;
      const secondSerp = i.second_domain_serp_element as Record<string, unknown> | undefined;

      gaps.push({
        keyword,
        client_position: firstSerp?.rank_group != null
          ? Number(firstSerp.rank_group)
          : i.client_position != null ? Number(i.client_position) : null,
        competitor_position: secondSerp?.rank_group != null
          ? Number(secondSerp.rank_group)
          : i.competitor_position != null ? Number(i.competitor_position) : null,
        competitor_domain: competitorDomain || String(i.competitor_domain ?? ""),
        competitor_id: row.competitor_id ?? "",
        search_volume: Number(kwInfo?.search_volume ?? i.search_volume ?? 0),
        difficulty: kwInfo?.competition != null
          ? Math.round(Number(kwInfo.competition) * 100)
          : Number(i.difficulty ?? 0),
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

  // Filter to gaps where competitor outranks the client
  const filtered = allGaps.filter((g) => {
    if (g.competitor_position == null) return false;
    if (g.client_position == null) return true;
    return g.competitor_position < g.client_position;
  });

  // Deduplicate by keyword — keep the entry with the best (lowest) competitor position
  const byKeyword = new Map<string, KeywordGapOpportunity>();
  for (const g of filtered) {
    const key = g.keyword.toLowerCase();
    const existing = byKeyword.get(key);
    if (!existing || (g.competitor_position ?? Infinity) < (existing.competitor_position ?? Infinity)) {
      byKeyword.set(key, g);
    }
  }

  return Array.from(byKeyword.values())
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, limit);
}

// ── Existing Content Audit ──────────────────────────────

export async function getContentAuditSummary(
  clientId: string
): Promise<ContentAuditSummary> {
  const cacheKey = `cc:content-audit-summary:${clientId}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_content_audit_summary", {
      p_client_id: clientId,
    });

    if (error) throw error;

    const raw = (data ?? {}) as ContentAuditSummary;
    return {
      total_pages: raw.total_pages ?? 0,
      total_clicks: raw.total_clicks ?? 0,
      total_impressions: raw.total_impressions ?? 0,
      avg_position: raw.avg_position ?? 0,
      avg_ctr: raw.avg_ctr ?? 0,
      decaying_count: raw.decaying_count ?? 0,
      thin_count: raw.thin_count ?? 0,
      opportunity_count: raw.opportunity_count ?? 0,
      active_count: raw.active_count ?? 0,
    };
  }, 300);
}

export async function getContentPages(
  clientId: string,
  options?: {
    status?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }
): Promise<PaginatedResult<ContentPage>> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sortBy = options?.sortBy ?? "clicks";
  const ascending = (options?.sortDir ?? "desc") === "asc";

  const supabase = await createClient();
  let query = supabase
    .from("content_pages")
    .select("*", { count: "exact" })
    .eq("client_id", clientId)
    .order(sortBy, { ascending })
    .range(from, to);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as ContentPage[], count: count ?? 0 };
}

export async function getDecayingPages(
  clientId: string
): Promise<ContentPage[]> {
  const cacheKey = `cc:decaying-pages:${clientId}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("content_pages")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "decaying")
      .order("clicks", { ascending: true })
      .limit(100);

    if (error) throw error;
    return (data ?? []) as ContentPage[];
  }, 300);
}

export async function getStrikingDistanceKeywords(
  clientId: string
): Promise<StrikingDistanceKeyword[]> {
  const cacheKey = `cc:striking-distance:${clientId}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("content_page_keywords")
      .select("*")
      .eq("client_id", clientId)
      .gte("position", 4)
      .lte("position", 20)
      .order("impressions", { ascending: false })
      .limit(200);

    if (error) throw error;

    return ((data ?? []) as ContentPageKeyword[]).map((kw) => ({
      keyword: kw.keyword,
      page_path: kw.page_path,
      position: kw.position,
      impressions: kw.impressions,
      clicks: kw.clicks,
      ctr: kw.ctr,
      prev_position: kw.prev_position,
    }));
  }, 300);
}

export async function getCannibalizationGroups(
  clientId: string
): Promise<CannibalizationGroup[]> {
  const cacheKey = `cc:cannibalization:${clientId}`;
  return withCache(cacheKey, async () => {
    const supabase = await createClient();
    // Get keywords that appear on multiple pages
    const { data, error } = await supabase
      .from("content_page_keywords")
      .select("keyword, page_path, position, clicks, impressions")
      .eq("client_id", clientId)
      .order("keyword")
      .order("position", { ascending: true });

    if (error) throw error;

    // Group by keyword, keep only those with 2+ pages
    const groups = new Map<
      string,
      { page_path: string; position: number; clicks: number; impressions: number }[]
    >();
    for (const row of data ?? []) {
      const existing = groups.get(row.keyword) ?? [];
      existing.push({
        page_path: row.page_path,
        position: row.position,
        clicks: row.clicks,
        impressions: row.impressions,
      });
      groups.set(row.keyword, existing);
    }

    const result: CannibalizationGroup[] = [];
    groups.forEach((pages, keyword) => {
      if (pages.length >= 2) {
        result.push({ keyword, pages });
      }
    });

    // Sort by number of competing pages descending
    return result.sort((a, b) => b.pages.length - a.pages.length).slice(0, 100);
  }, 300);
}

export async function getContentPageKeywords(
  clientId: string,
  pagePath: string
): Promise<ContentPageKeyword[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_page_keywords")
    .select("*")
    .eq("client_id", clientId)
    .eq("page_path", pagePath)
    .order("clicks", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContentPageKeyword[];
}

export async function getLatestContentAuditSync(
  clientId: string
): Promise<ContentAuditSync | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_audit_syncs")
    .select("*")
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as ContentAuditSync | null;
}

// ── Share Tokens ────────────────────────────────────────

export async function getContentByShareToken(token: string): Promise<GeneratedContent | null> {
  const { createAdminClient } = await import("./admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("generated_content")
    .select("*")
    .eq("share_token", token)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as GeneratedContent | null;
}

export async function createShareToken(contentId: string): Promise<string> {
  const { createAdminClient } = await import("./admin");
  const admin = createAdminClient();

  // Check if token already exists
  const { data: existing } = await admin
    .from("generated_content")
    .select("share_token")
    .eq("id", contentId)
    .single();

  // Return existing short token; replace old UUID-style tokens with short ones
  if (existing?.share_token && existing.share_token.length <= 12) {
    return existing.share_token;
  }

  // Short URL-friendly token (8 chars)
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const { error } = await admin
    .from("generated_content")
    .update({ share_token: token })
    .eq("id", contentId);

  if (error) throw error;
  return token;
}
