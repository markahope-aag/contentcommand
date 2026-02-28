import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BriefCard } from "@/components/content/brief-card";
import { getAllContentBriefs } from "@/lib/supabase/queries";

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
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No content briefs yet. Create your first brief to get started.
          </p>
          <Button asChild>
            <Link href="/dashboard/content/briefs/new">Create Brief</Link>
          </Button>
        </div>
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
