import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleAuth } from "@/lib/integrations/google";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this client
    const { data: access } = await supabase
      .rpc("user_has_client_access", { check_client_id: clientId });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authUrl = googleAuth.getAuthUrl(clientId);
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
