"use client";

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GeneratedContent } from "@/types/database";

interface ContentEditorProps {
  content: GeneratedContent;
}

export function ContentEditor({ content }: ContentEditorProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "markdown">("formatted");
  const formattedRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    if (!content.content) return;

    if (viewMode === "markdown") {
      await navigator.clipboard.writeText(content.content);
    } else if (formattedRef.current) {
      // Copy rich HTML so it pastes correctly into blog editors (WordPress, Ghost, etc.)
      const html = formattedRef.current.innerHTML;
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([content.content], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": textBlob,
        }),
      ]);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content.content, viewMode]);

  const downloadFile = useCallback(
    (format: "md" | "json") => {
      if (!content.content) return;

      let data: string;
      let filename: string;
      let mimeType: string;
      const slug = (content.title || "content")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (format === "md") {
        // Build a full markdown file with frontmatter
        const frontmatter = [
          "---",
          `title: "${(content.title || "").replace(/"/g, '\\"')}"`,
          content.meta_description
            ? `description: "${content.meta_description.replace(/"/g, '\\"')}"`
            : null,
          content.excerpt
            ? `excerpt: "${content.excerpt.replace(/"/g, '\\"')}"`
            : null,
          `word_count: ${content.word_count || 0}`,
          `date: "${new Date(content.created_at).toISOString().split("T")[0]}"`,
          "---",
          "",
        ]
          .filter(Boolean)
          .join("\n");

        data = frontmatter + content.content;
        filename = `${slug}.md`;
        mimeType = "text/markdown";
      } else {
        data = JSON.stringify(
          {
            title: content.title,
            meta_description: content.meta_description,
            excerpt: content.excerpt,
            content: content.content,
            word_count: content.word_count,
            ai_model_used: content.ai_model_used,
            internal_links_added: content.internal_links_added,
            external_references: content.external_references,
            aeo_optimizations: content.aeo_optimizations,
            quality_score: content.quality_score,
            created_at: content.created_at,
          },
          null,
          2
        );
        filename = `${slug}.json`;
        mimeType = "application/json";
      }

      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [content]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <CardTitle>{content.title || "Untitled"}</CardTitle>
            {content.meta_description && (
              <p className="text-sm text-muted-foreground">
                {content.meta_description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Badge variant="outline">{content.word_count} words</Badge>
            {content.ai_model_used && (
              <Badge variant="secondary">{content.ai_model_used}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          <div className="flex border rounded-md overflow-hidden">
            <Button
              size="sm"
              variant={viewMode === "formatted" ? "default" : "ghost"}
              className="rounded-none border-0 h-8 px-3"
              onClick={() => setViewMode("formatted")}
            >
              Formatted
            </Button>
            <Button
              size="sm"
              variant={viewMode === "markdown" ? "default" : "ghost"}
              className="rounded-none border-0 h-8 px-3"
              onClick={() => setViewMode("markdown")}
            >
              Markdown
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied
              ? "Copied!"
              : viewMode === "formatted"
                ? "Copy HTML"
                : "Copy Markdown"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadFile("md")}
          >
            Download .md
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadFile("json")}
          >
            Download .json
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {content.excerpt && (
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Excerpt</p>
            <p className="text-sm text-muted-foreground">{content.excerpt}</p>
          </div>
        )}
        {viewMode === "formatted" ? (
          <div
            ref={formattedRef}
            className="prose prose-sm max-w-none dark:prose-invert p-4 rounded-md border"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.content || "No content generated yet."}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-md max-h-[600px] overflow-y-auto">
            {content.content || "No content generated yet."}
          </div>
        )}
        {content.generation_time_seconds && (
          <p className="text-xs text-muted-foreground mt-3">
            Generated in {Number(content.generation_time_seconds).toFixed(1)}s
          </p>
        )}
      </CardContent>
    </Card>
  );
}
