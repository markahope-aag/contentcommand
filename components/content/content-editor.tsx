"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GeneratedContent } from "@/types/database";

interface ContentEditorProps {
  content: GeneratedContent;
}

export function ContentEditor({ content }: ContentEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (content.content) {
      await navigator.clipboard.writeText(content.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>{content.title || "Untitled"}</CardTitle>
            {content.meta_description && (
              <p className="text-sm text-muted-foreground">
                {content.meta_description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline">{content.word_count} words</Badge>
            {content.ai_model_used && (
              <Badge variant="secondary">{content.ai_model_used}</Badge>
            )}
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {content.excerpt && (
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Excerpt</p>
            <p className="text-sm text-muted-foreground">{content.excerpt}</p>
          </div>
        )}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-md max-h-[600px] overflow-y-auto">
            {content.content || "No content generated yet."}
          </div>
        </div>
        {content.generation_time_seconds && (
          <p className="text-xs text-muted-foreground mt-3">
            Generated in {Number(content.generation_time_seconds).toFixed(1)}s
          </p>
        )}
      </CardContent>
    </Card>
  );
}
