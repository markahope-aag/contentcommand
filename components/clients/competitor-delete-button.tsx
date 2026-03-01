"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface CompetitorDeleteButtonProps {
  competitorId: string;
  clientId: string;
}

export function CompetitorDeleteButton({ competitorId, clientId }: CompetitorDeleteButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this competitor?")) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("competitors")
      .delete()
      .eq("id", competitorId);

    if (!error) {
      await fetch(`/api/cache/invalidate?key=cc:competitors:${clientId}`, { method: "POST" }).catch(() => {});
      window.location.reload();
    }
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
