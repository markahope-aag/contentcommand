-- Drop the old 5-parameter overload of create_client_with_owner that lacks
-- SET search_path (triggering Supabase linter warning function_search_path_mutable).
-- The current version with p_org_id (6 params) was introduced in the organizations
-- migration and already has SET search_path = ''.

DROP FUNCTION IF EXISTS public.create_client_with_owner(TEXT, TEXT, TEXT, JSONB, JSONB);
