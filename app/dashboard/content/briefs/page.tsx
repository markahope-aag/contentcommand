import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BriefCard } from "@/components/content/brief-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAllContentBriefs } from "@/lib/supabase/queries";
import { Lightbulb } from "lucide-react";

export default async function BriefsPage() {
  const briefs = await getAllContentBriefs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Briefs</h1>
        <Button asChild>
          <Link href="/dashboard/content/briefs/new">New Brief</Link>
        </Button>
      </div>

      {briefs.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No content briefs"
          description="Create your first brief to start generating AI-powered content for your clients."
          actionLabel="Create Brief"
          actionHref="/dashboard/content/briefs/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {briefs.map((brief) => (
            <BriefCard key={brief.id} brief={brief} />
          ))}
        </div>
      )}
    </div>
  );
}
