// @ts-nocheck
/**
 * Tests for app/api/content/queue/route.ts
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

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { GET } from "@/app/api/content/queue/route";
import { createClient } from "@/lib/supabase/server";

const mockUser = { id: "user-1", email: "test@example.com" };
const mockContent = [
  { id: "c-1", title: "Article 1", status: "generated", content_briefs: { id: "b-1" } },
  { id: "c-2", title: "Article 2", status: "reviewing", content_briefs: { id: "b-2" } },
];

function makeRequest(url: string) {
  return { url } as any;
}

describe("GET /api/content/queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const response = await GET(makeRequest("http://localhost/api/content/queue"));
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns all content when no filters are applied", async () => {
    const mockChain = {
      select: jest.fn(),
      order: jest.fn().mockResolvedValue({ data: mockContent, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET(makeRequest("http://localhost/api/content/queue"));
    expect(response.body.data).toEqual(mockContent);
  });

  it("filters by clientId when provided", async () => {
    const mockEq = jest.fn();
    const mockChain = {
      select: jest.fn(),
      order: jest.fn(),
      eq: mockEq,
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockEq.mockReturnValue({ data: mockContent.slice(0, 1), error: null });

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET(makeRequest("http://localhost/api/content/queue?clientId=client-1"));
    expect(mockEq).toHaveBeenCalledWith("client_id", "client-1");
  });

  it("filters by status when provided", async () => {
    const mockEq = jest.fn();
    const mockChain = {
      select: jest.fn(),
      order: jest.fn(),
      eq: mockEq,
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockEq.mockReturnValue({ data: mockContent.slice(1), error: null });

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET(makeRequest("http://localhost/api/content/queue?status=reviewing"));
    expect(mockEq).toHaveBeenCalledWith("status", "reviewing");
  });

  it("returns 500 when database throws error", async () => {
    const mockChain = {
      select: jest.fn(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
    };
    mockChain.select.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET(makeRequest("http://localhost/api/content/queue"));
    expect(response.status).toBe(500);
  });
});
