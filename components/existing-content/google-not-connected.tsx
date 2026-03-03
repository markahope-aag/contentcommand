import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GoogleNotConnectedProps {
  clientName: string;
}

export function GoogleNotConnected({ clientName }: GoogleNotConnectedProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <span className="text-2xl" aria-hidden="true">
            🔗
          </span>
        </div>
        <h3 className="text-sm font-medium">Google not connected for {clientName}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Connect Google Search Console and Analytics to analyze your existing content performance.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/dashboard/integrations">Connect Google</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
