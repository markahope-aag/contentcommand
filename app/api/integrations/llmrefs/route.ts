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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, organizationId, projectId, keywordId, clientId, searchEngines } = body;

    // Verify client access if clientId provided
    if (clientId) {
      const { data: access } = await supabase
        .rpc("user_has_client_access", { check_client_id: clientId });
      if (!access) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let result;
    switch (type) {
      case "organizations":
        result = await getOrganizations();
        break;

      case "projects":
        if (!organizationId) {
          return NextResponse.json(
            { error: "organizationId is required" },
            { status: 400 }
          );
        }
        result = await getProjects(organizationId);
        break;

      case "keywords":
        if (!organizationId || !projectId) {
          return NextResponse.json(
            { error: "organizationId and projectId are required" },
            { status: 400 }
          );
        }
        result = await getKeywords(organizationId, projectId, clientId);
        break;

      case "keyword_detail":
        if (!organizationId || !projectId || !keywordId) {
          return NextResponse.json(
            { error: "organizationId, projectId, and keywordId are required" },
            { status: 400 }
          );
        }
        result = await getKeywordDetail(
          organizationId,
          projectId,
          keywordId,
          clientId,
          searchEngines
        );
        break;

      case "search_engines":
        result = await getSearchEngines();
        break;

      case "locations":
        result = await getLocations();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid type. Use: organizations, projects, keywords, keyword_detail, search_engines, locations" },
          { status: 400 }
        );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    console.error("LLMrefs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
