"use client";

import { useState } from "react";
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
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  const handleSync = async (provider: string) => {
    if (!clients.length) return;

    setSyncingProvider(provider);
    try {
      // Sync for the first client as a default action
      await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clients[0].id,
          provider,
        }),
      });
    } catch (error) {
      console.error(`Sync failed for ${provider}:`, error);
    } finally {
      setSyncingProvider(null);
    }
  };

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
              onSync={
                p.provider !== "google"
                  ? () => handleSync(p.provider)
                  : undefined
              }
              syncing={syncingProvider === p.provider}
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
