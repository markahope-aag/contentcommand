import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { invalidateCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: access } = await supabase.rpc("user_has_client_access", {
      check_client_id: clientId,
    });
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get client domain
    const { data: client } = await supabase
      .from("clients")
      .select("domain")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Domain metrics
    const domainMetrics = await dataForSEO.getDomainMetrics(client.domain, clientId);
    await admin.from("competitive_analysis").insert({
      client_id: clientId,
      analysis_type: "domain_metrics",
      data: domainMetrics as Record<string, unknown>,
      expires_at: expires.toISOString(),
    });

    // Write metrics history
    const metrics = domainMetrics as Record<string, unknown>;
    const historyRows = [];
    if (metrics?.organic_traffic != null) {
      historyRows.push({
        client_id: clientId,
        metric_type: "organic_traffic",
        metric_value: Number(metrics.organic_traffic),
      });
    }
    if (metrics?.organic_keywords != null) {
      historyRows.push({
        client_id: clientId,
        metric_type: "keyword_count",
        metric_value: Number(metrics.organic_keywords),
      });
    }
    if (historyRows.length > 0) {
      await admin.from("competitive_metrics_history").insert(historyRows);
    }

    // Keyword gaps for competitors
    const { data: competitors } = await admin
      .from("competitors")
      .select("id, domain")
      .eq("client_id", clientId);

    if (competitors?.length) {
      await Promise.allSettled(
        competitors.map(async (comp) => {
          const keywords = await dataForSEO.getCompetitorKeywords(
            client.domain,
            comp.domain,
            clientId
          );
          await admin.from("competitive_analysis").insert({
            client_id: clientId,
            competitor_id: comp.id,
            analysis_type: "keyword_gap",
            data: keywords as Record<string, unknown>,
            expires_at: expires.toISOString(),
          });
        })
      );
    }

    await invalidateCache(
      `cc:competitive-summary:${clientId}`,
      `cc:competitive-history:${clientId}:*`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Competitive refresh error", {
      error: error as Error,
      route: "POST /api/competitive-intelligence/[clientId]/refresh",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
