// @ts-nocheck
/**
 * Tests for async functions in lib/content/workflow.ts
 * transitionBriefStatus, approveBrief, submitReview
 */

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

import { transitionBriefStatus, approveBrief, submitReview } from "@/lib/content/workflow";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateCache } from "@/lib/cache";

// Builder for a chainable Supabase mock
function buildChain(result: unknown) {
  const chain: any = {
    from: jest.fn(() => chain),
    select: jest.fn(() => chain),
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
  };
  return chain;
}

describe("transitionBriefStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches brief status when currentStatus is not provided", async () => {
    const selectChain = {
      select: jest.fn(),
    };
    const mockEq = jest.fn(() => ({
      single: jest.fn().mockResolvedValue({ data: { status: "draft" }, error: null }),
    }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await transitionBriefStatus("brief-1", "approved");
    expect(mockSelect).toHaveBeenCalledWith("status");
    expect(mockEq).toHaveBeenCalledWith("id", "brief-1");
  });

  it("skips fetching brief when currentStatus is provided", async () => {
    const mockSingle = jest.fn();
    const mockSelect = jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSingle })) }));
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await transitionBriefStatus("brief-1", "generating", undefined, "approved");
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it("sets approved_at and approved_by when transitioning to approved with userId", async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { status: "draft" }, error: null });
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));

    let capturedUpdate: Record<string, unknown> = {};
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn((data) => {
      capturedUpdate = data;
      return { eq: mockUpdateEq };
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await transitionBriefStatus("brief-1", "approved", "user-456");
    expect(capturedUpdate.approved_by).toBe("user-456");
    expect(capturedUpdate.approved_at).toBeDefined();
    expect(capturedUpdate.status).toBe("approved");
  });

  it("does NOT set approved_at/by when transitioning to non-approved status", async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { status: "approved" }, error: null });
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));

    let capturedUpdate: Record<string, unknown> = {};
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn((data) => {
      capturedUpdate = data;
      return { eq: mockUpdateEq };
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await transitionBriefStatus("brief-1", "generating", "user-456");
    expect(capturedUpdate.approved_by).toBeUndefined();
    expect(capturedUpdate.status).toBe("generating");
  });

  it("invalidates cache after successful transition", async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { status: "draft" }, error: null });
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await transitionBriefStatus("brief-1", "approved");
    expect(invalidateCache).toHaveBeenCalledWith(
      "cc:pipeline-stats:*",
      "cc:briefs:all",
      "cc:content-queue:all"
    );
  });

  it("throws when brief not found (data is null, no error)", async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
      })),
    });

    await expect(transitionBriefStatus("bad-id", "approved")).rejects.toThrow("Brief not found");
  });

  it("throws when transition is invalid", async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { status: "published" }, error: null });
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await expect(transitionBriefStatus("brief-1", "draft")).rejects.toThrow(
      "Invalid transition: published → draft"
    );
  });

  it("throws when update returns an error", async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { status: "draft" }, error: null });
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    const updateErr = new Error("Constraint violation");
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: updateErr });
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await expect(transitionBriefStatus("brief-1", "approved")).rejects.toThrow(
      "Constraint violation"
    );
  });
});

describe("approveBrief", () => {
  it("transitions brief to approved status with userId", async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { status: "draft" }, error: null });
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));

    let capturedUpdate: Record<string, unknown> = {};
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn((data) => {
      capturedUpdate = data;
      return { eq: mockUpdateEq };
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await approveBrief("brief-1", "user-789");
    expect(capturedUpdate.status).toBe("approved");
    expect(capturedUpdate.approved_by).toBe("user-789");
  });
});

describe("submitReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets status to published when action is approve", async () => {
    let capturedContentUpdate: Record<string, unknown> = {};
    let capturedBriefUpdate: Record<string, unknown> = {};

    const mockContentUpdateEq = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { brief_id: "brief-1" },
          error: null,
        }),
      })),
    }));
    const mockContentUpdate = jest.fn((data) => {
      capturedContentUpdate = data;
      return { eq: mockContentUpdateEq };
    });

    const mockBriefUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockBriefUpdate = jest.fn((data) => {
      capturedBriefUpdate = data;
      return { eq: mockBriefUpdateEq };
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === "generated_content") return { update: mockContentUpdate };
        if (table === "content_briefs") return { update: mockBriefUpdate };
        return {};
      }),
    });

    await submitReview({
      contentId: "content-1",
      action: "approve",
      reviewerNotes: "Looks great!",
    });

    expect(capturedContentUpdate.status).toBe("published");
    expect(capturedContentUpdate.reviewer_notes).toBe("Looks great!");
    expect(capturedBriefUpdate.status).toBe("published");
  });

  it("sets status to revision_requested when action is revision", async () => {
    let capturedContentUpdate: Record<string, unknown> = {};
    let capturedBriefUpdate: Record<string, unknown> = {};

    const mockContentUpdateEq = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { brief_id: "brief-1" },
          error: null,
        }),
      })),
    }));
    const mockContentUpdate = jest.fn((data) => {
      capturedContentUpdate = data;
      return { eq: mockContentUpdateEq };
    });

    const mockBriefUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockBriefUpdate = jest.fn((data) => {
      capturedBriefUpdate = data;
      return { eq: mockBriefUpdateEq };
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === "generated_content") return { update: mockContentUpdate };
        if (table === "content_briefs") return { update: mockBriefUpdate };
        return {};
      }),
    });

    await submitReview({
      contentId: "content-1",
      action: "revision",
      revisionRequests: ["Add more examples", "Fix grammar"],
    });

    expect(capturedContentUpdate.status).toBe("revision_requested");
    expect(capturedContentUpdate.revision_requests).toEqual(["Add more examples", "Fix grammar"]);
    expect(capturedBriefUpdate.status).toBe("revision_requested");
  });

  it("includes review time minutes when provided", async () => {
    let capturedUpdate: Record<string, unknown> = {};

    const mockUpdateEq = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: { brief_id: null }, error: null }),
      })),
    }));
    const mockUpdate = jest.fn((data) => {
      capturedUpdate = data;
      return { eq: mockUpdateEq };
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({ update: mockUpdate })),
    });

    await submitReview({
      contentId: "content-1",
      action: "approve",
      reviewTimeMinutes: 45,
    });

    expect(capturedUpdate.human_review_time_minutes).toBe(45);
  });

  it("invalidates cache after review submission", async () => {
    const mockUpdateEq = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: { brief_id: null }, error: null }),
      })),
    }));
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({ update: mockUpdate })),
    });

    await submitReview({ contentId: "content-1", action: "approve" });
    expect(invalidateCache).toHaveBeenCalledWith(
      "cc:pipeline-stats:*",
      "cc:briefs:all",
      "cc:content-queue:all"
    );
  });

  it("throws when content update fails", async () => {
    const dbError = new Error("Connection lost");
    const mockUpdateEq = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: dbError }),
      })),
    }));
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({ update: mockUpdate })),
    });

    await expect(
      submitReview({ contentId: "content-1", action: "approve" })
    ).rejects.toThrow("Connection lost");
  });

  it("does not update brief when no brief_id on content", async () => {
    const mockBriefUpdate = jest.fn();
    const mockUpdateEq = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: { brief_id: null }, error: null }),
      })),
    }));
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === "generated_content") return { update: mockUpdate };
        if (table === "content_briefs") return { update: mockBriefUpdate };
        return {};
      }),
    });

    await submitReview({ contentId: "content-1", action: "approve" });
    expect(mockBriefUpdate).not.toHaveBeenCalled();
  });
});
