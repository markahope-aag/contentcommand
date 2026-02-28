import { Badge } from "@/components/ui/badge";
import type { IntegrationHealth } from "@/types/database";

interface HealthStatusProps {
  healthData: IntegrationHealth[];
}

const statusColors: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  degraded: "bg-yellow-100 text-yellow-800",
  down: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-800",
};

const providerNames: Record<string, string> = {
  dataforseo: "DataForSEO",
  frase: "Frase",
  google: "Google",
  llmrefs: "LLMrefs",
};

export function HealthStatus({ healthData }: HealthStatusProps) {
  if (!healthData.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No health data available yet. Run a sync to start tracking.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {healthData.map((h) => (
        <div
          key={h.provider}
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
        >
          <span className="text-sm font-medium">
            {providerNames[h.provider] || h.provider}
          </span>
          <Badge className={statusColors[h.status]} variant="outline">
            {h.status}
          </Badge>
          {h.avg_response_ms && (
            <span className="text-xs text-muted-foreground">
              {h.avg_response_ms}ms
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
