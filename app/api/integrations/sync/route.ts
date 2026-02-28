import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { frase } from "@/lib/integrations/frase";
import { RateLimitError } from "@/lib/integrations/base";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, provider } = body;

    if (!clientId || !provider) {
      return NextResponse.json(
        { error: "clientId and provider are required" },
        { status: 400 }
      );
    }

    const { data: access } = await supabase
      .rpc("user_has_client_access", { check_client_id: clientId });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get client and competitor data
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { data: competitors } = await admin
      .from("competitors")
      .select("*")
      .eq("client_id", clientId);

    const results: Record<string, unknown> = {};

    switch (provider) {
      case "dataforseo":
        // Run domain metrics for client
        results.domainMetrics = await dataForSEO.getDomainMetrics(
          client.domain,
          clientId
        );
        // Run keyword analysis for each competitor
        if (competitors?.length) {
          results.competitorKeywords = [];
          for (const comp of competitors) {
            const keywords = await dataForSEO.getCompetitorKeywords(
              client.domain,
              comp.domain,
              clientId
            );
            (results.competitorKeywords as unknown[]).push({
              competitor: comp.domain,
              data: keywords,
            });
          }
        }
        break;

      case "frase":
        const targetKeywords = (client.target_keywords as string[]) || [];
        if (targetKeywords.length) {
          results.serpAnalysis = [];
          for (const kw of targetKeywords.slice(0, 5)) {
            const analysis = await frase.analyzeSerp(kw, clientId);
            (results.serpAnalysis as unknown[]).push({ keyword: kw, data: analysis });
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: "Invalid provider" },
          { status: 400 }
        );
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
