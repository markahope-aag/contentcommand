-- Fix search_path security warnings on all public functions.
-- Adding SET search_path = '' prevents search path hijacking.
-- All table references are now schema-qualified with public.

-- ── user_client_ids ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_client_ids()
RETURNS SETOF UUID AS $$
  SELECT c.id FROM public.clients c
  JOIN public.organization_members om ON c.org_id = om.org_id
  WHERE om.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

-- ── user_has_client_access ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.organization_members om ON c.org_id = om.org_id
    WHERE c.id = check_client_id
    AND om.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

-- ── create_client_with_owner ────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_client_with_owner(
  client_name TEXT,
  client_domain TEXT,
  client_industry TEXT DEFAULT NULL,
  client_target_keywords JSONB DEFAULT NULL,
  client_brand_voice JSONB DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_client_id UUID;
BEGIN
  INSERT INTO public.clients (name, domain, industry, target_keywords, brand_voice, org_id)
  VALUES (client_name, client_domain, client_industry, client_target_keywords, client_brand_voice, p_org_id)
  RETURNING id INTO new_client_id;

  INSERT INTO public.user_clients (user_id, client_id, role)
  VALUES (auth.uid(), new_client_id, 'owner');

  RETURN new_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ── create_org_with_owner ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_org_with_owner(
  org_name TEXT,
  org_slug TEXT
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'owner');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ── update_content_briefs_updated_at ────────────────────────
CREATE OR REPLACE FUNCTION public.update_content_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';
