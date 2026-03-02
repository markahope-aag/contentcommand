"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RegenerateButtonProps {
  briefId: string;
  previousFeedback?: string;
}

export function RegenerateButton({ briefId, previousFeedback }: RegenerateButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(previousFeedback || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefId,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to regenerate content");
        return;
      }

      const { data } = await res.json();
      setOpen(false);
      router.push(`/dashboard/content/generation/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Regenerate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regenerate Content</DialogTitle>
          <DialogDescription>
            Provide feedback on what should be improved. The AI will use this alongside the original brief to create a better version.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="feedback">What should be improved?</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g., Make the introduction more compelling, add more specific data points, strengthen the conclusion..."
              rows={5}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {feedback.length}/5000 characters
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={loading}>
            {loading ? "Generating..." : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
