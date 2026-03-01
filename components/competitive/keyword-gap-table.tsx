import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeywordGapOpportunity } from "@/types/database";

interface KeywordGapTableProps {
  gaps: KeywordGapOpportunity[];
  title?: string;
}

export function KeywordGapTable({ gaps, title = "Keyword Gaps" }: KeywordGapTableProps) {
  if (gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No keyword gap data available. Run a competitive analysis to see gaps.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium text-right">Volume</th>
                <th className="pb-2 font-medium text-right">Your Rank</th>
                <th className="pb-2 font-medium text-right">Competitor Rank</th>
                <th className="pb-2 font-medium text-right">Difficulty</th>
                <th className="pb-2 font-medium">Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap, i) => {
                const opportunityScore =
                  gap.competitor_position != null &&
                  (gap.client_position == null || gap.client_position > 20)
                    ? "high"
                    : gap.client_position != null &&
                        gap.competitor_position != null &&
                        gap.client_position > gap.competitor_position
                      ? "medium"
                      : "low";

                return (
                  <tr key={`${gap.keyword}-${i}`} className="border-b last:border-0">
                    <td className="py-2 pr-4 max-w-[200px] truncate font-medium">
                      {gap.keyword}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {gap.search_volume.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {gap.client_position ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {gap.competitor_position ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right">{gap.difficulty}</td>
                    <td className="py-2">
                      <Badge
                        variant={
                          opportunityScore === "high"
                            ? "destructive"
                            : opportunityScore === "medium"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {opportunityScore}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
