import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ContentPage } from "@/types/database";

interface DecayTableProps {
  pages: ContentPage[];
}

export function DecayTable({ pages }: DecayTableProps) {
  if (pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Decay</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No decaying content detected. Your content is holding steady.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Content Decay ({pages.length} pages)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 font-medium text-right">Current Clicks</th>
                <th className="pb-2 font-medium text-right">Prev Clicks</th>
                <th className="pb-2 font-medium text-right">Change</th>
                <th className="pb-2 font-medium text-right">Position</th>
                <th className="pb-2 font-medium text-right">Prev Position</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const clickChange =
                  page.prev_clicks > 0
                    ? ((page.clicks - page.prev_clicks) / page.prev_clicks) * 100
                    : 0;

                return (
                  <tr key={page.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 max-w-[250px] truncate font-medium" title={page.page_path}>
                      {page.page_path}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {page.clicks.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {page.prev_clicks.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right text-red-600 font-medium">
                      {clickChange.toFixed(1)}%
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {Number(page.position).toFixed(1)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {Number(page.prev_position).toFixed(1)}
                    </td>
                    <td className="py-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/dashboard/content/briefs/new?keyword=${encodeURIComponent(page.page_path)}&type=refresh`}
                        >
                          Create Brief
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
