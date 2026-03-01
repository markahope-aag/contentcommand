import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${serverEnv().CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all clients
    const { data: clients, error: clientsError } = await admin
      .from("clients")
      .select("id, domain, name");

    if (clientsError || !clients?.length) {
      return NextResponse.json({ message: "No clients to process" });
    }

    // Batch fetch all competitors in one query instead of per-client
    const clientIds = clients.map((c) => c.id);
    const { data: allCompetitors } = await admin
      .from("competitors")
      .select("id, domain, client_id")
      .in("client_id", clientIds);

    // Group competitors by client_id
    const competitorsByClient = new Map<string, { id: string; domain: string }[]>();
    for (const comp of allCompetitors ?? []) {
      const existing = competitorsByClient.get(comp.client_id) ?? [];
      existing.push({ id: comp.id, domain: comp.domain });
      competitorsByClient.set(comp.client_id, existing);
    }

    const results: { clientId: string; success: boolean; error?: string }[] = [];

    for (const client of clients) {
      try {
        // Domain metrics for the client
        const domainMetrics = await dataForSEO.getDomainMetrics(
          client.domain,
          client.id
        );

        const now = new Date();
        const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

        await admin.from("competitive_analysis").insert({
          client_id: client.id,
          analysis_type: "domain_metrics",
          data: domainMetrics as Record<string, unknown>,
          expires_at: expires.toISOString(),
        });

        // Keyword gap analysis for each competitor — in parallel
        const competitors = competitorsByClient.get(client.id) ?? [];
        if (competitors.length) {
          const compResults = await Promise.allSettled(
            competitors.map(async (comp) => {
              const keywords = await dataForSEO.getCompetitorKeywords(
                client.domain,
                comp.domain,
                client.id
              );

              await admin.from("competitive_analysis").insert({
                client_id: client.id,
                competitor_id: comp.id,
                analysis_type: "keyword_gap",
                data: keywords as Record<string, unknown>,
                expires_at: expires.toISOString(),
              });
            })
          );

          for (const r of compResults) {
            if (r.status === "rejected") {
              logger.error("Keyword analysis failed", { error: r.reason instanceof Error ? r.reason : undefined, clientName: client.name, route: "POST /api/cron/daily-competitor-analysis" });
            }
          }
        }

        results.push({ clientId: client.id, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ clientId: client.id, success: false, error: message });
        logger.error("Competitor analysis failed", { error: error as Error, clientName: client.name, route: "POST /api/cron/daily-competitor-analysis" });
      }
    }

    // Clean up expired analysis records
    await admin
      .from("competitive_analysis")
      .delete()
      .lt("expires_at", new Date().toISOString());

    return NextResponse.json({ results });
  } catch (error) {
    logger.error("Daily competitor analysis cron error", { error: error as Error, route: "POST /api/cron/daily-competitor-analysis" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
