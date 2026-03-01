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
import type { CompetitiveMetricsHistory } from "@/types/database";

interface CompetitiveTrendChartProps {
  data: CompetitiveMetricsHistory[];
  title?: string;
  metricLabel?: string;
}

export function CompetitiveTrendChart({
  data,
  title = "Trends",
  metricLabel = "Value",
}: CompetitiveTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No trend data available yet. Data will populate after daily analyses run.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.recorded_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: Number(d.metric_value),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
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
                dataKey="value"
                name={metricLabel}
                stroke="hsl(var(--primary))"
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
