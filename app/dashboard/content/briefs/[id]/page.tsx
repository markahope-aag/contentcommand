import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles } from "lucide-react";
import { getContentBrief, getGeneratedContentByBrief } from "@/lib/supabase/queries";

interface BriefDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BriefDetailPage({ params }: BriefDetailPageProps) {
  const { id } = await params;
  const brief = await getContentBrief(id);

  if (!brief) notFound();

  const generatedContent = await getGeneratedContentByBrief(id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{brief.title}</h1>
          <p className="text-muted-foreground mt-1">
            Keyword: {brief.target_keyword}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {brief.status.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {brief.priority_level}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brief Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Content Type:</span>{" "}
              {brief.content_type?.replace("_", " ") || "Blog Post"}
            </div>
            <div>
              <span className="font-medium">Target Word Count:</span>{" "}
              {brief.target_word_count || 1500}
            </div>
            {brief.target_audience && (
              <div>
                <span className="font-medium">Target Audience:</span>{" "}
                {brief.target_audience}
              </div>
            )}
            {brief.unique_angle && (
              <div>
                <span className="font-medium">Unique Angle:</span>{" "}
                {brief.unique_angle}
              </div>
            )}
            {brief.competitive_gap && (
              <div>
                <span className="font-medium">Competitive Gap:</span>{" "}
                {brief.competitive_gap}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SEO & Authority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {brief.authority_signals && (
              <div>
                <span className="font-medium">Authority Signals:</span>{" "}
                {brief.authority_signals}
              </div>
            )}
            {brief.serp_content_analysis && (
              <div>
                <span className="font-medium">SERP Analysis:</span>{" "}
                {brief.serp_content_analysis}
              </div>
            )}
            {brief.ai_citation_opportunity && (
              <div>
                <span className="font-medium">AI Citation Opportunity:</span>{" "}
                {brief.ai_citation_opportunity}
              </div>
            )}
            {brief.controversial_positions && (
              <div>
                <span className="font-medium">Bold Positions:</span>{" "}
                {brief.controversial_positions}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {brief.required_sections && brief.required_sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {brief.required_sections.map((section, i) => (
                <li key={i}>{section}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {brief.semantic_keywords && brief.semantic_keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semantic Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {brief.semantic_keywords.map((kw, i) => (
                <Badge key={i} variant="secondary">
                  {kw}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generated Content</CardTitle>
        </CardHeader>
        <CardContent>
          {generatedContent.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No content generated"
              description="Approve this brief and generate AI-powered content from it."
            />
          ) : (
            <div className="space-y-2">
              {generatedContent.map((gc) => (
                <Link
                  key={gc.id}
                  href={`/dashboard/content/generation/${gc.id}`}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted border"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {gc.title || "Untitled"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {gc.word_count} words &middot; {gc.ai_model_used}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {gc.quality_score != null && (
                      <Badge variant="secondary">
                        Score: {gc.quality_score}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {gc.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {brief.status === "draft" && (
          <BriefActionButton briefId={brief.id} action="approve" label="Approve Brief" />
        )}
        {brief.status === "approved" && (
          <BriefActionButton briefId={brief.id} action="generate" label="Generate Content" />
        )}
        <Button variant="outline" asChild>
          <Link href="/dashboard/content/briefs">Back to Briefs</Link>
        </Button>
      </div>
    </div>
  );
}

function BriefActionButton({
  briefId,
  action,
  label,
}: {
  briefId: string;
  action: "approve" | "generate";
  label: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        const { redirect } = await import("next/navigation");
        const { isRedirectError } = await import("next/dist/client/components/redirect");

        try {
          if (action === "approve") {
            const { createClient } = await import("@/lib/supabase/server");
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { approveBrief } = await import("@/lib/content/workflow");
            await approveBrief(briefId, user.id);
          } else {
            const { generateContent } = await import("@/lib/ai/content-engine");
            await generateContent({ briefId });
          }

          redirect(`/dashboard/content/briefs/${briefId}`);
        } catch (error) {
          if (isRedirectError(error)) throw error;
          throw new Error(
            `Failed to ${action === "approve" ? "approve brief" : "generate content"}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }}
    >
      <SubmitButton loadingText={action === "approve" ? "Approving..." : "Generating..."}>
        {label}
      </SubmitButton>
    </form>
  );
}
