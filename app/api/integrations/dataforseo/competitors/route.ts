import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { RateLimitError } from "@/lib/integrations/base";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, domain, competitorDomain, type = "keywords" } = body;

    if (!clientId || !domain) {
      return NextResponse.json(
        { error: "clientId and domain are required" },
        { status: 400 }
      );
    }

    // Verify user has access to this client
    const { data: access } = await supabase
      .rpc("user_has_client_access", { check_client_id: clientId });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let result;
    switch (type) {
      case "keywords":
        if (!competitorDomain) {
          return NextResponse.json(
            { error: "competitorDomain is required for keyword analysis" },
            { status: 400 }
          );
        }
        result = await dataForSEO.getCompetitorKeywords(domain, competitorDomain, clientId);
        break;
      case "domain_metrics":
        result = await dataForSEO.getDomainMetrics(domain, clientId);
        break;
      case "serp":
        const { keyword } = body;
        if (!keyword) {
          return NextResponse.json(
            { error: "keyword is required for SERP analysis" },
            { status: 400 }
          );
        }
        result = await dataForSEO.getSerpResults(keyword, clientId);
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    console.error("DataForSEO API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
