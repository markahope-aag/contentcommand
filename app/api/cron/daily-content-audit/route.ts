import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { syncExistingContent } from "@/lib/existing-content/sync";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${serverEnv().CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all clients that have Google OAuth tokens (i.e. connected)
    const { data: tokens, error: tokensError } = await admin
      .from("google_oauth_tokens")
      .select("client_id");

    if (tokensError || !tokens?.length) {
      return NextResponse.json({ message: "No Google-connected clients to process" });
    }

    const results: { clientId: string; success: boolean; pages?: number; error?: string }[] = [];

    for (const token of tokens) {
      try {
        const result = await syncExistingContent(token.client_id);
        results.push({
          clientId: token.client_id,
          success: true,
          pages: result.pages,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({
          clientId: token.client_id,
          success: false,
          error: message,
        });
        logger.error("Content audit sync failed for client", {
          error: error as Error,
          clientId: token.client_id,
          route: "POST /api/cron/daily-content-audit",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.error("Daily content audit cron error", {
      error: error as Error,
      route: "POST /api/cron/daily-content-audit",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
