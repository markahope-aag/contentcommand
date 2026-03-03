import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import { OverviewCards } from "@/components/existing-content/overview-cards";
import { ContentPagesTable } from "@/components/existing-content/content-pages-table";
import { DecayTable } from "@/components/existing-content/decay-table";
import { StrikingDistanceTable } from "@/components/existing-content/striking-distance-table";
import { CannibalizationView } from "@/components/existing-content/cannibalization-view";
import { GoogleNotConnected } from "@/components/existing-content/google-not-connected";
import { ClientSelector } from "./client-selector";
import { SyncButton } from "./sync-button";
import {
  getClients,
  getGoogleOAuthStatus,
  getContentAuditSummary,
  getContentPages,
  getDecayingPages,
  getStrikingDistanceKeywords,
  getCannibalizationGroups,
  getLatestContentAuditSync,
} from "@/lib/supabase/queries";

interface PageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function ExistingContentPage({ searchParams }: PageProps) {
  const { clientId: selectedClientId } = await searchParams;
  const clientsResult = await getClients();
  const clients = clientsResult.data;

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Existing Content</h1>
        <EmptyState
          icon={FileText}
          title="No clients yet"
          description="Add a client to start analyzing your existing content."
          actionLabel="Add Client"
          actionHref="/dashboard/clients/new"
        />
      </div>
    );
  }

  const clientId =
    selectedClientId && clients.some((c) => c.id === selectedClientId)
      ? selectedClientId
      : clients[0].id;

  const selectedClient = clients.find((c) => c.id === clientId)!;

  // Check if Google is connected for this client
  const connectedClientIds = await getGoogleOAuthStatus();
  const isGoogleConnected = connectedClientIds.includes(clientId);

  if (!isGoogleConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Existing Content</h1>
          <ClientSelector clients={clients} selectedClientId={clientId} />
        </div>
        <GoogleNotConnected clientName={selectedClient.name} />
      </div>
    );
  }

  // Queries may fail if the migration hasn't been pushed yet — handle gracefully
  let summary = {
    total_pages: 0, total_clicks: 0, total_impressions: 0,
    avg_position: 0, avg_ctr: 0, decaying_count: 0,
    thin_count: 0, opportunity_count: 0, active_count: 0,
  };
  let inventoryResult = { data: [] as import("@/types/database").ContentPage[], count: 0 };
  let topPerformersResult = { data: [] as import("@/types/database").ContentPage[], count: 0 };
  let decayingPages: import("@/types/database").ContentPage[] = [];
  let strikingKeywords: import("@/types/database").StrikingDistanceKeyword[] = [];
  let cannibalizationGroups: import("@/types/database").CannibalizationGroup[] = [];
  let lastSync: import("@/types/database").ContentAuditSync | null = null;

  try {
    [summary, inventoryResult, topPerformersResult, decayingPages, strikingKeywords, cannibalizationGroups, lastSync] =
      await Promise.all([
        getContentAuditSummary(clientId),
        getContentPages(clientId, { sortBy: "impressions", sortDir: "desc", pageSize: 50 }),
        getContentPages(clientId, { sortBy: "clicks", sortDir: "desc", pageSize: 20 }),
        getDecayingPages(clientId),
        getStrikingDistanceKeywords(clientId),
        getCannibalizationGroups(clientId),
        getLatestContentAuditSync(clientId),
      ]);
  } catch {
    // Tables/functions may not exist yet — show empty state
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Existing Content</h1>
        <div className="flex items-center gap-3">
          <ClientSelector clients={clients} selectedClientId={clientId} />
          <SyncButton clientId={clientId} />
        </div>
      </div>

      {lastSync && (
        <p className="text-sm text-muted-foreground">
          Last synced: {new Date(lastSync.completed_at ?? lastSync.started_at).toLocaleString()}
          {lastSync.status === "completed" && (
            <span className="ml-2">
              ({lastSync.pages_synced} pages, {lastSync.keywords_synced} keywords)
            </span>
          )}
          {lastSync.status === "failed" && (
            <span className="ml-2 text-red-600">
              Sync failed: {lastSync.error_message}
            </span>
          )}
        </p>
      )}

      <OverviewCards summary={summary} />

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Content Inventory</TabsTrigger>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="decay">Content Decay</TabsTrigger>
          <TabsTrigger value="striking-distance">Striking Distance</TabsTrigger>
          <TabsTrigger value="cannibalization">Cannibalization</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <ContentPagesTable
            pages={inventoryResult.data}
            count={inventoryResult.count}
            title="Content Inventory"
            clientId={clientId}
          />
        </TabsContent>

        <TabsContent value="top-performers" className="space-y-6">
          <ContentPagesTable
            pages={topPerformersResult.data}
            count={topPerformersResult.count}
            title="Top Performers"
            clientId={clientId}
          />
        </TabsContent>

        <TabsContent value="decay" className="space-y-6">
          <DecayTable pages={decayingPages} clientId={clientId} />
        </TabsContent>

        <TabsContent value="striking-distance" className="space-y-6">
          <StrikingDistanceTable keywords={strikingKeywords} clientId={clientId} />
        </TabsContent>

        <TabsContent value="cannibalization" className="space-y-6">
          <CannibalizationView groups={cannibalizationGroups} clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
