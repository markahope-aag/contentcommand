import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataForSEO } from "@/lib/integrations/dataforseo";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all clients with their competitors
    const { data: clients, error: clientsError } = await admin
      .from("clients")
      .select("id, domain, name");

    if (clientsError || !clients?.length) {
      return NextResponse.json({ message: "No clients to process" });
    }

    const results: { clientId: string; success: boolean; error?: string }[] = [];

    for (const client of clients) {
      try {
        // Get competitors for this client
        const { data: competitors } = await admin
          .from("competitors")
          .select("id, domain")
          .eq("client_id", client.id);

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

        // Keyword gap analysis for each competitor
        if (competitors?.length) {
          for (const comp of competitors) {
            try {
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
            } catch (compError) {
              console.error(
                `Keyword analysis failed for ${comp.domain}:`,
                compError
              );
            }
          }
        }

        results.push({ clientId: client.id, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ clientId: client.id, success: false, error: message });
        console.error(`Competitor analysis failed for ${client.name}:`, error);
      }
    }

    // Clean up expired analysis records
    await admin
      .from("competitive_analysis")
      .delete()
      .lt("expires_at", new Date().toISOString());

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Daily competitor analysis cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
