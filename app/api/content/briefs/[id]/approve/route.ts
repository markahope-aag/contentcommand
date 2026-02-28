import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approveBrief } from "@/lib/content/workflow";

export async function PUT(
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

    // Verify user has access to this brief's client
    const { data: brief } = await supabase
      .from("content_briefs")
      .select("client_id")
      .eq("id", id)
      .single();

    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    const { data: access } = await supabase.rpc("user_has_client_access", {
      p_client_id: brief.client_id,
    });
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await approveBrief(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Approve brief error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
