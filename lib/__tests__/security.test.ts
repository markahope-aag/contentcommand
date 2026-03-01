// @ts-nocheck
/**
 * Tests for lib/security.ts - CSRF protection
 * We mock clientEnv and next/server to avoid Request/NextResponse issues in Jest.
 */

// Must mock next/server before importing security.ts
jest.mock("next/server", () => {
  const json = jest.fn((body, init) => ({
    body,
    status: init?.status ?? 200,
  }));
  return {
    NextRequest: jest.fn(),
    NextResponse: { json },
  };
});

jest.mock("@/lib/env", () => ({
  clientEnv: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    NEXT_PUBLIC_APP_URL: undefined,
  })),
}));

import { csrfCheck } from "@/lib/security";
import { clientEnv } from "@/lib/env";

function makeRequest(
  method: string,
  pathname: string,
  headers: Record<string, string> = {}
) {
  const url = `https://app.example.com${pathname}`;
  return {
    method,
    nextUrl: { pathname },
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as any;
}

describe("csrfCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (clientEnv as jest.Mock).mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_APP_URL: undefined,
    });
  });

  describe("safe methods (no CSRF check needed)", () => {
    it("returns null for GET requests", () => {
      const req = makeRequest("GET", "/api/clients");
      expect(csrfCheck(req)).toBeNull();
    });

    it("returns null for HEAD requests", () => {
      const req = makeRequest("HEAD", "/api/clients");
      expect(csrfCheck(req)).toBeNull();
    });

    it("returns null for OPTIONS requests", () => {
      const req = makeRequest("OPTIONS", "/api/clients");
      expect(csrfCheck(req)).toBeNull();
    });
  });

  describe("exempt routes", () => {
    it("returns null for /api/cron/* routes (POST)", () => {
      const req = makeRequest("POST", "/api/cron/daily-analysis");
      expect(csrfCheck(req)).toBeNull();
    });

    it("returns null for /auth/* routes (POST)", () => {
      const req = makeRequest("POST", "/auth/callback");
      expect(csrfCheck(req)).toBeNull();
    });

    it("returns null for non-API POST routes", () => {
      const req = makeRequest("POST", "/dashboard/clients");
      expect(csrfCheck(req)).toBeNull();
    });
  });

  describe("API route CSRF enforcement", () => {
    it("returns 400 when host header is missing", () => {
      const req = makeRequest("POST", "/api/clients", {
        origin: "https://app.example.com",
        // no host header
      });
      const res = csrfCheck(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(400);
    });

    it("returns 403 when no origin or referer is present", () => {
      const req = makeRequest("POST", "/api/clients", {
        host: "app.example.com",
      });
      const res = csrfCheck(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
    });

    it("returns null when origin matches localhost host", () => {
      const req = makeRequest("POST", "/api/clients", {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      });
      expect(csrfCheck(req)).toBeNull();
    });

    it("returns null when origin matches https host", () => {
      const req = makeRequest("POST", "/api/clients", {
        host: "app.example.com",
        origin: "https://app.example.com",
      });
      expect(csrfCheck(req)).toBeNull();
    });

    it("returns 403 when origin does not match host", () => {
      const req = makeRequest("POST", "/api/clients", {
        host: "app.example.com",
        origin: "https://evil.com",
      });
      const res = csrfCheck(req);
      expect(res?.status).toBe(403);
    });

    it("uses referer as fallback when origin is absent", () => {
      const req = makeRequest("POST", "/api/clients", {
        host: "app.example.com",
        referer: "https://app.example.com/dashboard",
      });
      expect(csrfCheck(req)).toBeNull();
    });

    it("returns 403 when referer origin does not match host", () => {
      const req = makeRequest("POST", "/api/clients", {
        host: "app.example.com",
        referer: "https://evil.com/page",
      });
      const res = csrfCheck(req);
      expect(res?.status).toBe(403);
    });

    it("allows configured NEXT_PUBLIC_APP_URL as origin", () => {
      (clientEnv as jest.Mock).mockReturnValue({
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_APP_URL: "https://myapp.vercel.app",
      });

      const req = makeRequest("POST", "/api/clients", {
        host: "different-host.com",
        origin: "https://myapp.vercel.app",
      });
      expect(csrfCheck(req)).toBeNull();
    });

    it("handles DELETE and PATCH methods the same as POST", () => {
      const deletReq = makeRequest("DELETE", "/api/clients/123", {
        host: "app.example.com",
      });
      expect(csrfCheck(deletReq)?.status).toBe(403);

      const patchReq = makeRequest("PATCH", "/api/clients/123", {
        host: "app.example.com",
        origin: "https://app.example.com",
      });
      expect(csrfCheck(patchReq)).toBeNull();
    });
  });
});
