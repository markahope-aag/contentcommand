"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SyncButtonProps {
  clientId: string;
}

export function SyncButton({ clientId }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      // TODO: In production, these IDs would come from a settings page or config
      await fetch("/api/integrations/llmrefs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          organizationId: "default",
          projectId: "default",
        }),
      });
      window.location.reload();
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Syncing..." : "Sync LLMrefs"}
    </Button>
  );
}
