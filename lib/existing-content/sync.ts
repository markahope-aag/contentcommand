import { googleSearchConsole, googleAnalytics } from "@/lib/integrations/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

interface PageMetrics {
  page_url: string;
  page_path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface KeywordMetrics {
  page_path: string;
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function classifyPage(
  current: PageMetrics,
  previous: PageMetrics | undefined
): "active" | "decaying" | "thin" | "opportunity" {
  // Decaying: clicks dropped >20% vs prior period
  if (previous && previous.clicks > 0) {
    const decline = (previous.clicks - current.clicks) / previous.clicks;
    if (decline > 0.2) return "decaying";
  }

  // Opportunity: position 4-20 (striking distance)
  if (current.position >= 4 && current.position <= 20) return "opportunity";

  // Thin: high impressions but low clicks (CTR < 1%)
  if (current.impressions > 100 && current.ctr < 0.01) return "thin";

  return "active";
}

export async function syncExistingContent(
  clientId: string
): Promise<{ pages: number; keywords: number }> {
  const admin = createAdminClient();

  // Create sync record
  const { data: syncRecord, error: syncErr } = await admin
    .from("content_audit_syncs")
    .insert({ client_id: clientId, status: "running" })
    .select("id")
    .single();

  if (syncErr || !syncRecord) {
    throw new Error("Failed to create sync record");
  }

  const syncId = syncRecord.id;

  try {
    // 1. Get client config
    const { data: client } = await admin
      .from("clients")
      .select("domain, gsc_site_url, ga4_property_id")
      .eq("id", clientId)
      .single();

    if (!client?.domain) {
      throw new Error("Client has no domain configured");
    }

    // Resolve GSC site URL: use explicit setting, or fall back to domain matching
    let siteUrl = client.gsc_site_url;

    if (!siteUrl) {
      const sites = await googleSearchConsole.getSites(clientId);
      if (!sites.length) {
        throw new Error("No sites found in Google Search Console. Set the GSC Site URL in client settings.");
      }

      const clientDomain = client.domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "").toLowerCase();
      const matchedSite = sites.find((s) => {
        const siteDomain = (s.siteUrl || "").replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "").toLowerCase();
        return siteDomain === clientDomain || siteDomain.includes(clientDomain) || clientDomain.includes(siteDomain);
      });

      if (!matchedSite) {
        throw new Error(`No GSC site matches client domain "${client.domain}". Set the GSC Site URL in client settings. Available: ${sites.map((s) => s.siteUrl).join(", ")}`);
      }

      siteUrl = matchedSite.siteUrl!;
    }

    const ga4PropertyId = client.ga4_property_id;

    // 2. Date ranges: current 28 days + previous 28 days
    const now = new Date();
    const currentEnd = new Date(now);
    currentEnd.setDate(currentEnd.getDate() - 1); // yesterday
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - 27); // 28 days back

