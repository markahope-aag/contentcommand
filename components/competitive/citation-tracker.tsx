"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AiCitation } from "@/types/database";

interface CitationTrackerProps {
  citations: AiCitation[];
}

export function CitationTracker({ citations }: CitationTrackerProps) {
  if (citations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Share of Voice by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No citation data available. Sync with LLMrefs to track AI citations.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Aggregate SOV by platform
  const platformMap = new Map<string, { total: number; count: number; cited: number }>();
  for (const c of citations) {
    const existing = platformMap.get(c.platform) ?? { total: 0, count: 0, cited: 0 };
    existing.total += c.share_of_voice ?? 0;
    existing.count++;
    if (c.cited) existing.cited++;
    platformMap.set(c.platform, existing);
  }

  const chartData = Array.from(platformMap.entries()).map(([platform, stats]) => ({
    platform,
    sov: stats.count > 0 ? Math.round((stats.total / stats.count) * 10) / 10 : 0,
    citations: stats.cited,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Share of Voice by Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="sov" name="Avg SOV %" fill="hsl(var(--primary))" />
              <Bar dataKey="citations" name="Citations" fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
