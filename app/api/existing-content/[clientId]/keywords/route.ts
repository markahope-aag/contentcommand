import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStrikingDistanceKeywords,
  getCannibalizationGroups,
  getContentPageKeywords,
} from "@/lib/supabase/queries";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "striking-distance";
    const pagePath = searchParams.get("pagePath");

    if (type === "striking-distance") {
      const data = await getStrikingDistanceKeywords(clientId);
      return NextResponse.json({ data });
    }

    if (type === "cannibalization") {
      const data = await getCannibalizationGroups(clientId);
      return NextResponse.json({ data });
    }

    if (type === "page" && pagePath) {
      const data = await getContentPageKeywords(clientId, pagePath);
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    logger.error("Content keywords error", {
      error: error as Error,
      route: "GET /api/existing-content/[clientId]/keywords",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
