import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = [
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "generating", label: "Generating" },
  { key: "generated", label: "Generated" },
  { key: "reviewing", label: "Reviewing" },
  { key: "revision_requested", label: "Revision" },
  { key: "published", label: "Published" },
];

interface PipelineStatusProps {
  stats: Record<string, number>;
}

export function PipelineStatus({ stats }: PipelineStatusProps) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Content Pipeline</CardTitle>
          <span className="text-sm text-muted-foreground">{total} total</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          {STAGES.map((stage) => {
            const count = stats[stage.key] || 0;
            return (
              <div key={stage.key} className="flex-1 text-center">
                <div className="text-lg font-semibold">{count}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
