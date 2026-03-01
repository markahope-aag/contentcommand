import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getOrganizations,
  getProjects,
  getKeywords,
  getKeywordDetail,
  getSearchEngines,
  getLocations,
} from "@/lib/integrations/llmrefs";
import { RateLimitError } from "@/lib/integrations/base";
import { llmrefsSchema, validateBody } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(llmrefsSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    // Verify client access if clientId provided
    if (data.clientId) {
      const { data: access } = await supabase
        .rpc("user_has_client_access", { check_client_id: data.clientId });
      if (!access) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let result;
    switch (data.type) {
      case "organizations":
        result = await getOrganizations();
        break;
      case "projects":
        result = await getProjects(data.organizationId);
        break;
      case "keywords":
        result = await getKeywords(data.organizationId, data.projectId, data.clientId);
        break;
      case "keyword_detail":
        result = await getKeywordDetail(
          data.organizationId,
          data.projectId,
          data.keywordId,
          data.clientId,
          data.searchEngines
        );
        break;
      case "search_engines":
        result = await getSearchEngines();
        break;
      case "locations":
        result = await getLocations();
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
    logger.error("LLMrefs API error", { error: error as Error, route: "POST /api/integrations/llmrefs" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
