import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function IntegrationsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
