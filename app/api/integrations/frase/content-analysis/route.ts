import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { frase } from "@/lib/integrations/frase";
import { RateLimitError } from "@/lib/integrations/base";
import { fraseSchema, validateBody } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(fraseSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const { data: access } = await supabase
      .rpc("user_has_client_access", { check_client_id: data.clientId });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let result;
    switch (data.type) {
      case "serp":
        result = await frase.analyzeSerp(data.query, data.clientId);
        break;
      case "url":
        result = await frase.analyzeUrl(data.url, data.clientId);
        break;
      case "semantic":
        result = await frase.getSemanticKeywords(data.keyword, data.clientId);
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
    console.error("Frase API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
