"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { CompetitiveMetricsHistory } from "@/types/database";

interface CompetitiveTrendChartProps {
  data: CompetitiveMetricsHistory[];
  title?: string;
  metricLabel?: string;
}

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 0 },
];

export function CompetitiveTrendChart({
  data,
  title = "Trends",
  metricLabel = "Value",
}: CompetitiveTrendChartProps) {
  const [rangeDays, setRangeDays] = useState(90);

  const filteredData = rangeDays > 0
    ? data.filter((d) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - rangeDays);
        return new Date(d.recorded_at) >= cutoff;
      })
    : data;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No trend data available yet. Run a competitive refresh or sync existing content to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = filteredData.map((d) => ({
    date: new Date(d.recorded_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: Number(d.metric_value),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                variant={rangeDays === opt.days ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setRangeDays(opt.days)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No data in the selected range.
          </p>
        ) : (
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
                  dataKey="value"
                  name={metricLabel}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={chartData.length < 30}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
