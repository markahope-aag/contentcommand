// @ts-nocheck
/**
 * Tests for app/api/organizations/[id]/members/route.ts
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

import { GET, POST } from "@/app/api/organizations/[id]/members/route";
import { createClient } from "@/lib/supabase/server";

const mockUser = { id: "user-1", email: "test@example.com" };
const mockMembers = [
  { id: "m-1", org_id: "org-1", user_id: "user-1", role: "owner" },
  { id: "m-2", org_id: "org-1", user_id: "user-2", role: "member" },
];

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/organizations/[id]/members", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const response = await GET({} as any, makeParams("org-1"));
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns list of organization members", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn().mockResolvedValue({ data: mockMembers, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET({} as any, makeParams("org-1"));
    expect(response.body.data).toEqual(mockMembers);
  });

  it("returns 500 when database throws error", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const response = await GET({} as any, makeParams("org-1"));
    expect(response.status).toBe(500);
  });

  it("queries organization_members with correct org_id", async () => {
    const mockFrom = jest.fn();
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockFrom.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: mockFrom,
    });

    await GET({} as any, makeParams("my-org-id"));

    expect(mockFrom).toHaveBeenCalledWith("organization_members");
    expect(mockChain.eq).toHaveBeenCalledWith("org_id", "my-org-id");
  });
});

describe("POST /api/organizations/[id]/members", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth") }) },
    });

    const request = { json: jest.fn().mockResolvedValue({ userId: "user-2", role: "member" }) } as any;
    const response = await POST(request, makeParams("org-1"));
    expect(response.status).toBe(401);
  });

  it("returns error for invalid body (missing userId)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    });

    // Missing userId should fail validation
    const request = { json: jest.fn().mockResolvedValue({ role: "member" }) } as any;
    const response = await POST(request, makeParams("org-1"));
    expect(response).toBeDefined();
    // validateBody returns a response directly with status 400
    expect(response.status).not.toBe(201);
  });

  it("adds member and returns 201 with member data", async () => {
    const newMember = { id: "m-3", org_id: "org-1", user_id: "550e8400-e29b-41d4-a716-446655440003", role: "member" };
    const mockChain = {
      insert: jest.fn(),
      select: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: newMember, error: null }),
    };
    mockChain.insert.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const request = { json: jest.fn().mockResolvedValue({ userId: "550e8400-e29b-41d4-a716-446655440003", role: "member" }) } as any;
    const response = await POST(request, makeParams("org-1"));
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(newMember);
  });

  it("returns 500 when database throws error", async () => {
    const mockChain = {
      insert: jest.fn(),
      select: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error("Insert failed") }),
    };
    mockChain.insert.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const request = { json: jest.fn().mockResolvedValue({ userId: "550e8400-e29b-41d4-a716-446655440003", role: "member" }) } as any;
    const response = await POST(request, makeParams("org-1"));
    expect(response.status).toBe(500);
  });

  it("inserts with correct org_id, user_id, and role", async () => {
    const mockInsert = jest.fn();
    const mockChain = {
      insert: mockInsert,
      select: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    mockInsert.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);

    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    });

    const validUUID = "550e8400-e29b-41d4-a716-446655440099";
    const request = { json: jest.fn().mockResolvedValue({ userId: validUUID, role: "admin" }) } as any;
    await POST(request, makeParams("my-org"));

    expect(mockInsert).toHaveBeenCalledWith({
      org_id: "my-org",
      user_id: validUUID,
      role: "admin",
    });
  });
});
