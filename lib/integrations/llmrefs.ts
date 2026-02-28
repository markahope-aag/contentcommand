import { LLMrefs } from "llmrefs";
import { getCached, setCache, getRateLimiter } from "./redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { RateLimitError } from "./base";
import type { ApiRequestLogInsert } from "@/types/database";

const CACHE_TTLS = {
  organizations: 86400,  // 24h
  projects: 86400,       // 24h
  keywords: 43200,       // 12h
  keyword_detail: 21600, // 6h
  search_engines: 86400, // 24h
  locations: 86400,      // 24h
};

function getClient(): LLMrefs {
  return new LLMrefs({ apiKey: serverEnv().LLMREFS_API_KEY });
}

async function executeWithTracking<T>(
  endpoint: string,
  cacheKey: string,
  cacheTtl: number,
  fn: () => Promise<T>,
  clientId?: string,
  skipCache?: boolean
): Promise<T> {
  // Cache-first
  if (!skipCache) {
    const cached = await getCached<T>(cacheKey);
    if (cached !== null) return cached;
  }

  // Rate limit check (10/min per API docs)
  const limiter = getRateLimiter("llmrefs");
  const { success, reset } = await limiter.limit("llmrefs");
  if (!success) {
    throw new RateLimitError("llmrefs", reset);
  }

  const startTime = Date.now();
  try {
    const result = await fn();
    const responseTime = Date.now() - startTime;

    // Cache result
    setCache(cacheKey, result, cacheTtl).catch(() => {});

    // Fire-and-forget logging
    logRequest(clientId, endpoint, 200, responseTime);
    updateHealth(true, responseTime);

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    logRequest(clientId, endpoint, 0, responseTime, message);
    updateHealth(false, responseTime);
    throw error;
  }
}

function logRequest(
  clientId: string | undefined,
  endpoint: string,
  statusCode: number,
  responseTimeMs: number,
  errorMessage?: string
) {
  try {
    const admin = createAdminClient();
    const log: ApiRequestLogInsert = {
      client_id: clientId || null,
      provider: "llmrefs",
      endpoint,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      error_message: errorMessage || null,
      request_metadata: null,
    };
    admin.from("api_request_logs").insert(log).then();
  } catch {}
}

function updateHealth(success: boolean, responseTimeMs: number) {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    admin
      .from("integration_health")
      .upsert(
        {
          provider: "llmrefs",
          status: success ? "healthy" : "degraded",
          ...(success ? { last_success: now } : { last_failure: now }),
          error_count: success ? 0 : 1,
          avg_response_ms: responseTimeMs,
          updated_at: now,
        },
        { onConflict: "provider" }
      )
      .then();
  } catch {}
}

// ── Public API ──────────────────────────────────────────

export async function getOrganizations() {
  const client = getClient();
  return executeWithTracking(
    "organizations.list",
    "llmrefs:orgs",
    CACHE_TTLS.organizations,
    () => client.organizations.list()
  );
}

export async function getProjects(organizationId: string) {
  const client = getClient();
  return executeWithTracking(
    "projects.list",
    `llmrefs:projects:${organizationId}`,
    CACHE_TTLS.projects,
    () => client.projects.list({ organizationId })
  );
}

export async function getKeywords(
  organizationId: string,
  projectId: string,
  clientId?: string
) {
  const client = getClient();
  return executeWithTracking(
    "keywords.list",
    `llmrefs:keywords:${organizationId}:${projectId}`,
    CACHE_TTLS.keywords,
    () => client.keywords.list({ organizationId, projectId }),
    clientId
  );
}

export async function getKeywordDetail(
  organizationId: string,
  projectId: string,
  keywordId: string,
  clientId?: string,
  searchEngines?: string[]
) {
  const client = getClient();
  const seFilter = searchEngines?.length ? `:${searchEngines.join(",")}` : "";
  return executeWithTracking(
    "keywords.get",
    `llmrefs:keyword:${keywordId}${seFilter}`,
    CACHE_TTLS.keyword_detail,
    () =>
      client.keywords.get({
        keywordId,
        projectId,
        organizationId,
        ...(searchEngines?.length ? { searchEngines } : {}),
      }),
    clientId
  );
}

export async function getSearchEngines() {
  const client = getClient();
  return executeWithTracking(
    "keywords.searchEngines",
    "llmrefs:search-engines",
    CACHE_TTLS.search_engines,
    () => client.keywords.searchEngines()
  );
}

export async function getLocations() {
  const client = getClient();
  return executeWithTracking(
    "keywords.locations",
    "llmrefs:locations",
    CACHE_TTLS.locations,
    () => client.keywords.locations()
  );
}
