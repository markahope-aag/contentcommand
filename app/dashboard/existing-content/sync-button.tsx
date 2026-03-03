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
      await fetch(`/api/existing-content/${clientId}/sync`, {
        method: "POST",
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
      {loading ? "Syncing..." : "Sync Now"}
    </Button>
  );
}
