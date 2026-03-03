import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spyFu } from "@/lib/integrations/spyfu";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get("domain");
    const type = searchParams.get("type") || "domain-stats";
    const clientId = searchParams.get("clientId") || undefined;

    if (!domain) {
      return NextResponse.json({ error: "domain parameter required" }, { status: 400 });
    }

    let data;
    switch (type) {
      case "domain-stats":
        data = await spyFu.getDomainStats(domain, clientId);
        break;
      case "ppc-competitors":
        data = await spyFu.getPpcCompetitors(domain, clientId);
        break;
      case "seo-competitors":
        data = await spyFu.getSeoCompetitors(domain, clientId);
        break;
      case "ppc-keywords":
        data = await spyFu.getPpcKeywords(domain, clientId);
        break;
      case "most-valuable-keywords":
        data = await spyFu.getMostValuableKeywords(domain, clientId);
        break;
      case "gained-ranks":
        data = await spyFu.getGainedRanksKeywords(domain, clientId);
        break;
      case "lost-ranks":
        data = await spyFu.getLostRanksKeywords(domain, clientId);
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("SpyFu API error", {
      error: error as Error,
      route: "GET /api/integrations/spyfu",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
