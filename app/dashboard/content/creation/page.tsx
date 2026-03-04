import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GenerateButton } from "@/components/content/generate-button";
import { RegenerateButton } from "@/components/content/regenerate-button";
import { getAllContentBriefs, getContentQueue } from "@/lib/supabase/queries";
import { Sparkles, Loader2 } from "lucide-react";

export default async function ContentCreationPage() {
  const [approvedResult, generatingResult, generatedResult, reviewingResult, revisionResult] =
    await Promise.all([
      getAllContentBriefs({ status: "approved" }),
      getAllContentBriefs({ status: "generating" }),
      getContentQueue({ status: "generated" }),
      getContentQueue({ status: "reviewing" }),
      getAllContentBriefs({ status: "revision_requested" }),
    ]);

  const approved = approvedResult.data;
  const generating = generatingResult.data;
  const generated = generatedResult.data;
  const reviewing = reviewingResult.data;
  const revision = revisionResult.data;

  const isEmpty =
    approved.length === 0 &&
    generating.length === 0 &&
    generated.length === 0 &&
    reviewing.length === 0 &&
    revision.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Creation</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/content/briefs">View All Briefs</Link>
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Sparkles}
          title="No content in the pipeline"
          description="Approve briefs to start generating content. Head to Briefs to create or approve one."
          actionLabel="Go to Briefs"
          actionHref="/dashboard/content/briefs"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Ready to Generate */}
          <PipelineColumn
            title="Ready to Generate"
            count={approved.length}
            color="bg-blue-500"
          >
            {approved.map((brief) => (
              <Card key={brief.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm leading-tight">
                    <Link
                      href={`/dashboard/content/briefs/${brief.id}`}
                      className="hover:underline"
                    >
                      {brief.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {brief.target_keyword}
                  </div>
                  {brief.target_word_count && (
                    <div className="text-xs text-muted-foreground">
                      {brief.target_word_count} words
                    </div>
                  )}
                  <GenerateButton briefId={brief.id} />
                </CardContent>
              </Card>
            ))}
          </PipelineColumn>

          {/* Generating */}
          <PipelineColumn
            title="Generating"
            count={generating.length}
            color="bg-yellow-500"
          >
            {generating.map((brief) => (
              <Card key={brief.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm leading-tight">
                    {brief.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {brief.target_keyword}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating…
                  </div>
                </CardContent>
              </Card>
            ))}
          </PipelineColumn>

          {/* Ready for Review */}
          <PipelineColumn
            title="Ready for Review"
            count={generated.length + reviewing.length}
            color="bg-green-500"
          >
            {[...generated, ...reviewing].map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm leading-tight">
                    <Link
                      href={`/dashboard/content/generation/${item.id}`}
                      className="hover:underline"
                    >
                      {item.title || "Untitled"}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {item.content_briefs?.target_keyword || "—"}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {item.word_count && (
                      <span className="text-muted-foreground">
                        {item.word_count} words
                      </span>
                    )}
                    {item.quality_score != null && (
                      <Badge variant="secondary" className="text-xs">
                        Score: {item.quality_score}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link href={`/dashboard/content/generation/${item.id}`}>
                      Review
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </PipelineColumn>

          {/* Needs Revision */}
          <PipelineColumn
            title="Needs Revision"
            count={revision.length}
            color="bg-red-500"
          >
            {revision.map((brief) => (
              <Card key={brief.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm leading-tight">
                    <Link
                      href={`/dashboard/content/briefs/${brief.id}`}
                      className="hover:underline"
                    >
                      {brief.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {brief.target_keyword}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/dashboard/content/briefs/${brief.id}`}>
                        View Brief
                      </Link>
                    </Button>
                    <div className="flex-1">
                      <RegenerateButton briefId={brief.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </PipelineColumn>
        </div>
      )}
    </div>
  );
}

function PipelineColumn({
  title,
  count,
  color,
  children,
}: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          {count}
        </Badge>
      </div>
      <div className="space-y-3 min-h-[100px]">
        {count === 0 && (
          <p className="text-xs text-muted-foreground pt-4 text-center">
            No items
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
