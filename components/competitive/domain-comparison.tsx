import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Competitor } from "@/types/database";

interface DomainComparisonProps {
  clientDomain: string;
  clientMetrics: {
    organic_traffic?: number;
    organic_keywords?: number;
    backlinks?: number;
    domain_rank?: number;
  };
  competitor: Competitor;
  competitorMetrics?: {
    organic_traffic?: number;
    organic_keywords?: number;
    backlinks?: number;
    domain_rank?: number;
  };
}

function MetricRow({
  label,
  clientValue,
  competitorValue,
}: {
  label: string;
  clientValue: number | undefined;
  competitorValue: number | undefined;
}) {
  const cVal = clientValue ?? 0;
  const compVal = competitorValue ?? 0;
  const isWinning = cVal >= compVal;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex-1 text-right pr-4">
        <span className={isWinning ? "font-semibold text-green-600" : ""}>
          {cVal > 0 ? cVal.toLocaleString() : "—"}
        </span>
      </div>
      <div className="w-32 text-center text-sm text-muted-foreground">{label}</div>
      <div className="flex-1 pl-4">
        <span className={!isWinning ? "font-semibold text-green-600" : ""}>
          {compVal > 0 ? compVal.toLocaleString() : "—"}
        </span>
      </div>
    </div>
  );
}

export function DomainComparison({
  clientDomain,
  clientMetrics,
  competitor,
  competitorMetrics,
}: DomainComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Domain Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <div className="flex-1 text-right pr-4 font-semibold truncate">
            {clientDomain}
          </div>
          <div className="w-32 text-center text-sm text-muted-foreground">vs</div>
          <div className="flex-1 pl-4 font-semibold truncate">
            {competitor.domain}
          </div>
        </div>
        <MetricRow
          label="Organic Traffic"
          clientValue={clientMetrics.organic_traffic}
          competitorValue={competitorMetrics?.organic_traffic}
        />
        <MetricRow
          label="Keywords"
          clientValue={clientMetrics.organic_keywords}
          competitorValue={competitorMetrics?.organic_keywords}
        />
        <MetricRow
          label="Backlinks"
          clientValue={clientMetrics.backlinks}
          competitorValue={competitorMetrics?.backlinks}
        />
        <MetricRow
          label="Domain Rank"
          clientValue={clientMetrics.domain_rank}
          competitorValue={competitorMetrics?.domain_rank}
        />
      </CardContent>
    </Card>
  );
}
