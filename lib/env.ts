import { z } from "zod";

/**
 * Centralized environment variable validation.
 *
 * Server-side variables are validated lazily on first access (not at import time)
 * so the app can still build and render client pages without all secrets present.
 *
 * Client variables (NEXT_PUBLIC_*) are validated eagerly since they're required
 * for Supabase auth on every page.
 */

// ── Schemas ─────────────────────────────────────────────

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const serverEnvSchema = z.object({
  // Supabase admin
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Integrations
  DATAFORSEO_LOGIN: z.string().min(1, "DATAFORSEO_LOGIN is required"),
  DATAFORSEO_PASSWORD: z.string().min(1, "DATAFORSEO_PASSWORD is required"),
  FRASE_API_KEY: z.string().min(1, "FRASE_API_KEY is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  LLMREFS_API_KEY: z.string().min(1, "LLMREFS_API_KEY is required"),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // Security
  ENCRYPTION_KEY: z.string().length(64, "ENCRYPTION_KEY must be 64 hex characters"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
});

// ── Client env (always available) ───────────────────────

function validateClientEnv() {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  });

  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.message}`).join("\n");
    throw new Error(`Missing or invalid client environment variables:\n${errors}`);
  }

  return result.data;
}

// Cache so validation only runs once
let _clientEnv: z.infer<typeof clientEnvSchema> | null = null;

export function clientEnv() {
  if (!_clientEnv) {
    _clientEnv = validateClientEnv();
  }
  return _clientEnv;
}

// ── Server env (lazy, on-demand) ────────────────────────

function validateServerEnv() {
  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATAFORSEO_LOGIN: process.env.DATAFORSEO_LOGIN,
    DATAFORSEO_PASSWORD: process.env.DATAFORSEO_PASSWORD,
    FRASE_API_KEY: process.env.FRASE_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    LLMREFS_API_KEY: process.env.LLMREFS_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  });

  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.message}`).join("\n");
    throw new Error(`Missing or invalid server environment variables:\n${errors}`);
  }

  return result.data;
}

let _serverEnv: z.infer<typeof serverEnvSchema> | null = null;

export function serverEnv() {
  if (!_serverEnv) {
    _serverEnv = validateServerEnv();
  }
  return _serverEnv;
}
