import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContentQueue } from "@/lib/supabase/queries";

export default async function ReviewPage() {
  const queue = await getContentQueue({ status: "generated" });

  // Also get items in reviewing status
  const reviewing = await getContentQueue({ status: "reviewing" });
  const allItems = [...queue, ...reviewing];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/content">Back to Content</Link>
        </Button>
      </div>

      {allItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No content waiting for review.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead>Words</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.title || "Untitled"}
                </TableCell>
                <TableCell>
                  {item.content_briefs?.target_keyword || "—"}
                </TableCell>
                <TableCell>{item.word_count || "—"}</TableCell>
                <TableCell>{item.ai_model_used || "—"}</TableCell>
                <TableCell>
                  {item.quality_score != null ? (
                    <Badge variant="secondary">{item.quality_score}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {item.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/content/generation/${item.id}`}>
                      Review
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
