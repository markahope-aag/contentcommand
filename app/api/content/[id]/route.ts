import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteGeneratedContent, getGeneratedContentByBrief } from "@/lib/supabase/queries";
import { logger } from "@/lib/logger";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch content to verify access and get brief_id
    const { data: content, error: fetchError } = await supabase
      .from("generated_content")
      .select("client_id, brief_id")
      .eq("id", id)
      .single();

    if (fetchError || !content) {
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

    const briefId = content.brief_id;

    await deleteGeneratedContent(id);

    // If brief has no remaining content, transition it back to approved
    if (briefId) {
      const remaining = await getGeneratedContentByBrief(briefId);
      if (remaining.length === 0) {
        const admin = createAdminClient();
        await admin
          .from("content_briefs")
          .update({ status: "approved" })
          .eq("id", briefId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Delete content error", { error: error as Error, route: "DELETE /api/content/[id]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
