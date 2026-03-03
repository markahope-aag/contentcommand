import { BaseAPIIntegration, APIError } from "./base";
import { serverEnv } from "@/lib/env";

const BASE_URL = "https://api.spyfu.com/apis";

const CACHE_TTLS = {
  domain_stats: 43200,   // 12h
  competitors: 86400,    // 24h
  keywords: 86400,       // 24h
  ppc: 86400,            // 24h
};

export class SpyFuClient extends BaseAPIIntegration {
  readonly provider = "spyfu";

  private getApiKey(): string {
    return serverEnv().SPYFU_API_KEY;
  }

  protected async makeRequest<T>(
    endpoint: string,
    options?: Record<string, unknown>
  ): Promise<T> {
    const params = (options?.params ?? {}) as Record<string, string>;
    params.api_key = this.getApiKey();

    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}?${queryString}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new APIError(
        `SpyFu error: ${response.statusText}`,
        response.status,
        this.provider
      );
    }

    return response.json() as Promise<T>;
  }

  // ── Domain Stats ──────────────────────────────────────

  async getDomainStats(domain: string, clientId?: string) {
    const cacheKey = `spyfu:domain-stats:${domain}`;
    return this.execute<SpyFuDomainStats>(
      "/domain_stats_api/v2/getAllDomainStats",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.domain_stats,
        params: { domain, countryCode: "US" },
      }
    );
  }

  // ── PPC Competitors ───────────────────────────────────

  async getPpcCompetitors(domain: string, clientId?: string) {
    const cacheKey = `spyfu:ppc-competitors:${domain}`;
    return this.execute<SpyFuCompetitorResult>(
      "/competitors_api/v2/ppc/getTopCompetitors",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.competitors,
        params: { domain, countryCode: "US", pageSize: "20", sortBy: "Rank", sortOrder: "Descending" },
      }
    );
  }

  // ── SEO Competitors ───────────────────────────────────

  async getSeoCompetitors(domain: string, clientId?: string) {
    const cacheKey = `spyfu:seo-competitors:${domain}`;
    return this.execute<SpyFuCompetitorResult>(
      "/competitors_api/v2/seo/getTopCompetitors",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.competitors,
        params: { domain, countryCode: "US", pageSize: "20", sortBy: "Rank", sortOrder: "Descending" },
      }
    );
  }

  // ── PPC Keywords (what a domain is bidding on) ────────

  async getPpcKeywords(domain: string, clientId?: string, pageSize = 100) {
    const cacheKey = `spyfu:ppc-keywords:${domain}:${pageSize}`;
    return this.execute<SpyFuPpcKeywordResult>(
      "/serp_api/v2/ppc/getPaidSerps",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.ppc,
        params: {
          query: domain,
          countryCode: "US",
          pageSize: String(pageSize),
          sortBy: "SearchVolume",
          sortOrder: "Descending",
        },
      }
    );
  }

  // ── Most Valuable Organic Keywords ────────────────────

  async getMostValuableKeywords(domain: string, clientId?: string, pageSize = 100) {
    const cacheKey = `spyfu:valuable-keywords:${domain}:${pageSize}`;
    return this.execute<SpyFuSeoKeywordResult>(
      "/serp_api/v2/seo/getMostValuableKeywords",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.keywords,
        params: {
          query: domain,
          countryCode: "US",
          pageSize: String(pageSize),
          sortBy: "SearchVolume",
          sortOrder: "Descending",
        },
      }
    );
  }

  // ── Gained/Lost Rankings ──────────────────────────────

  async getGainedRanksKeywords(domain: string, clientId?: string, pageSize = 50) {
    const cacheKey = `spyfu:gained-ranks:${domain}`;
    return this.execute<SpyFuSeoKeywordResult>(
      "/serp_api/v2/seo/getGainedRanksKeywords",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.keywords,
        params: {
          query: domain,
          countryCode: "US",
          pageSize: String(pageSize),
          sortBy: "SearchVolume",
          sortOrder: "Descending",
        },
      }
    );
  }

  async getLostRanksKeywords(domain: string, clientId?: string, pageSize = 50) {
    const cacheKey = `spyfu:lost-ranks:${domain}`;
    return this.execute<SpyFuSeoKeywordResult>(
      "/serp_api/v2/seo/getLostRanksKeywords",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.keywords,
        params: {
          query: domain,
          countryCode: "US",
          pageSize: String(pageSize),
          sortBy: "SearchVolume",
          sortOrder: "Descending",
        },
      }
    );
  }
}

// ── Response Types ────────────────────────────────────────

export interface SpyFuDomainStatsEntry {
  searchMonth: number;
  searchYear: number;
  averageOrganicRank: number;
  monthlyPaidClicks: number;
  averageAdRank: number;
  totalOrganicResults: number;
  monthlyBudget: number;
  monthlyOrganicValue: number;
  totalAdsPurchased: number;
  monthlyOrganicClicks: number;
  strength: number;
}

export interface SpyFuDomainStats {
  domain: string;
  results: SpyFuDomainStatsEntry[];
  resultCount: number;
}

export interface SpyFuCompetitor {
  domain: string;
  commonTerms: number;
  rank: number;
}

export interface SpyFuCompetitorResult {
  resultCount: number;
  totalMatchingResults: number;
  results: SpyFuCompetitor[];
}

export interface SpyFuPpcKeyword {
  keyword: string;
  adPosition: number;
  adCount: number;
  searchVolume: number;
  keywordDifficulty: number;
  domain: string;
  title: string;
  bodyHtml: string;
}

export interface SpyFuPpcKeywordResult {
  resultCount: number;
  totalMatchingResults: number;
  results: SpyFuPpcKeyword[];
}

export interface SpyFuSeoKeyword {
  keyword: string;
  rank: number;
  rankChange: number;
  searchVolume: number;
  keywordDifficulty: number;
  estimatedMonthlyClicks: number;
  estimatedMonthlyValue: number;
}

export interface SpyFuSeoKeywordResult {
  resultCount: number;
  totalMatchingResults: number;
  results: SpyFuSeoKeyword[];
}

export const spyFu = new SpyFuClient();
