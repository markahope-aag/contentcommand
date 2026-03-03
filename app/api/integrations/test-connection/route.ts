import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateCache } from "@/lib/cache";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

async function testDataForSEO(): Promise<{ ok: boolean; error?: string; ms: number }> {
  const env = serverEnv();
  const auth = `Basic ${Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString("base64")}`;
  const start = Date.now();
  try {
    const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([{ target: "google.com", limit: 1 }]),
    });
    const ms = Date.now() - start;
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, ms };
    return { ok: true, ms };
  } catch (err) {
    return { ok: false, error: (err as Error).message, ms: Date.now() - start };
  }
}

async function testFrase(): Promise<{ ok: boolean; error?: string; ms: number }> {
  const env = serverEnv();
  const start = Date.now();
  try {
    const res = await fetch("https://next.frase.io/api/v1/serp/analyze", {
      method: "POST",
      headers: {
        "X-API-KEY": env.FRASE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyword: "test" }),
    });
    const ms = Date.now() - start;
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API key", ms };
    }
    return { ok: true, ms };
  } catch (err) {
    return { ok: false, error: (err as Error).message, ms: Date.now() - start };
  }
}

async function testLLMrefs(): Promise<{ ok: boolean; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const { getSearchEngines } = await import("@/lib/integrations/llmrefs");
    await getSearchEngines();
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, error: (err as Error).message, ms: Date.now() - start };
  }
}

async function testGoogle(): Promise<{ ok: boolean; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("google_oauth_tokens")
      .select("client_id")
      .limit(1);
    const ms = Date.now() - start;
    if (!data?.length) {
      return { ok: false, error: "No clients connected", ms };
    }
    return { ok: true, ms };
  } catch (err) {
    return { ok: false, error: (err as Error).message, ms: Date.now() - start };
  }
}

const testers: Record<string, () => Promise<{ ok: boolean; error?: string; ms: number }>> = {
  dataforseo: testDataForSEO,
  frase: testFrase,
  llmrefs: testLLMrefs,
  google: testGoogle,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await request.json();
    const tester = testers[provider];
    if (!tester) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const result = await tester();

    // Update health status
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error: upsertError } = await admin
      .from("integration_health")
      .upsert(
        {
          provider,
          status: result.ok ? "healthy" : "down",
          ...(result.ok
            ? { last_success: now, error_count: 0 }
            : { last_failure: now }),
          avg_response_ms: result.ms,
          updated_at: now,
        },
        { onConflict: "provider" }
      );

    if (upsertError) {
      logger.error("Health upsert failed", { error: upsertError, provider });
    }

    await invalidateCache("cc:integration-health:all");

    return NextResponse.json({
      provider,
      status: result.ok ? "healthy" : "down",
      error: result.error,
      responseTimeMs: result.ms,
    });
  } catch (error) {
    logger.error("Test connection error", { error: error as Error, route: "POST /api/integrations/test-connection" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
