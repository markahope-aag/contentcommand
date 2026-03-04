"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  briefId: string;
  className?: string;
}

export function GenerateButton({ briefId, className }: GenerateButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingLevel, setReadingLevel] = useState("general");
  const [writingStyle, setWritingStyle] = useState("analytical");
  const [voice, setVoice] = useState("authoritative");
  const [model, setModel] = useState("claude");

  async function handleGenerate() {
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate content");
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
        <Button size="sm" className={`w-full ${className || ""}`}>
          Generate Content
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Content</DialogTitle>
          <DialogDescription>
            Customize the tone and style of the generated article.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="readingLevel">Reading Level</Label>
            <Select value={readingLevel} onValueChange={setReadingLevel}>
              <SelectTrigger id="readingLevel">
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
            <Label htmlFor="writingStyle">Writing Style</Label>
            <Select value={writingStyle} onValueChange={setWritingStyle}>
              <SelectTrigger id="writingStyle">
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
            <Label htmlFor="voice">Voice</Label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger id="voice">
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
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
