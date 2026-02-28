import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient, getCompetitors, getAllContentBriefs, getContentQueue } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompetitorActions } from "@/components/clients/competitor-actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  let competitors: Awaited<ReturnType<typeof getCompetitors>> = [];
  let briefCount = 0;
  let contentCount = 0;
  try {
    const [comps, briefs, content] = await Promise.all([
      getCompetitors(id),
      getAllContentBriefs({ clientId: id }),
      getContentQueue({ clientId: id }),
    ]);
    competitors = comps;
    briefCount = briefs.length;
    contentCount = content.length;
  } catch {
    // Data may not be available yet
  }

  const keywords = Array.isArray(client.target_keywords)
    ? client.target_keywords
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">{client.domain}</p>
        </div>
        <Link href={`/dashboard/clients/${id}/edit`}>
          <Button variant="outline">Edit Client</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.industry && (
              <div>
                <span className="text-sm text-muted-foreground">Industry</span>
                <p>
                  <Badge variant="secondary">{client.industry}</Badge>
                </p>
              </div>
            )}
            {keywords.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Target Keywords
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {keywords.map((kw: string) => (
                    <Badge key={kw} variant="outline">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Competitors</span>
              <span className="font-medium">{competitors.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Content Briefs
              </span>
              <span className="font-medium">{briefCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Generated Content
              </span>
              <span className="font-medium">{contentCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Competitors</CardTitle>
            <CardDescription>
              Track and analyze competitors for {client.name}
            </CardDescription>
          </div>
          <CompetitorActions clientId={id} />
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No competitors tracked yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Strength</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.domain}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{comp.competitive_strength}/10</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
