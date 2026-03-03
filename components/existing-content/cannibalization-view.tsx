import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CannibalizationGroup } from "@/types/database";

interface CannibalizationViewProps {
  groups: CannibalizationGroup[];
  clientId: string;
}

export function CannibalizationView({ groups, clientId }: CannibalizationViewProps) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keyword Cannibalization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No cannibalization detected. Each keyword maps to a single page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">
        Keyword Cannibalization ({groups.length} keywords)
      </h3>
      {groups.map((group) => (
        <Card key={group.keyword}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                &ldquo;{group.keyword}&rdquo;
                <span className="ml-2 text-muted-foreground font-normal">
                  {group.pages.length} competing pages
                </span>
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/dashboard/content/briefs/new?keyword=${encodeURIComponent(group.keyword)}&type=consolidation&clientId=${clientId}`}
                >
                  Create Brief
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Page</th>
                    <th className="pb-2 font-medium text-right">Position</th>
                    <th className="pb-2 font-medium text-right">Clicks</th>
                    <th className="pb-2 font-medium text-right">Impressions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.pages.map((page, i) => (
                    <tr key={`${page.page_path}-${i}`} className="border-b last:border-0">
                      <td className="py-2 pr-4 max-w-[300px] truncate" title={page.page_path}>
                        {page.page_path}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {Number(page.position).toFixed(1)}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {page.clicks.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {page.impressions.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
