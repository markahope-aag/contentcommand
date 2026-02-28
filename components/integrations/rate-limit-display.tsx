"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RATE_LIMITS = [
  { provider: "DataForSEO", limit: "2,000/min", icon: "🔍" },
  { provider: "Frase", limit: "500/hr", icon: "📝" },
  { provider: "Google", limit: "100/min", icon: "📊" },
  { provider: "LLMrefs", limit: "10/min", icon: "🤖" },
];

export function RateLimitDisplay() {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Rate Limits</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RATE_LIMITS.map((rl) => (
          <Card key={rl.provider}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <span>{rl.icon}</span>
                {rl.provider}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-lg font-semibold">{rl.limit}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
