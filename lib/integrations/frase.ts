import { BaseAPIIntegration, APIError } from "./base";
import { serverEnv } from "@/lib/env";

const BASE_URL = "https://next.frase.io/api/v1";

const CACHE_TTLS = {
  serp_analysis: 43200, // 12h
  url_analysis: 21600,  // 6h
};

export class FraseClient extends BaseAPIIntegration {
  readonly provider = "frase";

  protected async makeRequest<T>(
    endpoint: string,
    options?: Record<string, unknown>
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const body = options?.body;

    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        "X-API-KEY": serverEnv().FRASE_API_KEY,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new APIError(
        `Frase error: ${response.statusText}`,
        response.status,
        this.provider
      );
    }

    return response.json() as Promise<T>;
  }

  async analyzeSerp(query: string, clientId?: string) {
    const cacheKey = `frase:serp:${query}`;
    return this.execute("/serp/analyze", cacheKey, {
      clientId,
      cacheTtl: CACHE_TTLS.serp_analysis,
      body: { keyword: query },
    });
  }

  async analyzeUrl(url: string, clientId?: string) {
    const cacheKey = `frase:url:${url}`;
    return this.execute("/serp/analyze", cacheKey, {
      clientId,
      cacheTtl: CACHE_TTLS.url_analysis,
      body: { keyword: url },
    });
  }

  async getSemanticKeywords(query: string, clientId?: string) {
    const cacheKey = `frase:semantic:${query}`;
    return this.execute("/serp/analyze", cacheKey, {
      clientId,
      cacheTtl: CACHE_TTLS.serp_analysis,
      body: { keyword: query },
    });
  }
}

export const frase = new FraseClient();
