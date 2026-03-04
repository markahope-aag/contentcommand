import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createShareToken } from "@/lib/supabase/queries";
import { clientEnv } from "@/lib/env";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify the user can access this content (RLS will enforce)
  const { data: content, error } = await supabase
    .from("generated_content")
    .select("id, share_token")
    .eq("id", id)
    .single();

  if (error || !content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // Return existing token if already set
  if (content.share_token) {
    const appUrl = clientEnv().NEXT_PUBLIC_APP_URL || "";
    return NextResponse.json({ url: `${appUrl}/share/${content.share_token}` });
  }

  const token = await createShareToken(id);
  const appUrl = clientEnv().NEXT_PUBLIC_APP_URL || "";

  return NextResponse.json({ url: `${appUrl}/share/${token}` });
}
