import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PipelineStatus } from "@/components/content/pipeline-status";
import { EmptyState } from "@/components/ui/empty-state";
import { getAllContentBriefs, getContentPipelineStats } from "@/lib/supabase/queries";
import { Lightbulb } from "lucide-react";

export default async function ContentPage() {
  const [stats, briefsResult] = await Promise.all([
    getContentPipelineStats(),
    getAllContentBriefs(),
  ]);

  const recentBriefs = briefsResult.data;
  const recent = recentBriefs.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/content/briefs/new">New Brief</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/content/review">Review Queue</Link>
          </Button>
        </div>
      </div>

      <PipelineStatus stats={stats} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Briefs</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                icon={Lightbulb}
                title="No briefs yet"
                description="Create your first content brief to start generating AI-powered content."
                actionLabel="Create Brief"
                actionHref="/dashboard/content/briefs/new"
              />
            ) : (
              <div className="space-y-3">
                {recent.map((brief) => (
                  <Link
                    key={brief.id}
                    href={`/dashboard/content/briefs/${brief.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                  >
                    <div>
                      <div className="text-sm font-medium">{brief.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {brief.target_keyword}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-muted">
                      {brief.status.replace("_", " ")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {recentBriefs.length > 5 && (
              <Button variant="link" asChild className="mt-2 p-0">
                <Link href="/dashboard/content/briefs">View all briefs</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/content/briefs/new">
                Generate AI Brief
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/content/briefs">
                Browse All Briefs
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/content/review">
                Review Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
