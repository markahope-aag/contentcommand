import Link from "next/link";
import { getClients } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

export default async function ClientsPage() {
  const { data: clients } = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Link href="/dashboard/clients/new">
          <Button>Add Client</Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start tracking their content strategy and SEO performance."
              actionLabel="Add Client"
              actionHref="/dashboard/clients/new"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{client.name}</CardTitle>
                  <CardDescription>{client.domain}</CardDescription>
                </CardHeader>
                <CardContent>
                  {client.industry && (
                    <Badge variant="secondary">{client.industry}</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
