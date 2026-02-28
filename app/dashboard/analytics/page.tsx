import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PipelineStatus } from "@/components/content/pipeline-status";
import { FileText, BarChart3, Plug } from "lucide-react";
import { AiUsageSummary } from "@/components/content/ai-usage-summary";
import {
  getClients,
  getContentPipelineStats,
  getAiUsageSummary,
  getAllContentBriefs,
  getContentQueue,
  getIntegrationHealth,
} from "@/lib/supabase/queries";

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-yellow-500" :
    score >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "healthy" ? "default" :
    status === "degraded" ? "secondary" :
    status === "down" ? "destructive" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function AnalyticsPage() {
  const [clientsResult, pipelineStats, aiUsage, briefsResult, contentQueueResult, integrationHealth] =
    await Promise.all([
      getClients(),
      getContentPipelineStats(),
      getAiUsageSummary(),
      getAllContentBriefs(),
      getContentQueue(),
      getIntegrationHealth(),
    ]);

  const clients = clientsResult.data;
  const briefs = briefsResult.data;
  const contentQueue = contentQueueResult.data;

  const totalBriefs = briefsResult.count;
  const publishedContent = contentQueue.filter((c) => c.status === "published").length;

  const scoredContent = contentQueue.filter((c) => c.quality_score != null);
  const avgQualityScore =
    scoredContent.length > 0
      ? Math.round(
          scoredContent.reduce((sum, c) => sum + (c.quality_score ?? 0), 0) /
            scoredContent.length
        )
      : 0;

  const totalAiSpend = aiUsage.totalCost;

  // Priority breakdown
  const priorityCounts = { high: 0, medium: 0, low: 0 };
  for (const b of briefs) {
    const p = b.priority_level as keyof typeof priorityCounts;
    if (p in priorityCounts) priorityCounts[p]++;
  }

  // Recent content (latest 10)
  const recentContent = contentQueue.slice(0, 10);

  // Quality: average scores across all scored content
  const avgScores = {
    authority: 0,
    expertise: 0,
    readability: 0,
    optimization: 0,
  };
  if (scoredContent.length > 0) {
    for (const c of scoredContent) {
      avgScores.authority += c.authority_score ?? 0;
      avgScores.expertise += c.expertise_score ?? 0;
      avgScores.readability += c.readability_score ?? 0;
      avgScores.optimization += c.optimization_score ?? 0;
    }
    for (const key of Object.keys(avgScores) as (keyof typeof avgScores)[]) {
      avgScores[key] = Math.round(avgScores[key] / scoredContent.length);
    }
  }

  // Top 5 / Bottom 5 by quality
  const sortedByQuality = [...scoredContent].sort(
    (a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0)
  );
  const top5 = sortedByQuality.slice(0, 5);
  const bottom5 = sortedByQuality.slice(-5).reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="content-quality">Content Quality</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* ── Overview ──────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Briefs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalBriefs}</div>
                <p className="text-xs text-muted-foreground">
                  Across {clients.length} client{clients.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Published Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{publishedContent}</div>
                <p className="text-xs text-muted-foreground">
                  {contentQueue.length} total generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{avgQualityScore}/100</div>
                <p className="text-xs text-muted-foreground">
                  {scoredContent.length} scored piece{scoredContent.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total AI Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${totalAiSpend.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All-time usage</p>
              </CardContent>
            </Card>
          </div>

          <PipelineStatus stats={pipelineStats} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">High</Badge>
                  <span className="font-semibold">{priorityCounts.high}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Medium</Badge>
                  <span className="font-semibold">{priorityCounts.medium}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Low</Badge>
                  <span className="font-semibold">{priorityCounts.low}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Content</CardTitle>
            </CardHeader>
            <CardContent>
              {recentContent.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No content yet"
                  description="Generate content from briefs to see it here."
                  actionLabel="Create Brief"
                  actionHref="/dashboard/content/briefs/new"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Title</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentContent.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 max-w-[300px] truncate">
                            {item.title ?? item.content_briefs?.title ?? "Untitled"}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant="outline">{item.status}</Badge>
                          </td>
                          <td className="py-2 text-right font-medium">
                            {item.quality_score != null ? `${item.quality_score}/100` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Usage ─────────────────────────────────── */}
        <TabsContent value="ai-usage">
          <AiUsageSummary summary={aiUsage} />
        </TabsContent>

        {/* ── Content Quality ──────────────────────────── */}
        <TabsContent value="content-quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scoredContent.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No scored content"
                  description="Generate and score content to see quality averages across all dimensions."
                  actionLabel="View Content"
                  actionHref="/dashboard/content"
                />
              ) : (
                <>
                  <ScoreBar label="Authority" score={avgScores.authority} />
                  <ScoreBar label="Expertise" score={avgScores.expertise} />
                  <ScoreBar label="Readability" score={avgScores.readability} />
                  <ScoreBar label="Optimization" score={avgScores.optimization} />
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 5 by Quality</CardTitle>
              </CardHeader>
              <CardContent>
                {top5.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No scored content yet.</p>
                ) : (
                  <div className="space-y-2">
                    {top5.map((item, i) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="truncate max-w-[250px]">
                          {i + 1}. {item.title ?? "Untitled"}
                        </span>
                        <span className="font-medium text-green-600">
                          {item.quality_score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bottom 5 by Quality</CardTitle>
              </CardHeader>
              <CardContent>
                {bottom5.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No scored content yet.</p>
                ) : (
                  <div className="space-y-2">
                    {bottom5.map((item, i) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="truncate max-w-[250px]">
                          {i + 1}. {item.title ?? "Untitled"}
                        </span>
                        <span className="font-medium text-red-600">
                          {item.quality_score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Integrations ─────────────────────────────── */}
        <TabsContent value="integrations">
          {integrationHealth.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={Plug}
                  title="No integrations configured"
                  description="Connect your SEO and analytics tools to monitor their health and performance."
                  actionLabel="Configure Integrations"
                  actionHref="/dashboard/integrations"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationHealth.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize">
                        {integration.provider}
                      </CardTitle>
                      <StatusBadge status={integration.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Errors</span>
                        <span className="font-medium">{integration.error_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Response</span>
                        <span className="font-medium">
                          {integration.avg_response_ms != null
                            ? `${integration.avg_response_ms}ms`
                            : "—"}
                        </span>
                      </div>
                      {integration.last_success && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Success</span>
                          <span className="font-medium">
                            {new Date(integration.last_success).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
