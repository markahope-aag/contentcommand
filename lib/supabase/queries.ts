import { createClient } from "./server";
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

// ── Clients ──────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
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
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// ── Competitors ──────────────────────────────────────────

export async function getCompetitors(clientId: string): Promise<Competitor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("client_id", clientId)
    .order("competitive_strength", { ascending: false });

  if (error) throw error;
  return data;
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
  return data;
}

export async function deleteCompetitor(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  if (error) throw error;
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
}): Promise<ContentBrief[]> {
  const supabase = await createClient();
  let query = supabase
    .from("content_briefs")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priorityLevel) query = query.eq("priority_level", filters.priorityLevel);

  const { data, error } = await query;
  if (error) throw error;
  return data;
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
  return data;
}

export async function deleteContentBrief(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("content_briefs").delete().eq("id", id);
  if (error) throw error;
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
}): Promise<(GeneratedContent & { content_briefs: ContentBrief })[]> {
  const supabase = await createClient();
  let query = supabase
    .from("generated_content")
    .select("*, content_briefs(*)")
    .order("created_at", { ascending: false });

  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data as (GeneratedContent & { content_briefs: ContentBrief })[];
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
  return data;
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
  const supabase = await createClient();
  let query = supabase.from("ai_usage_tracking").select("*");
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) throw error;

  const records = data as AiUsageTracking[];
  const summary = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byProvider: {} as Record<string, { cost: number; calls: number }>,
    byOperation: {} as Record<string, { cost: number; calls: number }>,
  };

  for (const r of records) {
    summary.totalCost += Number(r.estimated_cost_usd);
    summary.totalInputTokens += r.input_tokens;
    summary.totalOutputTokens += r.output_tokens;

    if (!summary.byProvider[r.provider]) {
      summary.byProvider[r.provider] = { cost: 0, calls: 0 };
    }
    summary.byProvider[r.provider].cost += Number(r.estimated_cost_usd);
    summary.byProvider[r.provider].calls += 1;

    if (!summary.byOperation[r.operation]) {
      summary.byOperation[r.operation] = { cost: 0, calls: 0 };
    }
    summary.byOperation[r.operation].cost += Number(r.estimated_cost_usd);
    summary.byOperation[r.operation].calls += 1;
  }

  return summary;
}

// ── Pipeline Stats ──────────────────────────────────────

export async function getContentPipelineStats(clientId?: string): Promise<
  Record<string, number>
> {
  const supabase = await createClient();
  let query = supabase.from("content_briefs").select("status");
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) throw error;

  const stats: Record<string, number> = {};
  for (const row of data) {
    stats[row.status] = (stats[row.status] || 0) + 1;
  }
  return stats;
}

// ── Integration Health ──────────────────────────────────

export async function getIntegrationHealth(): Promise<IntegrationHealth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_health")
    .select("*")
    .order("provider");

  if (error) throw error;
  return data;
}

// ── API Request Logs ────────────────────────────────────

export async function getApiRequestLogs(
  provider?: string,
  limit = 50
): Promise<ApiRequestLog[]> {
  const supabase = await createClient();
  let query = supabase
    .from("api_request_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
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
