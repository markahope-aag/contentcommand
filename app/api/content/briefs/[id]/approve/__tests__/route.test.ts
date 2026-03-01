// @ts-nocheck
/**
 * Tests for app/api/content/briefs/[id]/approve/route.ts
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
  transitionBriefStatus: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { PUT } from "@/app/api/content/briefs/[id]/approve/route";
import { createClient } from "@/lib/supabase/server";
import { transitionBriefStatus } from "@/lib/content/workflow";

const mockUser = { id: "user-1", email: "test@example.com" };
const mockBrief = { client_id: "client-1", status: "draft" };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PUT /api/content/briefs/[id]/approve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }) },
    });

    const response = await PUT({} as any, makeParams("brief-1"));
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 404 when brief is not found", async () => {
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

    const response = await PUT({} as any, makeParams("missing-id"));
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Brief not found");
  });

  it("returns 403 when user does not have access", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: mockBrief, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    const response = await PUT({} as any, makeParams("brief-1"));
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Access denied");
  });

  it("approves brief successfully when user has access", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: mockBrief, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (transitionBriefStatus as jest.Mock).mockResolvedValue(undefined);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await PUT({} as any, makeParams("brief-1"));
    expect(response.body.success).toBe(true);
  });

  it("calls transitionBriefStatus with correct args", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: { client_id: "client-1", status: "draft" }, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (transitionBriefStatus as jest.Mock).mockResolvedValue(undefined);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    await PUT({} as any, makeParams("brief-99"));

    expect(transitionBriefStatus).toHaveBeenCalledWith(
      "brief-99",
      "approved",
      "user-1",
      "draft"
    );
  });

  it("returns 400 when transitionBriefStatus throws", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: mockBrief, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (transitionBriefStatus as jest.Mock).mockRejectedValue(new Error("Invalid transition"));

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await PUT({} as any, makeParams("brief-1"));
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid transition");
  });
});
