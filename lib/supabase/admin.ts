import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";

// Cached singleton — safe because the admin client is stateless
// (no session, no cookies, service-role key is constant).
let adminClient: SupabaseClient | null = null;

// Service-role Supabase client for cron jobs and server-side operations.
// Bypasses RLS — only import this server-side in API routes and cron handlers.
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = clientEnv().NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = serverEnv().SUPABASE_SERVICE_ROLE_KEY;

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
