import { createClient } from "./server";
import type {
  Client,
  ClientInsert,
  ClientUpdate,
  Competitor,
  CompetitorInsert,
  CompetitorUpdate,
  ContentBrief,
  IntegrationHealth,
  ApiRequestLog,
  CompetitiveAnalysis,
  AiCitation,
} from "@/types/database";

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
  client: ClientInsert
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_client_with_owner", {
    client_name: client.name,
    client_domain: client.domain,
    client_industry: client.industry,
    client_target_keywords: client.target_keywords,
    client_brand_voice: client.brand_voice,
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
