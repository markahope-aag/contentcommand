/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for new Stage 4 validation schemas in lib/validations.ts:
 *   - competitiveRefreshSchema
 *   - llmrefsSyncSchema
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data: any, init?: ResponseInit) => ({
      data,
      status: init?.status ?? 200,
    })),
  },
}));

import {
  competitiveRefreshSchema,
  llmrefsSyncSchema,
  validateBody,
} from "@/lib/validations";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440001";

// ── competitiveRefreshSchema ───────────────────────────────

describe("competitiveRefreshSchema", () => {
  it("accepts a valid UUID clientId", () => {
    const result = competitiveRefreshSchema.safeParse({ clientId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID clientId", () => {
    const result = competitiveRefreshSchema.safeParse({ clientId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Invalid clientId");
    }
  });

  it("rejects missing clientId", () => {
    const result = competitiveRefreshSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an empty string clientId", () => {
    const result = competitiveRefreshSchema.safeParse({ clientId: "" });
    expect(result.success).toBe(false);
  });

  it("returns parsed data with clientId on success", () => {
    const result = competitiveRefreshSchema.safeParse({ clientId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientId).toBe(VALID_UUID);
    }
  });

  it("ignores extra fields and only validates clientId", () => {
    const result = competitiveRefreshSchema.safeParse({
      clientId: VALID_UUID,
      extraField: "should-be-ignored",
    });
    // Zod strips unknown keys by default (or passes through) — schema should still succeed
    expect(result.success).toBe(true);
  });
});

// ── llmrefsSyncSchema ──────────────────────────────────────

describe("llmrefsSyncSchema", () => {
  const VALID_INPUT = {
    clientId: VALID_UUID,
    organizationId: "org-123",
    projectId: "proj-456",
  };

  it("accepts valid input with all required fields", () => {
    const result = llmrefsSyncSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID clientId", () => {
    const result = llmrefsSyncSchema.safeParse({ ...VALID_INPUT, clientId: "bad-id" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Invalid clientId");
    }
  });

  it("rejects missing organizationId", () => {
    const { organizationId: _, ...rest } = VALID_INPUT;
    const result = llmrefsSyncSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing projectId", () => {
    const { projectId: _, ...rest } = VALID_INPUT;
    const result = llmrefsSyncSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty string organizationId", () => {
    const result = llmrefsSyncSchema.safeParse({ ...VALID_INPUT, organizationId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.flatMap((i) => i.path);
      expect(paths).toContain("organizationId");
    }
  });

  it("rejects empty string projectId", () => {
    const result = llmrefsSyncSchema.safeParse({ ...VALID_INPUT, projectId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.flatMap((i) => i.path);
      expect(paths).toContain("projectId");
    }
  });

  it("trims whitespace from organizationId", () => {
    const result = llmrefsSyncSchema.safeParse({ ...VALID_INPUT, organizationId: "  org-trimmed  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationId).toBe("org-trimmed");
    }
  });

  it("trims whitespace from projectId", () => {
    const result = llmrefsSyncSchema.safeParse({ ...VALID_INPUT, projectId: "  proj-trimmed  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBe("proj-trimmed");
    }
  });

  it("returns all three fields on successful parse", () => {
    const result = llmrefsSyncSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientId).toBe(VALID_UUID);
      expect(result.data.organizationId).toBe("org-123");
      expect(result.data.projectId).toBe("proj-456");
    }
  });

  it("rejects whitespace-only organizationId after trim", () => {
    const result = llmrefsSyncSchema.safeParse({ ...VALID_INPUT, organizationId: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only projectId after trim", () => {
    const result = llmrefsSyncSchema.safeParse({ ...VALID_INPUT, projectId: "   " });
    expect(result.success).toBe(false);
  });
});

// ── validateBody integration with new schemas ──────────────

describe("validateBody with competitive schemas", () => {
  it("returns success true with competitiveRefreshSchema for valid input", () => {
    const result = validateBody(competitiveRefreshSchema, { clientId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("returns success false with 400 response for invalid competitiveRefreshSchema input", () => {
    const result = validateBody(competitiveRefreshSchema, { clientId: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.response as any).status).toBe(400);
      expect((result.response as any).data.error).toBe("Validation failed");
    }
  });

  it("returns success true with llmrefsSyncSchema for valid input", () => {
    const result = validateBody(llmrefsSyncSchema, {
      clientId: VALID_UUID,
      organizationId: "org-abc",
      projectId: "proj-xyz",
    });
    expect(result.success).toBe(true);
  });

  it("returns success false with 400 response for missing llmrefsSyncSchema fields", () => {
    const result = validateBody(llmrefsSyncSchema, { clientId: VALID_UUID });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.response as any).status).toBe(400);
      expect((result.response as any).data.details).toBeDefined();
    }
  });
});
