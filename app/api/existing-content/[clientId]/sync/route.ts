import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncExistingContent } from "@/lib/existing-content/sync";
import { invalidateCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function POST(
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

    const result = await syncExistingContent(clientId);

    await invalidateCache(
      `cc:content-audit-summary:${clientId}`,
      `cc:decaying-pages:${clientId}`,
      `cc:striking-distance:${clientId}`,
      `cc:cannibalization:${clientId}`
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Content audit sync error", {
      error: error as Error,
      route: "POST /api/existing-content/[clientId]/sync",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
