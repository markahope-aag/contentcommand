"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AiCitation } from "@/types/database";

interface CitationTrendChartProps {
  citations: AiCitation[];
}

export function CitationTrendChart({ citations }: CitationTrendChartProps) {
  if (citations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Citation Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No citation trend data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by date, compute daily avg SOV
  const dateMap = new Map<string, { total: number; count: number; cited: number }>();
  for (const c of citations) {
    const date = new Date(c.tracked_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const existing = dateMap.get(date) ?? { total: 0, count: 0, cited: 0 };
    existing.total += c.share_of_voice ?? 0;
    existing.count++;
    if (c.cited) existing.cited++;
    dateMap.set(date, existing);
  }

  const chartData = Array.from(dateMap.entries()).map(([date, stats]) => ({
    date,
    sov: stats.count > 0 ? Math.round((stats.total / stats.count) * 10) / 10 : 0,
    citations: stats.cited,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Citation Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sov"
                name="Avg SOV %"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="citations"
                name="Citations"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
