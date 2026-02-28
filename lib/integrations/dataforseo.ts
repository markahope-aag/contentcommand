import { BaseAPIIntegration, APIError } from "./base";

const BASE_URL = "https://api.dataforseo.com/v3";

const CACHE_TTLS = {
  keywords: 86400,    // 24h
  serp: 21600,        // 6h
  domain_metrics: 43200, // 12h
};

export class DataForSEOClient extends BaseAPIIntegration {
  readonly provider = "dataforseo";

  private getAuthHeader(): string {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    if (!login || !password) {
      throw new Error("Missing DataForSEO credentials");
    }
    return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
  }

  protected async makeRequest<T>(
    endpoint: string,
    options?: Record<string, unknown>
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const body = options?.body;

    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new APIError(
        `DataForSEO error: ${response.statusText}`,
        response.status,
        this.provider
      );
    }

    const data = await response.json();

    if (data.status_code !== 20000) {
      throw new APIError(
        data.status_message || "DataForSEO request failed",
        data.status_code,
        this.provider
      );
    }

    return data.tasks?.[0]?.result as T;
  }

  async getCompetitorKeywords(
    domain: string,
    competitorDomain: string,
    clientId?: string
  ) {
    const cacheKey = `dataforseo:keywords:${domain}:${competitorDomain}`;
    return this.execute(
      "/dataforseo_labs/google/domain_intersection/live",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.keywords,
        body: [
          {
            target1: domain,
            target2: competitorDomain,
            language_code: "en",
            location_code: 2840, // US
            limit: 100,
          },
        ],
      }
    );
  }

  async getDomainMetrics(domain: string, clientId?: string) {
    const cacheKey = `dataforseo:domain:${domain}`;
    return this.execute(
      "/dataforseo_labs/google/domain_rank_overview/live",
      cacheKey,
      {
        clientId,
        cacheTtl: CACHE_TTLS.domain_metrics,
        body: [
          {
            target: domain,
            language_code: "en",
            location_code: 2840,
          },
        ],
      }
    );
  }

  async getSerpResults(keyword: string, clientId?: string) {
    const cacheKey = `dataforseo:serp:${keyword}`;
    return this.execute("/serp/google/organic/live/regular", cacheKey, {
      clientId,
      cacheTtl: CACHE_TTLS.serp,
      body: [
        {
          keyword,
          language_code: "en",
          location_code: 2840,
          depth: 20,
        },
      ],
    });
  }
}

export const dataForSEO = new DataForSEOClient();
