"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  clientId: string;
}

export function RefreshButton({ clientId }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await fetch(`/api/competitive-intelligence/${clientId}/refresh`, {
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
      onClick={handleRefresh}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
