import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { RateLimitError } from "@/lib/integrations/base";
import { dataforseoSchema, validateBody } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(dataforseoSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    // Verify user has access to this client
    const { data: access } = await supabase
      .rpc("user_has_client_access", { check_client_id: data.clientId });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let result;
    switch (data.type) {
      case "keywords":
        result = await dataForSEO.getCompetitorKeywords(data.domain, data.competitorDomain, data.clientId);
        break;
      case "domain_metrics":
        result = await dataForSEO.getDomainMetrics(data.domain, data.clientId);
        break;
      case "serp":
        result = await dataForSEO.getSerpResults(data.keyword, data.clientId);
        break;
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    logger.error("DataForSEO API error", { error: error as Error, route: "POST /api/integrations/dataforseo/competitors" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
