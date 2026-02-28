import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContentEditor } from "@/components/content/content-editor";
import { QualityScoreDisplay } from "@/components/content/quality-score-display";
import { ReviewPanel } from "@/components/content/review-panel";
import { getGeneratedContent, getQualityAnalysis, getContentBrief } from "@/lib/supabase/queries";

interface GenerationPageProps {
  params: Promise<{ id: string }>;
}

export default async function GenerationPage({ params }: GenerationPageProps) {
  const { id } = await params;
  const content = await getGeneratedContent(id);

  if (!content) notFound();

  const [quality, brief] = await Promise.all([
    getQualityAnalysis(id),
    content.brief_id ? getContentBrief(content.brief_id) : null,
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {content.title || "Generated Content"}
          </h1>
          {brief && (
            <p className="text-muted-foreground mt-1">
              Brief: {brief.title} &middot; Keyword: {brief.target_keyword}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <ScoreButton contentId={id} />
          {brief && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/content/briefs/${brief.id}`}>
                View Brief
              </Link>
            </Button>
          )}
        </div>
      </div>

      <ContentEditor content={content} />

      <div className="grid gap-4 md:grid-cols-2">
        <QualityScoreDisplay analysis={quality} />
        {(content.status === "generated" || content.status === "reviewing") && (
          <ReviewPanel contentId={id} />
        )}
      </div>

      <Button variant="outline" asChild>
        <Link href="/dashboard/content">Back to Content</Link>
      </Button>
    </div>
  );
}

function ScoreButton({ contentId }: { contentId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { redirect } = await import("next/navigation");
        const { isRedirectError } = await import("next/dist/client/components/redirect");

        try {
          const { scoreContent } = await import("@/lib/ai/content-engine");
          await scoreContent(contentId);

          redirect(`/dashboard/content/generation/${contentId}`);
        } catch (error) {
          if (isRedirectError(error)) throw error;
          throw new Error(
            `Failed to score content: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }}
    >
      <Button type="submit" variant="outline">
        Run Quality Scoring
      </Button>
    </form>
  );
}
