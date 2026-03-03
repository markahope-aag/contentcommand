import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContentAuditSummary } from "@/lib/supabase/queries";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: access } = await supabase.rpc("user_has_client_access", {
      check_client_id: clientId,
    });
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const summary = await getContentAuditSummary(clientId);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Content audit summary error", {
      error: error as Error,
      route: "GET /api/existing-content/[clientId]/summary",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
