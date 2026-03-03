"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { useToast } from "@/hooks/use-toast";
import type { IntegrationHealth } from "@/types/database";

interface ProviderCardProps {
  name: string;
  provider: string;
  description: string;
  health?: IntegrationHealth;
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
  provider,
  description,
  health,
  children,
}: ProviderCardProps) {
  const [testing, setTesting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState("Never");
  const { toast } = useToast();

  const status = health?.status || "unknown";

  useEffect(() => {
    if (health?.last_success) {
      setLastSuccess(new Date(health.last_success).toLocaleString());
    }
  }, [health?.last_success]);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/integrations/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Test failed");
      }

      if (data.status === "healthy") {
        toast({
          title: `${name} connected`,
          description: `Response time: ${data.responseTimeMs}ms`,
        });
      } else {
        toast({
          title: `${name} connection failed`,
          description: data.error || "Could not reach the API",
          variant: "destructive",
        });
      }

      // Reload to refresh server-side health data across all sections
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test failed";
      toast({
        title: `${name} connection failed`,
        description: message,
        variant: "destructive",
      });
      setTesting(false);
    }
  };

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
        {!children && (
          <div className="mt-3">
            <LoadingButton
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              loading={testing}
              loadingText="Testing..."
            >
              Test Connection
            </LoadingButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
