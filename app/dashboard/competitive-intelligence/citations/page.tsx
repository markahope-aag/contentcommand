import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { CitationTracker } from "@/components/competitive/citation-tracker";
import { CitationTrendChart } from "@/components/competitive/citation-trend-chart";
import { ClientSelector } from "../client-selector";
import { SyncButton } from "./sync-button";
import { getClients, getClient, getAiCitations } from "@/lib/supabase/queries";

interface PageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function CitationsPage({ searchParams }: PageProps) {
  const { clientId: selectedClientId } = await searchParams;
  const clientsResult = await getClients();
  const clients = clientsResult.data;

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">AI Citations</h1>
        <EmptyState
          icon={Target}
          title="No clients yet"
          description="Add a client to start tracking AI citations."
          actionLabel="Add Client"
          actionHref="/dashboard/clients/new"
        />
      </div>
    );
  }

  const clientId = selectedClientId && clients.some((c) => c.id === selectedClientId)
    ? selectedClientId
    : clients[0].id;

  const [client, citations] = await Promise.all([
    getClient(clientId),
    getAiCitations(clientId),
  ]);

  // Summary stats
  const totalCitations = citations.filter((c) => c.cited).length;
  const platforms = new Set(citations.map((c) => c.platform));
  const avgSov =
    citations.length > 0
      ? Math.round(
          (citations.reduce((sum, c) => sum + (c.share_of_voice ?? 0), 0) /
            citations.length) *
            10
        ) / 10
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Citations</h1>
        <div className="flex items-center gap-3">
          <ClientSelector clients={clients} selectedClientId={clientId} />
          <SyncButton
            clientId={clientId}
            llmrefsOrgId={client?.llmrefs_org_id}
            llmrefsProjectId={client?.llmrefs_project_id}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Citations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCitations}</div>
            <p className="text-xs text-muted-foreground">
              of {citations.length} tracked queries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platforms Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{platforms.size}</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {Array.from(platforms).map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Share of Voice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgSov > 0 ? `${avgSov}%` : "—"}</div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CitationTracker citations={citations} />
        <CitationTrendChart citations={citations} />
      </div>

      {citations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Citations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Query</th>
                    <th className="pb-2 font-medium">Platform</th>
                    <th className="pb-2 font-medium">Cited</th>
                    <th className="pb-2 font-medium text-right">SOV</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {citations.slice(0, 30).map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 max-w-[200px] truncate">{c.query}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{c.platform}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {c.cited ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {c.share_of_voice != null ? `${c.share_of_voice}%` : "—"}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(c.tracked_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
