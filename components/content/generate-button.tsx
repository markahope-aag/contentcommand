"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  briefId: string;
  className?: string;
}

export function GenerateButton({ briefId, className }: GenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate content");
        return;
      }

      const { data } = await res.json();
      window.location.href = `/dashboard/content/generation/${data.id}`;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        size="sm"
        className="w-full"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Generating…
          </>
        ) : (
          "Generate Content"
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
