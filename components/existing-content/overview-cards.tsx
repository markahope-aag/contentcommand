import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentAuditSummary } from "@/types/database";

interface OverviewCardsProps {
  summary: ContentAuditSummary;
}

export function OverviewCards({ summary }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{summary.total_pages}</div>
          <p className="text-xs text-muted-foreground">
            {summary.active_count} active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Clicks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {summary.total_clicks.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Last 28 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{summary.avg_position}</div>
          <p className="text-xs text-muted-foreground">
            CTR: {(Number(summary.avg_ctr) * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Decaying
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">
            {summary.decaying_count}
          </div>
          <p className="text-xs text-muted-foreground">Clicks down &gt;20%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Striking Distance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-amber-600">
            {summary.opportunity_count}
          </div>
          <p className="text-xs text-muted-foreground">Position 4-20</p>
        </CardContent>
      </Card>
    </div>
  );
}
