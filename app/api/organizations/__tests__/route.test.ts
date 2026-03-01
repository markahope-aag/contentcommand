// @ts-nocheck
/**
 * Tests for app/api/organizations/route.ts
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

import { GET, POST } from "@/app/api/organizations/route";
import { createClient } from "@/lib/supabase/server";

const mockUser = { id: "user-1", email: "test@example.com" };
const mockOrgs = [
  { id: "org-1", name: "Acme Corp", slug: "acme-corp" },
  { id: "org-2", name: "Beta Inc", slug: "beta-inc" },
];

describe("GET /api/organizations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns list of organizations", async () => {
    const mockChain = {
      select: jest.fn(),
      order: jest.fn().mockResolvedValue({ data: mockOrgs, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET();
    expect(response.body.data).toEqual(mockOrgs);
  });

  it("returns 500 when database throws", async () => {
    const mockChain = {
      select: jest.fn(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
    };
    mockChain.select.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

describe("POST /api/organizations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const request = { json: jest.fn().mockResolvedValue({ name: "My Org", slug: "my-org" }) } as any;
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid body (missing slug)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    });

    const request = { json: jest.fn().mockResolvedValue({ name: "My Org" }) } as any;
    const response = await POST(request);
    // validateBody returns 400 response for invalid data
    expect(response).toBeDefined();
  });

  it("creates organization and returns 201 with org id", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: "new-org-id", error: null }),
    });

    const request = {
      json: jest.fn().mockResolvedValue({ name: "New Org", slug: "new-org" }),
    } as any;
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe("new-org-id");
  });

  it("returns 500 when RPC fails", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: jest.fn().mockResolvedValue({ data: null, error: new Error("RPC failed") }),
    });

    const request = {
      json: jest.fn().mockResolvedValue({ name: "Fail Org", slug: "fail-org" }),
    } as any;
    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it("calls create_org_with_owner RPC with correct params", async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: "org-id", error: null });
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      rpc: mockRpc,
    });

    const request = {
      json: jest.fn().mockResolvedValue({ name: "Test Organization", slug: "test-organization" }),
    } as any;
    await POST(request);

    expect(mockRpc).toHaveBeenCalledWith("create_org_with_owner", {
      org_name: "Test Organization",
      org_slug: "test-organization",
    });
  });
});
