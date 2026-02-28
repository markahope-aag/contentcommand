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

  const handleConnect = async () => {
    if (!selectedClient) return;
    setConnecting(true);

    try {
      const response = await fetch(
        `/api/integrations/google/auth?clientId=${selectedClient}`
      );
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to initiate Google OAuth:", error);
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
