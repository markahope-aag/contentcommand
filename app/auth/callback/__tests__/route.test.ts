// @ts-nocheck
/**
 * Tests for app/auth/callback/route.ts
 */

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn((url) => ({ redirectUrl: url, status: 302 })),
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { GET } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /dashboard on successful code exchange", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }) },
    });

    const request = { url: "http://localhost/auth/callback?code=valid-code" };
    await GET(request as any);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard")
    );
  });

  it("redirects to custom next param on successful exchange", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }) },
    });

    const request = { url: "http://localhost/auth/callback?code=valid-code&next=/dashboard/clients" };
    await GET(request as any);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard/clients")
    );
  });

  it("redirects to /login?error=auth-code-error when code exchange fails", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { exchangeCodeForSession: jest.fn().mockResolvedValue({ error: new Error("Invalid code") }) },
    });

    const request = { url: "http://localhost/auth/callback?code=invalid-code" };
    await GET(request as any);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=auth-code-error")
    );
  });

  it("redirects to /login?error=auth-code-error when no code is provided", async () => {
    const request = { url: "http://localhost/auth/callback" };
    await GET(request as any);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=auth-code-error")
    );
  });
});
