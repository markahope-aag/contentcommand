// @ts-nocheck
/**
 * Tests for lib/integrations/llmrefs.ts
 */

const mockOrganizationsList = jest.fn();
const mockProjectsList = jest.fn();
const mockKeywordsList = jest.fn();
const mockKeywordsGet = jest.fn();
const mockKeywordsSearchEngines = jest.fn();
const mockKeywordsLocations = jest.fn();

jest.mock("llmrefs", () => ({
  __esModule: true,
  LLMrefs: jest.fn().mockImplementation(() => ({
    organizations: { list: mockOrganizationsList },
    projects: { list: mockProjectsList },
    keywords: {
      list: mockKeywordsList,
      get: mockKeywordsGet,
      searchEngines: mockKeywordsSearchEngines,
      locations: mockKeywordsLocations,
    },
  })),
}), { virtual: true });

jest.mock("@/lib/integrations/redis", () => ({
  getCached: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
  getRateLimiter: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ then: jest.fn() })),
      upsert: jest.fn(() => ({ then: jest.fn() })),
    })),
  })),
}));

jest.mock("@/lib/env", () => ({
  serverEnv: jest.fn(() => ({
    LLMREFS_API_KEY: "test-llmrefs-key",
  })),
}));

jest.mock("@/lib/integrations/base", () => {
  class RateLimitError extends Error {
    constructor(provider, retryAfter) {
      super(`Rate limit exceeded for ${provider}`);
      this.provider = provider;
      this.retryAfter = retryAfter;
      this.name = "RateLimitError";
    }
  }
  return { RateLimitError };
});

import {
  getOrganizations,
  getProjects,
  getKeywords,
  getKeywordDetail,
  getSearchEngines,
  getLocations,
} from "@/lib/integrations/llmrefs";
import { getCached, setCache, getRateLimiter } from "@/lib/integrations/redis";

describe("llmrefs integration", () => {
  let mockLimiter: { limit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true, reset: 0 }) };
    (getRateLimiter as jest.Mock).mockReturnValue(mockLimiter);
    (getCached as jest.Mock).mockResolvedValue(null);
  });

  describe("getOrganizations", () => {
    it("returns organization list from API", async () => {
      const mockOrgs = [{ id: "org-1", name: "Acme Corp" }];
      mockOrganizationsList.mockResolvedValue(mockOrgs);

      const result = await getOrganizations();
      expect(result).toEqual(mockOrgs);
      expect(mockOrganizationsList).toHaveBeenCalledTimes(1);
    });

    it("returns cached value when available", async () => {
      const cachedOrgs = [{ id: "org-cached", name: "Cached Org" }];
      (getCached as jest.Mock).mockResolvedValueOnce(cachedOrgs);

      const result = await getOrganizations();
      expect(result).toEqual(cachedOrgs);
      expect(mockOrganizationsList).not.toHaveBeenCalled();
    });

    it("throws RateLimitError when rate limit exceeded", async () => {
      mockLimiter.limit.mockResolvedValue({ success: false, reset: 60000 });

      await expect(getOrganizations()).rejects.toThrow("Rate limit exceeded for llmrefs");
    });

    it("caches result after successful API call", async () => {
      mockOrganizationsList.mockResolvedValue([{ id: "org-1" }]);
      await getOrganizations();
      expect(setCache).toHaveBeenCalledWith(
        "llmrefs:orgs",
        [{ id: "org-1" }],
        expect.any(Number)
      );
    });

    it("throws when API call fails", async () => {
      mockOrganizationsList.mockRejectedValue(new Error("API error"));
      await expect(getOrganizations()).rejects.toThrow("API error");
    });
  });

  describe("getProjects", () => {
    it("calls projects.list with organizationId", async () => {
      const mockProjects = [{ id: "proj-1", name: "Project 1" }];
      mockProjectsList.mockResolvedValue(mockProjects);

      const result = await getProjects("org-1");
      expect(result).toEqual(mockProjects);
      expect(mockProjectsList).toHaveBeenCalledWith({ organizationId: "org-1" });
    });

    it("uses org-specific cache key", async () => {
      mockProjectsList.mockResolvedValue([]);
      await getProjects("org-2");
      expect(setCache).toHaveBeenCalledWith(
        "llmrefs:projects:org-2",
        [],
        expect.any(Number)
      );
    });
  });

  describe("getKeywords", () => {
    it("calls keywords.list with org and project IDs", async () => {
      const mockKeywords = [{ id: "kw-1", keyword: "seo tools" }];
      mockKeywordsList.mockResolvedValue(mockKeywords);

      const result = await getKeywords("org-1", "proj-1", "client-1");
      expect(result).toEqual(mockKeywords);
      expect(mockKeywordsList).toHaveBeenCalledWith({
        organizationId: "org-1",
        projectId: "proj-1",
      });
    });
  });

  describe("getKeywordDetail", () => {
    it("calls keywords.get with all parameters", async () => {
      const mockDetail = { id: "kw-1", citations: [] };
      mockKeywordsGet.mockResolvedValue(mockDetail);

      await getKeywordDetail("org-1", "proj-1", "kw-1");
      expect(mockKeywordsGet).toHaveBeenCalledWith({
        keywordId: "kw-1",
        projectId: "proj-1",
        organizationId: "org-1",
      });
    });

    it("includes searchEngines filter when provided", async () => {
      mockKeywordsGet.mockResolvedValue({});
      await getKeywordDetail("org-1", "proj-1", "kw-1", "client-1", ["chatgpt", "gemini"]);
      expect(mockKeywordsGet).toHaveBeenCalledWith(
        expect.objectContaining({ searchEngines: ["chatgpt", "gemini"] })
      );
    });

    it("uses search engine filter in cache key", async () => {
      mockKeywordsGet.mockResolvedValue({});
      await getKeywordDetail("org-1", "proj-1", "kw-1", undefined, ["chatgpt"]);
      expect(setCache).toHaveBeenCalledWith(
        "llmrefs:keyword:kw-1:chatgpt",
        {},
        expect.any(Number)
      );
    });
  });

  describe("getSearchEngines", () => {
    it("returns search engines list", async () => {
      const mockEngines = [{ id: "chatgpt" }, { id: "gemini" }];
      mockKeywordsSearchEngines.mockResolvedValue(mockEngines);

      const result = await getSearchEngines();
      expect(result).toEqual(mockEngines);
    });
  });

  describe("getLocations", () => {
    it("returns locations list", async () => {
      const mockLocations = [{ code: "US", name: "United States" }];
      mockKeywordsLocations.mockResolvedValue(mockLocations);

      const result = await getLocations();
      expect(result).toEqual(mockLocations);
    });
  });
});
