import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreContent } from "@/lib/ai/content-engine";
import { RateLimitError } from "@/lib/integrations/base";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contentId } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId is required" },
        { status: 400 }
      );
    }

    // Verify access
    const { data: content } = await supabase
      .from("generated_content")
      .select("client_id")
      .eq("id", contentId)
      .single();

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.client_id) {
      const { data: access } = await supabase.rpc("user_has_client_access", {
        check_client_id: content.client_id,
      });
      if (!access) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const analysis = await scoreContent(contentId);
    return NextResponse.json({ data: analysis });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    console.error("Content scoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
