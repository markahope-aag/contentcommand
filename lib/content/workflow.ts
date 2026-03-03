import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateCache } from "@/lib/cache";

export const QUALITY_THRESHOLDS = {
  overall_score: 80,
  seo_score: 70,
  readability_score: 70,
  authority_score: 70,
  engagement_score: 70,
  aeo_score: 70,
} as const;

export interface QualityGateResult {
  passed: boolean;
  failures: { category: string; score: number; minimum: number }[];
}

export function checkQualityGate(scores: {
  overall_score: number | null;
  seo_score: number | null;
  readability_score: number | null;
  authority_score: number | null;
  engagement_score: number | null;
  aeo_score: number | null;
}): QualityGateResult {
  const failures: QualityGateResult["failures"] = [];

  for (const [key, minimum] of Object.entries(QUALITY_THRESHOLDS)) {
    const score = scores[key as keyof typeof QUALITY_THRESHOLDS] ?? 0;
    if (score < minimum) {
      const label = key === "overall_score" ? "Overall" :
        key === "seo_score" ? "SEO" :
        key === "readability_score" ? "Readability" :
        key === "authority_score" ? "Authority" :
        key === "engagement_score" ? "Engagement" : "AEO";
      failures.push({ category: label, score, minimum });
    }
  }

  return { passed: failures.length === 0, failures };
}

export type BriefStatus =
  | "draft"
  | "approved"
  | "generating"
  | "generated"
  | "reviewing"
  | "revision_requested"
  | "published";

const VALID_TRANSITIONS: Record<BriefStatus, BriefStatus[]> = {
  draft: ["approved"],
  approved: ["generating"],
  generating: ["generated"],
  generated: ["reviewing", "approved"],
  reviewing: ["published", "revision_requested"],
  revision_requested: ["draft", "approved", "generating"],
  published: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as BriefStatus];
  if (!allowed) return false;
  return allowed.includes(to as BriefStatus);
}

export async function transitionBriefStatus(
  briefId: string,
  newStatus: BriefStatus,
  userId?: string,
  currentStatus?: string
): Promise<void> {
  const admin = createAdminClient();

  // Skip the extra select when the caller already knows the current status
  let briefStatus = currentStatus;
  if (!briefStatus) {
    const { data: brief, error } = await admin
      .from("content_briefs")
      .select("status")
      .eq("id", briefId)
      .single();

    if (error || !brief) throw new Error("Brief not found");
    briefStatus = brief.status;
  }

  if (!canTransition(briefStatus!, newStatus)) {
    throw new Error(
      `Invalid transition: ${briefStatus} → ${newStatus}`
    );
  }

  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === "approved" && userId) {
    updates.approved_at = new Date().toISOString();
    updates.approved_by = userId;
  }

  const { error: updateError } = await admin
    .from("content_briefs")
    .update(updates)
    .eq("id", briefId);

  if (updateError) throw updateError;

  await invalidateCache("cc:pipeline-stats:*", "cc:briefs:all", "cc:content-queue:all");
}

export async function approveBrief(briefId: string, userId: string): Promise<void> {
  await transitionBriefStatus(briefId, "approved", userId);
}

interface ReviewSubmission {
  contentId: string;
  action: "approve" | "revision";
  reviewerNotes?: string;
  revisionRequests?: string[];
  reviewTimeMinutes?: number;
}

export async function submitReview(submission: ReviewSubmission): Promise<void> {
  const admin = createAdminClient();

  // Enforce quality gate on approval
  if (submission.action === "approve") {
    const { data: analysis } = await admin
      .from("content_quality_analysis")
      .select("overall_score, seo_score, readability_score, authority_score, engagement_score, aeo_score")
      .eq("content_id", submission.contentId)
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .single();

    if (!analysis) {
      throw new Error("Content must be scored before it can be approved. Run quality scoring first.");
    }

    const gate = checkQualityGate(analysis);
    if (!gate.passed) {
      const details = gate.failures
        .map((f) => `${f.category}: ${f.score}/${f.minimum}`)
        .join(", ");
      throw new Error(`Content does not meet quality thresholds: ${details}`);
    }
  }

  const updates: Record<string, unknown> = {
    reviewed_at: new Date().toISOString(),
    reviewer_notes: submission.reviewerNotes || null,
    human_review_time_minutes: submission.reviewTimeMinutes || null,
  };

  if (submission.action === "revision") {
    updates.revision_requests = submission.revisionRequests || [];
    updates.status = "revision_requested";
  } else {
    updates.status = "published";
    updates.approved_at = new Date().toISOString();
  }

  const { data: content, error } = await admin
    .from("generated_content")
    .update(updates)
    .eq("id", submission.contentId)
    .select("brief_id")
    .single();

  if (error) throw error;

  // Also update the brief status
  if (content?.brief_id) {
    const briefStatus = submission.action === "approve" ? "published" : "revision_requested";
    await admin
      .from("content_briefs")
      .update({ status: briefStatus })
      .eq("id", content.brief_id);
  }

  await invalidateCache("cc:pipeline-stats:*", "cc:briefs:all", "cc:content-queue:all");
}
