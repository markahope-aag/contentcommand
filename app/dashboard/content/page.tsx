import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Content</h1>
      <Card>
        <CardHeader>
          <CardTitle>Content Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Content briefs and AI-generated content will appear here. This
            feature is coming in Stage 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
