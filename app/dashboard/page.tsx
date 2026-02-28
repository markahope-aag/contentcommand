import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PipelineStatus } from "@/components/content/pipeline-status";
import { FileText } from "lucide-react";
import {
  getContentPipelineStats,
  getContentQueue,
  getAiUsageSummary,
} from "@/lib/supabase/queries";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [clientsRes, briefsRes, contentRes, citationsRes, pipelineStats, recentContent, aiUsage] =
    await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("content_briefs").select("id", { count: "exact", head: true }),
      supabase.from("generated_content").select("id", { count: "exact", head: true }),
      supabase.from("ai_citations").select("id", { count: "exact", head: true }),
      getContentPipelineStats(),
      getContentQueue(),
      getAiUsageSummary(),
    ]);

  const clientCount = clientsRes.count ?? 0;
  const briefCount = briefsRes.count ?? 0;
  const contentCount = contentRes.count ?? 0;
  const citationCount = citationsRes.count ?? 0;
  const recent5 = recentContent.slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Content Briefs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{briefCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Generated Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              AI Citations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{citationCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineStatus stats={pipelineStats} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${aiUsage.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((aiUsage.totalInputTokens + aiUsage.totalOutputTokens) / 1000).toFixed(1)}k tokens used
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Content</CardTitle>
        </CardHeader>
        <CardContent>
          {recent5.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No content yet"
              description="Create your first content brief to start generating AI-powered content."
              actionLabel="Create Brief"
              actionHref="/dashboard/content/briefs/new"
            />
          ) : (
            <div className="space-y-3">
              {recent5.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.title ?? item.content_briefs?.title ?? "Untitled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline">{item.status}</Badge>
                    {item.quality_score != null && (
                      <span className="text-sm font-medium">{item.quality_score}/100</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
