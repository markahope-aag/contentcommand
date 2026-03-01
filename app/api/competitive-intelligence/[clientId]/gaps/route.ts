import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getKeywordGaps, getTopOpportunities } from "@/lib/supabase/queries";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: access } = await supabase.rpc("user_has_client_access", {
      check_client_id: clientId,
    });
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const competitorId = request.nextUrl.searchParams.get("competitorId") ?? undefined;
    const opportunitiesOnly = request.nextUrl.searchParams.get("opportunities") === "true";

    const data = opportunitiesOnly
      ? await getTopOpportunities(clientId)
      : await getKeywordGaps(clientId, competitorId);

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("Keyword gaps error", {
      error: error as Error,
      route: "GET /api/competitive-intelligence/[clientId]/gaps",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
