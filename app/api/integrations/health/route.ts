import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationHealth } from "@/lib/supabase/queries";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const health = await getIntegrationHealth();
    return NextResponse.json({ data: health });
  } catch (error) {
    logger.error("Health check error", { error: error as Error, route: "GET /api/integrations/health" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
