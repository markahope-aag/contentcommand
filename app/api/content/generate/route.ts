import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateContent } from "@/lib/ai/content-engine";
import { RateLimitError } from "@/lib/integrations/base";
import { contentGenerateSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(contentGenerateSchema, body);
    if (!validation.success) return validation.response;
    const { briefId, model } = validation.data;

    // Verify access
    const { data: brief } = await supabase
      .from("content_briefs")
      .select("client_id")
      .eq("id", briefId)
      .single();

    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    const { data: access } = await supabase.rpc("user_has_client_access", {
      check_client_id: brief.client_id,
    });
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const content = await generateContent({ briefId, model, clientId: brief.client_id });
    return NextResponse.json({ data: content });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Content generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
