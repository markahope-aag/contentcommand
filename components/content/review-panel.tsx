"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReviewPanelProps {
  contentId: string;
  onReviewSubmitted?: () => void;
}

export function ReviewPanel({ contentId, onReviewSubmitted }: ReviewPanelProps) {
  const [action, setAction] = useState<"approve" | "revision">("approve");
  const [notes, setNotes] = useState("");
  const [revisions, setRevisions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/content/${contentId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewerNotes: notes || undefined,
          revisionRequests: revisions
            ? revisions.split("\n").filter(Boolean)
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Review submission failed");
      }

      onReviewSubmitted?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Review submission failed";
      setError(message);
      console.error("Review error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Human Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={action === "approve" ? "default" : "outline"}
            onClick={() => setAction("approve")}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant={action === "revision" ? "default" : "outline"}
            onClick={() => setAction("revision")}
          >
            Request Revision
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Reviewer Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add your review notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {action === "revision" && (
          <div className="space-y-2">
            <Label htmlFor="revisions">Revision Requests (one per line)</Label>
            <Textarea
              id="revisions"
              placeholder="Add specific revision requests..."
              value={revisions}
              onChange={(e) => setRevisions(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading
            ? "Submitting..."
            : action === "approve"
            ? "Approve Content"
            : "Request Revisions"}
        </Button>
      </CardContent>
    </Card>
  );
}
