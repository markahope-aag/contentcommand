"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RefreshButtonProps {
  clientId: string;
}

export function RefreshButton({ clientId }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitive-intelligence/${clientId}/refresh`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Refresh failed",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Refresh complete", description: "Competitive data updated." });
      window.location.reload();
    } catch (err) {
      toast({
        title: "Refresh failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
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
