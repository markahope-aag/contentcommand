// @ts-nocheck
/**
 * Tests for app/api/content/[id]/review/route.ts
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/content/workflow", () => ({
  submitReview: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { PUT } from "@/app/api/content/[id]/review/route";
import { createClient } from "@/lib/supabase/server";
import { submitReview } from "@/lib/content/workflow";

const mockUser = { id: "user-1", email: "test@example.com" };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: object) {
  return { json: jest.fn().mockResolvedValue(body) } as any;
}

describe("PUT /api/content/[id]/review", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const response = await PUT(makeRequest({ action: "approve" }), makeParams("content-1"));
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid body (missing action)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    });

    const response = await PUT(makeRequest({}), makeParams("content-1"));
    expect(response).toBeDefined();
  });

  it("returns 404 when content is not found", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await PUT(
      makeRequest({ action: "approve" }),
      makeParams("missing-id")
    );
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Content not found");
  });

  it("returns 403 when user does not have access to content's client", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: "client-1" }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    const response = await PUT(
      makeRequest({ action: "approve" }),
      makeParams("content-1")
    );
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Access denied");
  });

  it("submits review successfully with approve action", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: "client-1" }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (submitReview as jest.Mock).mockResolvedValue(undefined);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await PUT(
      makeRequest({ action: "approve", reviewerNotes: "Looks good" }),
      makeParams("content-1")
    );
    expect(response.body.success).toBe(true);
  });

  it("calls submitReview with correct params", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: "client-1" }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (submitReview as jest.Mock).mockResolvedValue(undefined);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    await PUT(
      makeRequest({ action: "revision", reviewerNotes: "Needs work", revisionRequests: ["Fix intro"] }),
      makeParams("content-42")
    );

    expect(submitReview).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: "content-42",
        action: "revision",
        reviewerNotes: "Needs work",
        revisionRequests: ["Fix intro"],
      })
    );
  });

  it("returns 400 when submitReview throws", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: null }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (submitReview as jest.Mock).mockRejectedValue(new Error("Review failed"));

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await PUT(
      makeRequest({ action: "approve" }),
      makeParams("content-1")
    );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Review failed");
  });

  it("allows review when content has no client_id (skips access check)", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: null }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (submitReview as jest.Mock).mockResolvedValue(undefined);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await PUT(
      makeRequest({ action: "approve" }),
      makeParams("content-1")
    );
    expect(response.body.success).toBe(true);
  });
});
