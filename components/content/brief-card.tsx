"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentBrief } from "@/types/database";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  approved: "bg-blue-100 text-blue-800",
  generating: "bg-yellow-100 text-yellow-800",
  generated: "bg-green-100 text-green-800",
  reviewing: "bg-purple-100 text-purple-800",
  revision_requested: "bg-red-100 text-red-800",
  published: "bg-emerald-100 text-emerald-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
};

interface BriefCardProps {
  brief: ContentBrief;
  onApprove?: (id: string) => void;
  onGenerate?: (id: string) => void;
}

export function BriefCard({ brief, onApprove, onGenerate }: BriefCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">
            <Link
              href={`/dashboard/content/briefs/${brief.id}`}
              className="hover:underline"
            >
              {brief.title}
            </Link>
          </CardTitle>
          <div className="flex gap-1 shrink-0">
            <Badge variant="outline" className={STATUS_COLORS[brief.status] || ""}>
              {brief.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className={PRIORITY_COLORS[brief.priority_level] || ""}>
              {brief.priority_level}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Keyword:</span> {brief.target_keyword}
        </div>
        {brief.content_type && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Type:</span> {brief.content_type.replace("_", " ")}
          </div>
        )}
        {brief.target_word_count && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Words:</span> {brief.target_word_count}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          {brief.status === "draft" && onApprove && (
            <Button size="sm" onClick={() => onApprove(brief.id)}>
              Approve
            </Button>
          )}
          {brief.status === "approved" && onGenerate && (
            <Button size="sm" onClick={() => onGenerate(brief.id)}>
              Generate Content
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/content/briefs/${brief.id}`}>View</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
