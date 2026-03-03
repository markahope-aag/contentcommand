import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeywordGapOpportunity } from "@/types/database";

interface OpportunityListProps {
  opportunities: KeywordGapOpportunity[];
  clientId: string;
}

export function OpportunityList({ opportunities, clientId }: OpportunityListProps) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No keyword opportunities found. Add competitors and run an analysis first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {opportunities.map((opp, i) => (
            <div
              key={`${opp.keyword}-${i}`}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{opp.keyword}</div>
                <div className="text-xs text-muted-foreground">
                  Vol: {opp.search_volume.toLocaleString()} | Competitor #{opp.competitor_position ?? "—"} | Difficulty: {opp.difficulty}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="destructive">Gap</Badge>
                <Link
                  href={`/dashboard/content/briefs/new?keyword=${encodeURIComponent(opp.keyword)}&clientId=${clientId}`}
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                >
                  Create Brief
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
