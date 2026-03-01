import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DomainComparison } from "@/components/competitive/domain-comparison";
import { KeywordGapTable } from "@/components/competitive/keyword-gap-table";
import { CompetitiveTrendChart } from "@/components/competitive/competitive-trend-chart";
import { createClient } from "@/lib/supabase/server";
import {
  getKeywordGaps,
  getCompetitiveMetricsHistory,
  getCompetitiveAnalysis,
} from "@/lib/supabase/queries";

interface PageProps {
  params: Promise<{ competitorId: string }>;
  searchParams: Promise<{ clientId?: string }>;
}

export default async function CompetitorDetailPage({ params, searchParams }: PageProps) {
  const { competitorId } = await params;
  const { clientId } = await searchParams;

  const supabase = await createClient();

  // Get competitor
  const { data: competitor } = await supabase
    .from("competitors")
    .select("*")
    .eq("id", competitorId)
    .single();

  if (!competitor) return notFound();

  const resolvedClientId = clientId ?? competitor.client_id;

  // Get client
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", resolvedClientId)
    .single();

  if (!client) return notFound();

  const [gaps, overlapHistory, analyses] = await Promise.all([
    getKeywordGaps(resolvedClientId, competitorId),
    getCompetitiveMetricsHistory(resolvedClientId, "keyword_overlap"),
    getCompetitiveAnalysis(resolvedClientId),
  ]);

  // Extract domain metrics from analyses
  const domainAnalysis = analyses.find((a) => a.analysis_type === "domain_metrics");
  const clientMetrics = (domainAnalysis?.data ?? {}) as Record<string, unknown>;

  // Filter overlap history to this competitor
  const competitorOverlap = overlapHistory.filter(
    (h) => h.competitor_id === competitorId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/competitive-intelligence?clientId=${resolvedClientId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">{competitor.name || competitor.domain}</h1>
        <Badge variant="secondary">
          Strength: {competitor.competitive_strength}
        </Badge>
      </div>

      <DomainComparison
        clientDomain={client.domain}
        clientMetrics={{
          organic_traffic: clientMetrics.organic_traffic as number | undefined,
          organic_keywords: clientMetrics.organic_keywords as number | undefined,
          backlinks: clientMetrics.backlinks as number | undefined,
          domain_rank: clientMetrics.domain_rank as number | undefined,
        }}
        competitor={competitor}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetitiveTrendChart
          data={competitorOverlap}
          title="Keyword Overlap Trend"
          metricLabel="Overlapping Keywords"
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitor Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Domain</span>
                <span className="font-medium">{competitor.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Competitive Strength</span>
                <span className="font-medium">{competitor.competitive_strength}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Keyword Gaps Found</span>
                <span className="font-medium">{gaps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tracked Since</span>
                <span className="font-medium">
                  {new Date(competitor.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <KeywordGapTable
        gaps={gaps.slice(0, 50)}
        title={`Keyword Gaps vs ${competitor.domain}`}
      />
    </div>
  );
}
