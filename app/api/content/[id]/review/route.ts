import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitReview } from "@/lib/content/workflow";
import { contentReviewSchema, validateBody } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(contentReviewSchema, body);
    if (!validation.success) return validation.response;
    const { action, reviewerNotes, revisionRequests, reviewTimeMinutes } = validation.data;

    // Verify access
    const { data: content } = await supabase
      .from("generated_content")
      .select("client_id")
      .eq("id", id)
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

    await submitReview({
      contentId: id,
      action,
      reviewerNotes,
      revisionRequests,
      reviewTimeMinutes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Review submission error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
