"use client";

import { ProviderCard } from "@/components/integrations/provider-card";
import { GoogleConnect } from "@/components/integrations/google-connect";
import { SyncLogs } from "@/components/integrations/sync-logs";
import { RateLimitDisplay } from "@/components/integrations/rate-limit-display";
import type { Client, IntegrationHealth } from "@/types/database";

interface IntegrationsClientProps {
  clients: Client[];
  healthData: IntegrationHealth[];
  connectedGoogleClientIds: string[];
}

const PROVIDERS = [
  {
    name: "DataForSEO",
    provider: "dataforseo",
    description:
      "Competitor keyword analysis, domain metrics, and SERP tracking.",
  },
  {
    name: "Frase",
    provider: "frase",
    description: "SERP analysis, URL analysis, and semantic keyword research.",
  },
  {
    name: "LLMrefs",
    provider: "llmrefs",
    description:
      "AI search visibility tracking — AEO/GEO analytics across ChatGPT, Perplexity, Gemini, and more.",
  },
  {
    name: "Google",
    provider: "google",
    description:
      "Search Console and Analytics data. Requires per-client OAuth connection.",
  },
];

export function IntegrationsClient({
  clients,
  healthData,
  connectedGoogleClientIds,
}: IntegrationsClientProps) {
  const getHealth = (provider: string) =>
    healthData.find((h) => h.provider === provider);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Providers</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.provider}
              name={p.name}
              provider={p.provider}
              description={p.description}
              health={getHealth(p.provider)}
            >
              {p.provider === "google" && (
                <GoogleConnect
                  clients={clients}
                  connectedClientIds={connectedGoogleClientIds}
                />
              )}
            </ProviderCard>
          ))}
        </div>
      </div>

      <RateLimitDisplay />

      <SyncLogs />
    </div>
  );
}
