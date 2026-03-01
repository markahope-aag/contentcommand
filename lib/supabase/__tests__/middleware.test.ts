// @ts-nocheck
/**
 * Tests for lib/supabase/middleware.ts
 */

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/server", () => {
  const mockNext = jest.fn(() => ({
    cookies: {
      set: jest.fn(),
      getAll: jest.fn().mockReturnValue([]),
    },
    headers: {},
  }));
  const mockRedirect = jest.fn((url) => ({ redirectUrl: url, status: 302 }));
  return {
    NextResponse: {
      next: mockNext,
      redirect: mockRedirect,
    },
  };
});

jest.mock("@/lib/env", () => ({
  clientEnv: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  })),
}));

import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function makeRequest(pathname: string) {
  return {
    nextUrl: {
      pathname,
      clone: jest.fn().mockReturnValue({
        pathname,
      }),
    },
    cookies: {
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    },
    url: `http://localhost${pathname}`,
  } as any;
}

function setupAuthMock(user: any) {
  (createServerClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
  });
}

describe("updateSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns supabase response when user is authenticated on protected route", async () => {
    setupAuthMock({ id: "user-1" });

    const request = makeRequest("/dashboard");
    await updateSession(request);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("redirects to /login when unauthenticated user accesses protected route", async () => {
    setupAuthMock(null);

    const request = makeRequest("/dashboard");
    await updateSession(request);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectArg.pathname).toBe("/login");
  });

  it("does not redirect unauthenticated user on /login", async () => {
    setupAuthMock(null);

    const request = makeRequest("/login");
    await updateSession(request);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("does not redirect unauthenticated user on /signup", async () => {
    setupAuthMock(null);

    const request = makeRequest("/signup");
    await updateSession(request);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("does not redirect unauthenticated user on /auth routes", async () => {
    setupAuthMock(null);

    const request = makeRequest("/auth/callback");
    await updateSession(request);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("creates supabase client with correct credentials", async () => {
    setupAuthMock({ id: "user-1" });

    await updateSession(makeRequest("/dashboard"));

    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.any(Object)
    );
  });
});
