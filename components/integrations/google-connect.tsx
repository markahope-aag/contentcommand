"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client } from "@/types/database";

interface GoogleConnectProps {
  clients: Client[];
  connectedClientIds: string[];
}

export function GoogleConnect({
  clients,
  connectedClientIds,
}: GoogleConnectProps) {
  const [selectedClient, setSelectedClient] = useState<string>(
    connectedClientIds[0] || clients[0]?.id || ""
  );
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const isConnected = connectedClientIds.includes(selectedClient);

  const handleConnect = async () => {
    if (!selectedClient) return;
    setConnecting(true);

    try {
      const response = await fetch(
        `/api/integrations/google/auth?clientId=${selectedClient}`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${response.status})`);
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No authorization URL returned");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect Google";
      toast({ title: "Connection failed", description: message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/integrations/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Test failed");

      if (data.status === "healthy") {
        toast({ title: "Google connected", description: `Response time: ${data.responseTimeMs}ms` });
      } else {
        toast({ title: "Google connection failed", description: data.error || "Could not verify connection", variant: "destructive" });
      }

      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test failed";
      toast({ title: "Google connection failed", description: message, variant: "destructive" });
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
                {connectedClientIds.includes(client.id) ? " (Connected)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <LoadingButton
          size="sm"
          variant={isConnected ? "outline" : "default"}
          onClick={handleConnect}
          loading={connecting}
          loadingText="Connecting..."
          disabled={!selectedClient}
        >
          {isConnected ? "Reconnect" : "Connect Google"}
        </LoadingButton>
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
    </div>
  );
}
