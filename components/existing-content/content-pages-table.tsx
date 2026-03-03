import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ContentPage } from "@/types/database";

interface ContentPagesTableProps {
  pages: ContentPage[];
  count: number;
  title?: string;
}

const statusVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  active: "default",
  decaying: "destructive",
  thin: "secondary",
  opportunity: "outline",
};

export function ContentPagesTable({
  pages,
  count,
  title = "Content Inventory",
}: ContentPagesTableProps) {
  if (pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No page data available. Sync your Google Search Console data to see content performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title} ({count} pages)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 font-medium text-right">Clicks</th>
                <th className="pb-2 font-medium text-right">Impressions</th>
                <th className="pb-2 font-medium text-right">CTR</th>
                <th className="pb-2 font-medium text-right">Position</th>
                <th className="pb-2 font-medium text-right">Page Views</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 max-w-[250px] truncate font-medium" title={page.page_path}>
                    {page.page_path}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {page.clicks.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {page.impressions.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {(Number(page.ctr) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {Number(page.position).toFixed(1)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {page.page_views.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={statusVariant[page.status] ?? "outline"}>
                      {page.status}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/dashboard/content/briefs/new?keyword=${encodeURIComponent(page.page_path)}&type=optimization`}
                      >
                        Create Brief
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
