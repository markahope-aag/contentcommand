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

const ALL_PROVIDERS = ["dataforseo", "frase", "llmrefs", "google"] as const;

export function HealthStatus({ healthData }: HealthStatusProps) {
  const healthByProvider = new Map(healthData.map((h) => [h.provider, h]));

  return (
    <div className="flex flex-wrap gap-3">
      {ALL_PROVIDERS.map((provider) => {
        const h = healthByProvider.get(provider);
        const status = h?.status || "unknown";

        return (
          <div
            key={provider}
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
          >
            <span className="text-sm font-medium">
              {providerNames[provider]}
            </span>
            <Badge className={statusColors[status]} variant="outline">
              {status}
            </Badge>
            {h?.avg_response_ms && (
              <span className="text-xs text-muted-foreground">
                {h.avg_response_ms}ms
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
