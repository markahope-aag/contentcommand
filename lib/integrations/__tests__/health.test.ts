// @ts-nocheck
/**
 * Tests for lib/integrations/health.ts
 */

jest.mock("@/lib/integrations/dataforseo", () => ({
  dataForSEO: {
    getDomainMetrics: jest.fn(),
  },
}));

jest.mock("@/lib/integrations/frase", () => ({
  frase: {
    analyzeSerp: jest.fn(),
  },
}));

jest.mock("@/lib/integrations/llmrefs", () => ({
  getOrganizations: jest.fn(),
}));

import { checkIntegrationHealth } from "@/lib/integrations/health";
import { dataForSEO } from "@/lib/integrations/dataforseo";
import { frase } from "@/lib/integrations/frase";
import { getOrganizations } from "@/lib/integrations/llmrefs";

describe("checkIntegrationHealth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns healthy status for all integrations when all succeed", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ data: [] });
    (frase.analyzeSerp as jest.Mock).mockResolvedValue({ data: [] });
    (getOrganizations as jest.Mock).mockResolvedValue([]);

    const results = await checkIntegrationHealth();

    expect(results).toHaveLength(3);
    expect(results[0].provider).toBe("dataforseo");
    expect(results[0].status).toBe("healthy");
    expect(results[1].provider).toBe("frase");
    expect(results[1].status).toBe("healthy");
    expect(results[2].provider).toBe("llmrefs");
    expect(results[2].status).toBe("healthy");
  });

  it("returns unhealthy status for dataforseo when it fails", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockRejectedValue(new Error("DataForSEO timeout"));
    (frase.analyzeSerp as jest.Mock).mockResolvedValue({ data: [] });
    (getOrganizations as jest.Mock).mockResolvedValue([]);

    const results = await checkIntegrationHealth();

    expect(results[0].provider).toBe("dataforseo");
    expect(results[0].status).toBe("unhealthy");
    expect(results[0].error).toBe("DataForSEO timeout");
  });

  it("returns unhealthy status for frase when it fails", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ data: [] });
    (frase.analyzeSerp as jest.Mock).mockRejectedValue(new Error("Frase API error"));
    (getOrganizations as jest.Mock).mockResolvedValue([]);

    const results = await checkIntegrationHealth();

    expect(results[1].provider).toBe("frase");
    expect(results[1].status).toBe("unhealthy");
    expect(results[1].error).toBe("Frase API error");
  });

  it("returns unhealthy status for llmrefs when it fails", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ data: [] });
    (frase.analyzeSerp as jest.Mock).mockResolvedValue({ data: [] });
    (getOrganizations as jest.Mock).mockRejectedValue(new Error("LLMrefs error"));

    const results = await checkIntegrationHealth();

    expect(results[2].provider).toBe("llmrefs");
    expect(results[2].status).toBe("unhealthy");
    expect(results[2].error).toBe("LLMrefs error");
  });

  it("includes response_time in healthy results", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({ data: [] });
    (frase.analyzeSerp as jest.Mock).mockResolvedValue({ data: [] });
    (getOrganizations as jest.Mock).mockResolvedValue([]);

    const results = await checkIntegrationHealth();

    for (const result of results) {
      expect(result.response_time).toBeDefined();
      expect(typeof result.response_time).toBe("number");
    }
  });

  it("includes last_check timestamp in all results", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockResolvedValue({});
    (frase.analyzeSerp as jest.Mock).mockResolvedValue({});
    (getOrganizations as jest.Mock).mockResolvedValue([]);

    const results = await checkIntegrationHealth();

    for (const result of results) {
      expect(result.last_check).toBeDefined();
      expect(new Date(result.last_check).getTime()).not.toBeNaN();
    }
  });

  it("handles unknown error objects gracefully", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockRejectedValue("string error");
    (frase.analyzeSerp as jest.Mock).mockResolvedValue({});
    (getOrganizations as jest.Mock).mockResolvedValue([]);

    const results = await checkIntegrationHealth();

    expect(results[0].status).toBe("unhealthy");
    expect(results[0].error).toBe("Unknown error");
  });

  it("continues checking other integrations when one fails", async () => {
    (dataForSEO.getDomainMetrics as jest.Mock).mockRejectedValue(new Error("Failed"));
    (frase.analyzeSerp as jest.Mock).mockRejectedValue(new Error("Also failed"));
    (getOrganizations as jest.Mock).mockRejectedValue(new Error("All failing"));

    const results = await checkIntegrationHealth();

    expect(results).toHaveLength(3);
    expect(results.every(r => r.status === "unhealthy")).toBe(true);
  });
});
