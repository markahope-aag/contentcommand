import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUALITY_THRESHOLDS } from "@/lib/content/workflow";
import type { ContentQualityAnalysis } from "@/types/database";

interface ScoreBarProps {
  label: string;
  score: number | null;
  threshold: number;
}

function ScoreBar({ label, score, threshold }: ScoreBarProps) {
  const value = score ?? 0;
  const passed = value >= threshold;
  const color = passed ? "bg-green-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={`font-medium ${passed ? "text-green-600" : "text-red-600"}`}>
          {value}/{threshold}
        </span>
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
  const overallPassed = overallScore >= QUALITY_THRESHOLDS.overall_score;
  const overallColor = overallPassed ? "text-green-600" : "text-red-600";

  const allPassed = overallPassed &&
    (analysis.seo_score ?? 0) >= QUALITY_THRESHOLDS.seo_score &&
    (analysis.readability_score ?? 0) >= QUALITY_THRESHOLDS.readability_score &&
    (analysis.authority_score ?? 0) >= QUALITY_THRESHOLDS.authority_score &&
    (analysis.engagement_score ?? 0) >= QUALITY_THRESHOLDS.engagement_score &&
    (analysis.aeo_score ?? 0) >= QUALITY_THRESHOLDS.aeo_score;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Quality Scores</CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {allPassed ? "PASS" : "FAIL"}
            </span>
            <span className={`text-2xl font-bold ${overallColor}`}>
              {overallScore}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScoreBar label="SEO" score={analysis.seo_score} threshold={QUALITY_THRESHOLDS.seo_score} />
        <ScoreBar label="Readability" score={analysis.readability_score} threshold={QUALITY_THRESHOLDS.readability_score} />
        <ScoreBar label="Authority" score={analysis.authority_score} threshold={QUALITY_THRESHOLDS.authority_score} />
        <ScoreBar label="Engagement" score={analysis.engagement_score} threshold={QUALITY_THRESHOLDS.engagement_score} />
        <ScoreBar label="AEO" score={analysis.aeo_score} threshold={QUALITY_THRESHOLDS.aeo_score} />
      </CardContent>
    </Card>
  );
}
