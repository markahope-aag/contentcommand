-- Fix infinite recursion in organization_members RLS policy.
-- The SELECT policy was self-referential: it queried organization_members
-- to check access to organization_members, causing a loop.

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;

-- Replace with a non-recursive policy: user can see members rows
-- for any org they themselves belong to, checked via a direct filter
-- rather than a subquery on the same table.
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Note: The above still references organization_members, but Postgres
-- handles self-joins in RLS when using a simple subquery pattern.
-- However, to be fully safe, use a SECURITY DEFINER helper function:

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

-- Now rewrite both policies to use the helper function (no recursion possible)
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));

DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT public.user_org_ids()));

-- Also fix the INSERT/DELETE policies on organization_members that reference the table
DROP POLICY IF EXISTS "Org owners/admins can add members" ON public.organization_members;
CREATE POLICY "Org owners/admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT public.user_org_ids()
    )
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- For the above INSERT policy, the EXISTS subquery on organization_members
-- runs under SECURITY DEFINER context via the function, so rewrite fully:
DROP POLICY IF EXISTS "Org owners/admins can add members" ON public.organization_members;

CREATE OR REPLACE FUNCTION public.user_is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

CREATE POLICY "Org owners/admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.user_is_org_admin(org_id));

DROP POLICY IF EXISTS "Org owners/admins can remove members" ON public.organization_members;
CREATE POLICY "Org owners/admins can remove members"
  ON public.organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.user_is_org_admin(org_id)
  );
