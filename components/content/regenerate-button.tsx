"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GenerationProgress } from "@/components/content/generation-progress";

interface RegenerateButtonProps {
  briefId: string;
  previousFeedback?: string;
}

export function RegenerateButton({ briefId, previousFeedback }: RegenerateButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(previousFeedback || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingLevel, setReadingLevel] = useState("general");
  const [writingStyle, setWritingStyle] = useState("analytical");
  const [voice, setVoice] = useState("authoritative");
  const [model, setModel] = useState("claude");

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefId,
          model,
          readingLevel,
          writingStyle,
          voice,
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
      window.location.href = `/dashboard/content/generation/${data.id}`;
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
            Adjust the tone and style, and provide feedback on what should be improved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="regen-readingLevel">Reading Level</Label>
              <Select value={readingLevel} onValueChange={setReadingLevel}>
                <SelectTrigger id="regen-readingLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regen-writingStyle">Writing Style</Label>
              <Select value={writingStyle} onValueChange={setWritingStyle}>
                <SelectTrigger id="regen-writingStyle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analytical">Analytical</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="provocative">Provocative</SelectItem>
                  <SelectItem value="storytelling">Storytelling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regen-voice">Voice</Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger id="regen-voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="collaborative">Collaborative</SelectItem>
                  <SelectItem value="journalistic">Journalistic</SelectItem>
                  <SelectItem value="practitioner">Practitioner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regen-model">AI Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="regen-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback">What should be improved?</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g., Make the introduction more compelling, add more specific data points, strengthen the conclusion..."
              rows={4}
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
        <GenerationProgress isActive={loading} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Generating…
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
