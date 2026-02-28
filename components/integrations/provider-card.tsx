"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IntegrationHealth } from "@/types/database";

interface ProviderCardProps {
  name: string;
  provider: string;
  description: string;
  health?: IntegrationHealth;
  onSync?: () => void;
  onConfigure?: () => void;
  syncing?: boolean;
  children?: React.ReactNode;
}

const statusColors: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  degraded: "bg-yellow-100 text-yellow-800",
  down: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-800",
};

export function ProviderCard({
  name,
  description,
  health,
  onSync,
  onConfigure,
  syncing,
  children,
}: ProviderCardProps) {
  const status = health?.status || "unknown";
  const lastSuccess = health?.last_success
    ? new Date(health.last_success).toLocaleString()
    : "Never";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{name}</CardTitle>
        <Badge className={statusColors[status]} variant="outline">
          {status}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="text-xs text-muted-foreground mb-4 space-y-1">
          <p>Last sync: {lastSuccess}</p>
          {health?.avg_response_ms && (
            <p>Avg response: {health.avg_response_ms}ms</p>
          )}
        </div>
        {children}
        <div className="flex gap-2 mt-3">
          {onSync && (
            <Button size="sm" onClick={onSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
          {onConfigure && (
            <Button size="sm" variant="outline" onClick={onConfigure}>
              Configure
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
