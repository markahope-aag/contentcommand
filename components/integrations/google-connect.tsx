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
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

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
      <LoadingButton
        size="sm"
        onClick={handleConnect}
        loading={connecting}
        loadingText="Connecting..."
        disabled={!selectedClient}
      >
        {connectedClientIds.includes(selectedClient)
          ? "Reconnect Google"
          : "Connect Google"}
      </LoadingButton>
    </div>
  );
}
