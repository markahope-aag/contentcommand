"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  contentId: string;
  existingToken?: string | null;
}

export function ShareButton({ contentId, existingToken }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "copied">("idle");

  async function handleShare() {
    // If we already have a token, just copy the link
    if (existingToken) {
      const url = `${window.location.origin}/share/${existingToken}`;
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch(`/api/content/${contentId}/share`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await navigator.clipboard.writeText(data.url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <Button variant="outline" onClick={handleShare} disabled={status === "loading"}>
      {status === "copied"
        ? "Link Copied!"
        : status === "loading"
          ? "Creating Link..."
          : "Share"}
    </Button>
  );
}
