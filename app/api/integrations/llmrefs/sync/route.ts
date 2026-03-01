import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as llmrefs from "@/lib/integrations/llmrefs";
import { llmrefsSyncSchema, validateBody } from "@/lib/validations";
import { invalidateCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(llmrefsSyncSchema, body);
    if (!validation.success) return validation.response;
    const { clientId, organizationId, projectId } = validation.data;

    const { data: access } = await supabase.rpc("user_has_client_access", {
      check_client_id: clientId,
    });
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch keywords from LLMrefs
    const keywords = await llmrefs.getKeywords(organizationId, projectId, clientId);
    const keywordList = Array.isArray(keywords) ? keywords : [];

    const admin = createAdminClient();
    let synced = 0;

    for (const kw of keywordList) {
      const kwData = kw as Record<string, unknown>;
      const detail = await llmrefs.getKeywordDetail(
        organizationId,
        projectId,
        String(kwData.id ?? kwData.keyword_id ?? ""),
        clientId
      );

      const detailData = detail as Record<string, unknown>;
      const results = Array.isArray(detailData?.results) ? detailData.results : [];

      for (const result of results) {
        const r = result as Record<string, unknown>;
        await admin.from("ai_citations").insert({
          client_id: clientId,
          platform: String(r.search_engine ?? r.platform ?? "unknown"),
          query: String(kwData.keyword ?? kwData.name ?? ""),
          cited: Boolean(r.cited ?? r.is_cited ?? false),
          share_of_voice: r.share_of_voice != null ? Number(r.share_of_voice) : null,
          citation_url: r.citation_url ? String(r.citation_url) : null,
          citation_context: r.context ? String(r.context) : null,
          data: r as Record<string, unknown>,
        });
        synced++;
      }
    }

    await invalidateCache(`cc:competitive-summary:${clientId}`);

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    logger.error("LLMrefs sync error", {
      error: error as Error,
      route: "POST /api/integrations/llmrefs/sync",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
