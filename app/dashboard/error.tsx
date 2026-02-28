"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Error</h1>
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An error occurred while loading this page. Your data is safe — try
            refreshing or navigate to a different section.
          </p>
          <p className="rounded-md bg-destructive/10 p-3 font-mono text-xs text-destructive">
            {error.message || "Unknown error"}
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Back to Dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
