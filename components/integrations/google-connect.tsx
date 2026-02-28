"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!selectedClient) return;
    setConnecting(true);
    setError(null);

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
      setError(message);
      console.error("Failed to initiate Google OAuth:", err);
    } finally {
      setConnecting(false);
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
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button
        size="sm"
        onClick={handleConnect}
        disabled={!selectedClient || connecting}
      >
        {connecting
          ? "Connecting..."
          : connectedClientIds.includes(selectedClient)
            ? "Reconnect Google"
            : "Connect Google"}
      </Button>
    </div>
  );
}
