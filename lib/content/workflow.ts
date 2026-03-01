import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateCache } from "@/lib/cache";

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
  generated: ["reviewing"],
  reviewing: ["published", "revision_requested"],
  revision_requested: ["draft", "approved"],
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
