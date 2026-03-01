-- Fix: user_client_ids() and user_has_client_access() must also check
-- the user_clients table for clients that have no org_id (legacy/direct ownership).

CREATE OR REPLACE FUNCTION public.user_client_ids()
RETURNS SETOF UUID AS $$
  -- Clients via organization membership
  SELECT c.id FROM public.clients c
  JOIN public.organization_members om ON c.org_id = om.org_id
  WHERE om.user_id = auth.uid()
  UNION
  -- Clients via direct user_clients mapping (no org)
  SELECT uc.client_id FROM public.user_clients uc
  WHERE uc.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.organization_members om ON c.org_id = om.org_id
    WHERE c.id = check_client_id
    AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_clients uc
    WHERE uc.client_id = check_client_id
    AND uc.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';
