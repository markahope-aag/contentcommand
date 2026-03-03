import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SpyFuPpcKeyword } from "@/lib/integrations/spyfu";

interface PpcKeywordsTableProps {
  keywords: SpyFuPpcKeyword[];
  competitorDomain: string;
  clientId: string;
}

export function PpcKeywordsTable({ keywords, competitorDomain, clientId }: PpcKeywordsTableProps) {
  if (keywords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PPC Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No PPC keyword data available for {competitorDomain}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          PPC Keywords — {competitorDomain} ({keywords.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium text-right">Volume</th>
                <th className="pb-2 font-medium text-right">Ad Position</th>
                <th className="pb-2 font-medium text-right">Difficulty</th>
                <th className="pb-2 font-medium text-right">Advertisers</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, i) => (
                <tr key={`${kw.keyword}-${i}`} className="border-b last:border-0">
                  <td className="py-2 pr-4 max-w-[200px] truncate font-medium">
                    {kw.keyword}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {kw.searchVolume.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {kw.adPosition}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Badge
                      variant={
                        kw.keywordDifficulty > 70 ? "destructive" :
                        kw.keywordDifficulty > 40 ? "secondary" : "outline"
                      }
                    >
                      {kw.keywordDifficulty}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {kw.adCount}
                  </td>
                  <td className="py-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/dashboard/content/briefs/new?keyword=${encodeURIComponent(kw.keyword)}&clientId=${clientId}`}
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
