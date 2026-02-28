import { createClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";

// Service-role Supabase client for cron jobs and server-side operations.
// Bypasses RLS — only import this server-side in API routes and cron handlers.
export function createAdminClient() {
  const url = clientEnv().NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = serverEnv().SUPABASE_SERVICE_ROLE_KEY;

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
