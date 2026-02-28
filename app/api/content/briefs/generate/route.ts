import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBrief } from "@/lib/ai/content-engine";
import { RateLimitError } from "@/lib/integrations/base";
import { briefGenerateSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(briefGenerateSchema, body);
    if (!validation.success) return validation.response;
    const { clientId, targetKeyword, contentType } = validation.data;

    // Permission check
    const { data: access } = await supabase.rpc("user_has_client_access", {
      check_client_id: clientId,
    });
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const brief = await generateBrief({ clientId, targetKeyword, contentType });
    return NextResponse.json({ data: brief });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    console.error("Brief generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
