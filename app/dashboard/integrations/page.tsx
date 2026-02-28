import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/supabase/queries";
import {
  getIntegrationHealth,
  getGoogleOAuthStatus,
} from "@/lib/supabase/queries";
import { HealthStatus } from "@/components/integrations/health-status";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [clients, healthData, connectedGoogleClients] = await Promise.all([
    getClients(),
    getIntegrationHealth(),
    getGoogleOAuthStatus(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Manage API connections and monitor sync status.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">System Health</h2>
        <HealthStatus healthData={healthData} />
      </div>

      <IntegrationsClient
        clients={clients}
        healthData={healthData}
        connectedGoogleClientIds={connectedGoogleClients}
      />
    </div>
  );
}
