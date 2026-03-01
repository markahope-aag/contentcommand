import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompetitiveSummary } from "@/types/database";

interface CompetitorOverviewCardsProps {
  summary: CompetitiveSummary;
}

export function CompetitorOverviewCards({ summary }: CompetitorOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Competitors Tracked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{summary.competitor_count}</div>
          <p className="text-xs text-muted-foreground">
            Avg strength: {summary.avg_strength}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Organic Traffic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {summary.organic_traffic > 0
              ? summary.organic_traffic.toLocaleString()
              : "—"}
          </div>
          <p className="text-xs text-muted-foreground">Estimated monthly</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Keyword Gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{summary.keyword_gap_count}</div>
          <p className="text-xs text-muted-foreground">Active analyses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            AI Citation SOV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {summary.citation_sov > 0 ? `${summary.citation_sov}%` : "—"}
          </div>
          <p className="text-xs text-muted-foreground">Last 30 days avg</p>
        </CardContent>
      </Card>
    </div>
  );
}
