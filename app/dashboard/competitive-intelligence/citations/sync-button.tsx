"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SyncButtonProps {
  clientId: string;
  llmrefsOrgId?: string | null;
  llmrefsProjectId?: string | null;
}

export function SyncButton({ clientId, llmrefsOrgId, llmrefsProjectId }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);

  const isConfigured = llmrefsOrgId && llmrefsProjectId;

  async function handleSync() {
    setLoading(true);
    try {
      await fetch("/api/integrations/llmrefs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          organizationId: llmrefsOrgId,
          projectId: llmrefsProjectId,
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
      disabled={loading || !isConfigured}
      title={isConfigured ? undefined : "Configure LLMrefs org & project ID in client settings"}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Syncing..." : "Sync LLMrefs"}
    </Button>
  );
}
