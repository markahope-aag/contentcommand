import { Badge } from "@/components/ui/badge";

interface GenerationProgressProps {
  status: string;
  qualityScore?: number | null;
}

export function GenerationProgress({ status, qualityScore }: GenerationProgressProps) {
  if (status === "generating") {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm">Generating content...</span>
      </div>
    );
  }

  if (status === "generated" || status === "reviewing" || status === "published") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-green-100 text-green-800">
          Complete
        </Badge>
        {qualityScore != null && (
          <Badge variant="secondary">Score: {qualityScore}</Badge>
        )}
      </div>
    );
  }

  return (
    <Badge variant="outline" className="bg-gray-100 text-gray-800">
      {status.replace("_", " ")}
    </Badge>
  );
}
