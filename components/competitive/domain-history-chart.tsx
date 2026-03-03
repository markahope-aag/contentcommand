"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpyFuDomainStatsEntry } from "@/lib/integrations/spyfu";

interface DomainHistoryChartProps {
  data: SpyFuDomainStatsEntry[];
  domain: string;
}

export function DomainHistoryChart({ data, domain }: DomainHistoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domain History — {domain}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No historical data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .sort((a, b) => {
      if (a.searchYear !== b.searchYear) return a.searchYear - b.searchYear;
      return a.searchMonth - b.searchMonth;
    })
    .map((entry) => ({
      date: `${entry.searchYear}-${String(entry.searchMonth).padStart(2, "0")}`,
      organicClicks: entry.monthlyOrganicClicks,
      organicValue: Math.round(entry.monthlyOrganicValue),
      ppcBudget: Math.round(entry.monthlyBudget),
      organicKeywords: entry.totalOrganicResults,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Domain History — {domain}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="organicClicks"
              name="Organic Clicks"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="organicValue"
              name="Organic Value ($)"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ppcBudget"
              name="PPC Budget ($)"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
