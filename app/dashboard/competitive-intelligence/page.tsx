import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Target } from "lucide-react";
import { CompetitorOverviewCards } from "@/components/competitive/competitor-overview-cards";
import { KeywordGapTable } from "@/components/competitive/keyword-gap-table";
import { CompetitiveTrendChart } from "@/components/competitive/competitive-trend-chart";
import { CitationTracker } from "@/components/competitive/citation-tracker";
import { OpportunityList } from "@/components/competitive/opportunity-list";
import { PpcKeywordsTable } from "@/components/competitive/ppc-keywords-table";
import { DomainHistoryChart } from "@/components/competitive/domain-history-chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientSelector } from "./client-selector";
import { RefreshButton } from "./refresh-button";
import {
  getClients,
  getClient,
  getCompetitiveSummary,
  getKeywordGaps,
  getTopOpportunities,
  getCompetitiveMetricsHistory,
  getAiCitations,
} from "@/lib/supabase/queries";
import { spyFu } from "@/lib/integrations/spyfu";
import type { SpyFuDomainStatsEntry, SpyFuPpcKeyword } from "@/lib/integrations/spyfu";

interface PageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function CompetitiveIntelligencePage({ searchParams }: PageProps) {
  const { clientId: selectedClientId } = await searchParams;
  const clientsResult = await getClients();
  const clients = clientsResult.data;

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Competitive Intelligence</h1>
        <EmptyState
          icon={Target}
          title="No clients yet"
          description="Add a client to start tracking competitive intelligence."
          actionLabel="Add Client"
          actionHref="/dashboard/clients/new"
        />
      </div>
    );
  }

  const clientId = selectedClientId && clients.some((c) => c.id === selectedClientId)
    ? selectedClientId
    : clients[0].id;

  const client = await getClient(clientId);
  const domain = client?.domain || "";

  const [summary, gaps, opportunities, trafficHistory, keywordHistory, citations] =
    await Promise.all([
      getCompetitiveSummary(clientId),
      getKeywordGaps(clientId),
      getTopOpportunities(clientId),
      getCompetitiveMetricsHistory(clientId, "organic_traffic"),
      getCompetitiveMetricsHistory(clientId, "keyword_count"),
      getAiCitations(clientId),
    ]);

  // SpyFu data — fetched separately so failures don't break the page
  let domainHistory: SpyFuDomainStatsEntry[] = [];
  let ppcKeywords: SpyFuPpcKeyword[] = [];

  if (domain) {
    const [statsSettled, ppcSettled] = await Promise.allSettled([
      spyFu.getDomainStats(domain, clientId),
      spyFu.getPpcKeywords(domain, clientId, 50),
    ]);
    if (statsSettled.status === "fulfilled") {
      const results = statsSettled.value?.results;
      if (Array.isArray(results)) domainHistory = results;
    }
    if (ppcSettled.status === "fulfilled") {
      const results = ppcSettled.value?.results;
      if (Array.isArray(results)) ppcKeywords = results;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Competitive Intelligence</h1>
        <div className="flex items-center gap-3">
          <ClientSelector clients={clients} selectedClientId={clientId} />
          <RefreshButton clientId={clientId} />
        </div>
      </div>

      <CompetitorOverviewCards summary={summary} />

      <Tabs defaultValue="keyword-gaps">
        <TabsList>
          <TabsTrigger value="keyword-gaps">Keyword Gaps</TabsTrigger>
          <TabsTrigger value="ppc">PPC Intel</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="citations">AI Citations</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="keyword-gaps" className="space-y-6">
          <KeywordGapTable gaps={gaps.slice(0, 50)} />
        </TabsContent>

        <TabsContent value="ppc" className="space-y-6">
          <PpcKeywordsTable keywords={ppcKeywords} competitorDomain={domain} clientId={clientId} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {domainHistory.length > 0 && (
            <DomainHistoryChart data={domainHistory} domain={domain} />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompetitiveTrendChart
              data={trafficHistory}
              title="Organic Traffic Trend"
              metricLabel="Traffic"
            />
            <CompetitiveTrendChart
              data={keywordHistory}
              title="Keyword Count Trend"
              metricLabel="Keywords"
            />
          </div>
        </TabsContent>

        <TabsContent value="citations" className="space-y-6">
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/competitive-intelligence/citations?clientId=${clientId}`}>
                View Full Citations Dashboard
              </Link>
            </Button>
          </div>
          <CitationTracker citations={citations} />
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <OpportunityList opportunities={opportunities} clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
