import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StrikingDistanceKeyword } from "@/types/database";

interface StrikingDistanceTableProps {
  keywords: StrikingDistanceKeyword[];
}

export function StrikingDistanceTable({ keywords }: StrikingDistanceTableProps) {
  if (keywords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Striking Distance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No striking distance keywords found. Sync your data to find optimization opportunities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Striking Distance ({keywords.length} keywords)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 font-medium text-right">Position</th>
                <th className="pb-2 font-medium text-right">Prev Position</th>
                <th className="pb-2 font-medium text-right">Impressions</th>
                <th className="pb-2 font-medium text-right">Clicks</th>
                <th className="pb-2 font-medium text-right">CTR</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, i) => {
                const posChange = kw.prev_position
                  ? kw.prev_position - kw.position
                  : 0;

                return (
                  <tr key={`${kw.keyword}-${kw.page_path}-${i}`} className="border-b last:border-0">
                    <td className="py-2 pr-4 max-w-[200px] truncate font-medium">
                      {kw.keyword}
                    </td>
                    <td className="py-2 pr-4 max-w-[180px] truncate text-muted-foreground" title={kw.page_path}>
                      {kw.page_path}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {Number(kw.position).toFixed(1)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <span className={posChange > 0 ? "text-green-600" : posChange < 0 ? "text-red-600" : ""}>
                        {kw.prev_position ? Number(kw.prev_position).toFixed(1) : "—"}
                        {posChange !== 0 && (
                          <span className="ml-1 text-xs">
                            ({posChange > 0 ? "+" : ""}{posChange.toFixed(1)})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {kw.impressions.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {kw.clicks.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {(Number(kw.ctr) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/dashboard/content/briefs/new?keyword=${encodeURIComponent(kw.keyword)}&type=optimization`}
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
