import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentQualityAnalysis } from "@/types/database";

interface ScoreBarProps {
  label: string;
  score: number | null;
}

function ScoreBar({ label, score }: ScoreBarProps) {
  const value = score ?? 0;
  const color =
    value >= 80 ? "bg-green-500" :
    value >= 60 ? "bg-yellow-500" :
    value >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface QualityScoreDisplayProps {
  analysis: ContentQualityAnalysis | null;
}

export function QualityScoreDisplay({ analysis }: QualityScoreDisplayProps) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quality Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No quality analysis available yet. Run scoring to see results.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overallScore = analysis.overall_score ?? 0;
  const overallColor =
    overallScore >= 80 ? "text-green-600" :
    overallScore >= 60 ? "text-yellow-600" :
    overallScore >= 40 ? "text-orange-600" : "text-red-600";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Quality Scores</CardTitle>
          <span className={`text-2xl font-bold ${overallColor}`}>
            {overallScore}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScoreBar label="SEO" score={analysis.seo_score} />
        <ScoreBar label="Readability" score={analysis.readability_score} />
        <ScoreBar label="Authority" score={analysis.authority_score} />
        <ScoreBar label="Engagement" score={analysis.engagement_score} />
        <ScoreBar label="AEO" score={analysis.aeo_score} />
      </CardContent>
    </Card>
  );
}