    const prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 27);

    const periodEnd = formatDate(currentEnd);
    const periodStart = formatDate(currentStart);

    // 3. Fetch GSC page-level data (current + previous)
    const [currentPageData, prevPageData] = await Promise.all([
      googleSearchConsole.getSearchAnalytics(clientId, siteUrl, {
        startDate: formatDate(currentStart),
        endDate: formatDate(currentEnd),
        dimensions: ["page"],
        rowLimit: 1000,
      }),
      googleSearchConsole.getSearchAnalytics(clientId, siteUrl, {
        startDate: formatDate(prevStart),
        endDate: formatDate(prevEnd),
        dimensions: ["page"],
        rowLimit: 1000,
      }),
    ]);

    // Parse page metrics
    const currentPages = new Map<string, PageMetrics>();
    for (const row of currentPageData.rows || []) {
      const pageUrl = row.keys?.[0] || "";
      const pagePath = new URL(pageUrl).pathname;
      currentPages.set(pagePath, {
        page_url: pageUrl,
        page_path: pagePath,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    const prevPages = new Map<string, PageMetrics>();
    for (const row of prevPageData.rows || []) {
      const pageUrl = row.keys?.[0] || "";
      const pagePath = new URL(pageUrl).pathname;
      prevPages.set(pagePath, {
        page_url: pageUrl,
        page_path: pagePath,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    // 4. Fetch GA4 page metrics if property ID provided
    const ga4Map = new Map<
      string,
      { page_views: number; bounce_rate: number; avg_session_duration: number }
    >();

    if (ga4PropertyId) {
      try {
        const ga4Data = await googleAnalytics.getPageMetrics(
          clientId,
          ga4PropertyId,
          {
            startDate: formatDate(currentStart),
            endDate: formatDate(currentEnd),
          }
        );

        for (const row of ga4Data.rows || []) {
          const pagePath = row.dimensionValues?.[0]?.value || "";
          ga4Map.set(pagePath, {
            page_views: Number(row.metricValues?.[0]?.value || 0),
            avg_session_duration: Number(row.metricValues?.[1]?.value || 0),
            bounce_rate: Number(row.metricValues?.[2]?.value || 0),
          });
        }
      } catch (err) {
        logger.warn("GA4 fetch failed, continuing without GA4 data", {
          error: err instanceof Error ? err : undefined,
          clientId,
        });
      }
    }

    // 5. Build page rows
    const pageRows: Record<string, unknown>[] = [];
    currentPages.forEach((current, pagePath) => {
      const prev = prevPages.get(pagePath);
      const ga4 = ga4Map.get(pagePath);

      pageRows.push({
        client_id: clientId,
        page_url: current.page_url,
        page_path: pagePath,
        clicks: current.clicks,
        impressions: current.impressions,
        ctr: current.ctr,
        position: Math.round(current.position * 100) / 100,
        prev_clicks: prev?.clicks ?? 0,
        prev_impressions: prev?.impressions ?? 0,
        prev_ctr: prev?.ctr ?? 0,
        prev_position: prev ? Math.round(prev.position * 100) / 100 : 0,
        page_views: ga4?.page_views ?? 0,
        bounce_rate: ga4?.bounce_rate ?? 0,
        avg_session_duration: ga4?.avg_session_duration ?? 0,
        status: classifyPage(current, prev),
        period_start: periodStart,
        period_end: periodEnd,
        updated_at: new Date().toISOString(),
      });
    });

    // 6. Clear stale data for this client before upserting fresh data
    await admin
      .from("content_page_keywords")
      .delete()
      .eq("client_id", clientId);
    await admin
      .from("content_pages")
      .delete()
      .eq("client_id", clientId);

    // Upsert pages in batches
    const PAGE_BATCH = 100;
    for (let i = 0; i < pageRows.length; i += PAGE_BATCH) {
      const batch = pageRows.slice(i, i + PAGE_BATCH);
      const { error } = await admin.from("content_pages").upsert(batch, {
        onConflict: "client_id,page_path,period_end",
      });
      if (error) {
        logger.error("Page upsert batch failed", { error });
      }
    }

    // 7. Fetch keyword-level data from GSC
    const [currentKwData, prevKwData] = await Promise.all([
      googleSearchConsole.getSearchAnalytics(clientId, siteUrl, {
        startDate: formatDate(currentStart),
        endDate: formatDate(currentEnd),
        dimensions: ["page", "query"],
        rowLimit: 5000,
      }),
      googleSearchConsole.getSearchAnalytics(clientId, siteUrl, {
        startDate: formatDate(prevStart),
        endDate: formatDate(prevEnd),
        dimensions: ["page", "query"],
        rowLimit: 5000,
      }),
    ]);

    // Parse keyword metrics
    const currentKeywords: KeywordMetrics[] = [];
    for (const row of currentKwData.rows || []) {
      const pageUrl = row.keys?.[0] || "";
      currentKeywords.push({
        page_path: new URL(pageUrl).pathname,
        keyword: row.keys?.[1] || "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    const prevKeywordsMap = new Map<string, KeywordMetrics>();
    for (const row of prevKwData.rows || []) {
      const pageUrl = row.keys?.[0] || "";
      const pagePath = new URL(pageUrl).pathname;
      const keyword = row.keys?.[1] || "";
      prevKeywordsMap.set(`${pagePath}::${keyword}`, {
        page_path: pagePath,
        keyword,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    // 8. Build keyword rows
    const keywordRows = currentKeywords.map((kw) => {
      const prev = prevKeywordsMap.get(`${kw.page_path}::${kw.keyword}`);
      return {
        client_id: clientId,
        page_path: kw.page_path,
        keyword: kw.keyword,
        clicks: kw.clicks,
        impressions: kw.impressions,
        ctr: kw.ctr,
        position: Math.round(kw.position * 100) / 100,
        prev_clicks: prev?.clicks ?? 0,
        prev_impressions: prev?.impressions ?? 0,
        prev_ctr: prev?.ctr ?? 0,
        prev_position: prev ? Math.round(prev.position * 100) / 100 : 0,
        period_end: periodEnd,
      };
    });

    // 9. Upsert keywords in batches
    const KW_BATCH = 200;
    for (let i = 0; i < keywordRows.length; i += KW_BATCH) {
      const batch = keywordRows.slice(i, i + KW_BATCH);
      const { error } = await admin
        .from("content_page_keywords")
        .upsert(batch, {
          onConflict: "client_id,page_path,keyword,period_end",
        });
      if (error) {
        logger.error("Keyword upsert batch failed", { error });
      }
    }

    // 10. Update sync record
    await admin
      .from("content_audit_syncs")
      .update({
        status: "completed",
        pages_synced: pageRows.length,
        keywords_synced: keywordRows.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncId);

    return { pages: pageRows.length, keywords: keywordRows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await admin
      .from("content_audit_syncs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncId);

    throw error;
  }
}
