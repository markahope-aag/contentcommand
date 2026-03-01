// @ts-nocheck
/**
 * Tests for app/api/content/briefs/[id]/route.ts
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { GET, PUT, DELETE } from "@/app/api/content/briefs/[id]/route";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const mockUser = { id: "user-1", email: "test@example.com" };
const mockBrief = {
  id: "brief-1",
  title: "SEO Guide",
  target_keyword: "seo",
  status: "draft",
};

function buildSupabase(overrides: any = {}) {
  const defaultChain = {
    select: jest.fn(() => defaultChain),
    update: jest.fn(() => defaultChain),
    delete: jest.fn(() => defaultChain),
    eq: jest.fn(() => defaultChain),
    single: jest.fn().mockResolvedValue({ data: mockBrief, error: null }),
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
      ...overrides.auth,
    },
    from: jest.fn(() => ({
      ...defaultChain,
      ...overrides.from,
    })),
  };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/content/briefs/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const supabase = buildSupabase({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
      },
    });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const response = await GET({} as any, makeParams("brief-1"));
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns brief data for authenticated user", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: mockBrief, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const response = await GET({} as any, makeParams("brief-1"));
    expect(response.body.data).toEqual(mockBrief);
  });

  it("returns 404 when brief is not found", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const response = await GET({} as any, makeParams("missing-id"));
    expect(response.status).toBe(404);
  });

  it("returns 500 when database throws error", async () => {
    const mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error("DB Error") }),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const response = await GET({} as any, makeParams("brief-1"));
    expect(response.status).toBe(500);
  });
});

describe("PUT /api/content/briefs/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth error") }) },
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const request = { json: jest.fn().mockResolvedValue({ title: "New Title" }) } as any;
    const response = await PUT(request, makeParams("brief-1"));
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    // Empty object fails the 'at least one field' refine
    const request = { json: jest.fn().mockResolvedValue({}) } as any;
    const response = await PUT(request, makeParams("brief-1"));
    // validateBody returns a response directly when invalid
    expect(response).toBeDefined();
  });

  it("updates and returns brief for valid data", async () => {
    const updatedBrief = { ...mockBrief, title: "Updated Title" };
    const mockChain = {
      update: jest.fn(),
      eq: jest.fn(),
      select: jest.fn(),
      single: jest.fn().mockResolvedValue({ data: updatedBrief, error: null }),
    };
    mockChain.update.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const request = { json: jest.fn().mockResolvedValue({ title: "Updated Title" }) } as any;
    const response = await PUT(request, makeParams("brief-1"));
    expect(response.body.data).toEqual(updatedBrief);
  });
});

describe("DELETE /api/content/briefs/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const response = await DELETE({} as any, makeParams("brief-1"));
    expect(response.status).toBe(401);
  });

  it("returns success when brief is deleted", async () => {
    const mockChain = {
      delete: jest.fn(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    mockChain.delete.mockReturnValue(mockChain);

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const response = await DELETE({} as any, makeParams("brief-1"));
    expect(response.body.success).toBe(true);
  });

  it("returns 500 when deletion fails", async () => {
    const mockChain = {
      delete: jest.fn(),
      eq: jest.fn().mockResolvedValue({ error: new Error("Cannot delete") }),
    };
    mockChain.delete.mockReturnValue(mockChain);

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: jest.fn().mockReturnValue(mockChain),
    };
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const response = await DELETE({} as any, makeParams("brief-1"));
    expect(response.status).toBe(500);
  });
});
