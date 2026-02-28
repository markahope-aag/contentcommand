import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: Record<string, { cost: number; calls: number }>;
  byOperation: Record<string, { cost: number; calls: number }>;
}

interface AiUsageSummaryProps {
  summary: UsageSummary | null;
}

export function AiUsageSummary({ summary }: AiUsageSummaryProps) {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No usage data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">
              ${summary.totalCost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">Total Cost</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {(summary.totalInputTokens / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-muted-foreground">Input Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {(summary.totalOutputTokens / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-muted-foreground">Output Tokens</div>
          </div>
        </div>

        {Object.keys(summary.byProvider).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">By Provider</h4>
            <div className="space-y-1">
              {Object.entries(summary.byProvider).map(([provider, data]) => (
                <div key={provider} className="flex justify-between text-sm">
                  <span className="capitalize">{provider}</span>
                  <span>
                    ${data.cost.toFixed(4)} ({data.calls} calls)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(summary.byOperation).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">By Operation</h4>
            <div className="space-y-1">
              {Object.entries(summary.byOperation).map(([op, data]) => (
                <div key={op} className="flex justify-between text-sm">
                  <span className="capitalize">{op.replace("_", " ")}</span>
                  <span>
                    ${data.cost.toFixed(4)} ({data.calls} calls)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
