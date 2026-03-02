import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/content-engine";
import { RateLimitError } from "@/lib/integrations/base";
import { contentGenerateSchema, validateBody } from "@/lib/validations";
import { logger } from "@/lib/logger";

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
    const { briefId, model, feedback } = validation.data;

    // Verify access
    const { data: brief } = await supabase
      .from("content_briefs")
      .select("client_id, status")
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

    // Auto-transition briefs in generated/revision_requested to approved so content-engine can proceed
    if (brief.status === "generated" || brief.status === "revision_requested") {
      const admin = createAdminClient();
      // Transition to approved (skip workflow validation — this is a deliberate regeneration)
      await admin
        .from("content_briefs")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user.id })
        .eq("id", briefId);
    }

    const content = await generateContent({ briefId, model, clientId: brief.client_id, feedback });
    return NextResponse.json({ data: content });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Content generation error", { error: error as Error, route: "POST /api/content/generate" });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
