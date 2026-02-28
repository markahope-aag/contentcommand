import { getRateLimiter, getCached, setCache } from "./redis";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiRequestLogInsert } from "@/types/database";

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public provider: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class RateLimitError extends Error {
  constructor(
    public provider: string,
    public retryAfter?: number
  ) {
    super(`Rate limit exceeded for ${provider}`);
    this.name = "RateLimitError";
  }
}

interface RequestOptions {
  skipCache?: boolean;
  clientId?: string;
  cacheTtl?: number;
}

export abstract class BaseAPIIntegration {
  abstract readonly provider: string;

  protected abstract makeRequest<T>(
    endpoint: string,
    options?: Record<string, unknown>
  ): Promise<T>;

  async execute<T>(
    endpoint: string,
    cacheKey: string,
    options: RequestOptions & Record<string, unknown> = {}
  ): Promise<T> {
    const { skipCache, clientId, cacheTtl, ...requestOptions } = options;

    // 1. Check cache first (avoids burning rate limit tokens)
    if (!skipCache && cacheKey) {
      const cached = await getCached<T>(cacheKey);
      if (cached !== null) return cached;
    }

    // 2. Rate limit check
    const limiter = getRateLimiter(this.provider);
    const { success, reset } = await limiter.limit(this.provider);
    if (!success) {
      throw new RateLimitError(this.provider, reset);
    }

    // 3. Make request with retries (3 retries for 5xx only)
    const startTime = Date.now();
    let lastError: Error | null = null;
    let statusCode: number | undefined;

    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }

      try {
        const result = await this.makeRequest<T>(endpoint, requestOptions);
        const responseTime = Date.now() - startTime;
        statusCode = 200;

        // Fire-and-forget: log the request
        this.logRequest(clientId, endpoint, statusCode, responseTime);
        this.updateHealth(true, responseTime);

        // Cache the result
        if (cacheKey && cacheTtl) {
          setCache(cacheKey, result, cacheTtl).catch(() => {});
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        if (error instanceof APIError) {
          statusCode = error.statusCode;
          // Only retry on 5xx errors
          if (error.statusCode < 500) break;
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    const responseTime = Date.now() - startTime;
    this.logRequest(
      clientId,
      endpoint,
      statusCode || 0,
      responseTime,
      lastError?.message
    );
    this.updateHealth(false, responseTime);

    throw lastError;
  }

  private logRequest(
    clientId: string | undefined,
    endpoint: string,
    statusCode: number,
    responseTimeMs: number,
    errorMessage?: string
  ) {
    try {
      const admin = createAdminClient();
      const log: ApiRequestLogInsert = {
        client_id: clientId || null,
        provider: this.provider,
        endpoint,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        error_message: errorMessage || null,
        request_metadata: null,
      };
      admin.from("api_request_logs").insert(log).then();
    } catch {
      // Fire-and-forget — don't let logging failures break the flow
    }
  }

  private updateHealth(success: boolean, responseTimeMs: number) {
    try {
      const admin = createAdminClient();
      const now = new Date().toISOString();

      if (success) {
        admin
          .from("integration_health")
          .upsert(
            {
              provider: this.provider,
              status: "healthy",
              last_success: now,
              error_count: 0,
              avg_response_ms: responseTimeMs,
              updated_at: now,
            },
            { onConflict: "provider" }
          )
          .then();
      } else {
        // Simple upsert to mark degraded status
        admin
          .from("integration_health")
          .upsert(
            {
              provider: this.provider,
              status: "degraded",
              last_failure: now,
              avg_response_ms: responseTimeMs,
              updated_at: now,
            },
            { onConflict: "provider" }
          )
          .then();
      }
    } catch {
      // Fire-and-forget
    }
  }
}
