import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const { clientId, type = "serp" } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    const { data: access } = await supabase
      .rpc("user_has_client_access", { check_client_id: clientId });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let result;
    switch (type) {
      case "serp":
        const { query } = body;
        if (!query) {
          return NextResponse.json(
            { error: "query is required for SERP analysis" },
            { status: 400 }
          );
        }
        result = await frase.analyzeSerp(query, clientId);
        break;
      case "url":
        const { url } = body;
        if (!url) {
          return NextResponse.json(
            { error: "url is required for URL analysis" },
            { status: 400 }
          );
        }
        result = await frase.analyzeUrl(url, clientId);
        break;
      case "semantic":
        const { keyword } = body;
        if (!keyword) {
          return NextResponse.json(
            { error: "keyword is required for semantic analysis" },
            { status: 400 }
          );
        }
        result = await frase.getSemanticKeywords(keyword, clientId);
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
    console.error("Frase API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
