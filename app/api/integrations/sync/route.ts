import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { frase } from "@/lib/integrations/frase";
import { getKeywords as getLlmrefsKeywords } from "@/lib/integrations/llmrefs";
import { RateLimitError } from "@/lib/integrations/base";
import { syncSchema, validateBody } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(syncSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const { data: access } = await supabase
      .rpc("user_has_client_access", { check_client_id: data.clientId });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get client and competitor data
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("clients")
      .select("*")
      .eq("id", data.clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { data: competitors } = await admin
      .from("competitors")
      .select("*")
      .eq("client_id", data.clientId);

    const results: Record<string, unknown> = {};

    switch (data.provider) {
      case "dataforseo":
        // Run domain metrics for client
        results.domainMetrics = await dataForSEO.getDomainMetrics(
          client.domain,
          data.clientId
        );
        // Run keyword analysis for all competitors in parallel
        if (competitors?.length) {
          results.competitorKeywords = await Promise.all(
            competitors.map(async (comp) => {
              const keywords = await dataForSEO.getCompetitorKeywords(
                client.domain,
                comp.domain,
                data.clientId
              );
              return { competitor: comp.domain, data: keywords };
            })
          );
        }
        break;

      case "frase": {
        const targetKeywords = (client.target_keywords as string[]) || [];
        if (targetKeywords.length) {
          results.serpAnalysis = await Promise.all(
            targetKeywords.slice(0, 5).map(async (kw) => {
              const analysis = await frase.analyzeSerp(kw, data.clientId);
              return { keyword: kw, data: analysis };
            })
          );
        }
        break;
      }

      case "llmrefs":
        results.keywords = await getLlmrefsKeywords(data.organizationId, data.projectId, data.clientId);
        break;
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
