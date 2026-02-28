-- ============================================================
-- Migration: Add Organizations as Top-Level Tenant
-- ============================================================

-- ── New tables ──────────────────────────────────────────────

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(org_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ── Alter clients ───────────────────────────────────────────

ALTER TABLE clients ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX idx_clients_org ON clients(org_id);

-- ── Enable RLS on new tables ────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- ── RLS policies for organizations ──────────────────────────

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Org owners/admins can update their organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ── RLS policies for organization_members ───────────────────

CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Org owners/admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owners/admins can remove members"
  ON organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- ── Update SQL functions ────────────────────────────────────

-- user_client_ids: now goes through org membership
CREATE OR REPLACE FUNCTION user_client_ids()
RETURNS SETOF UUID AS $$
  SELECT c.id FROM clients c
  JOIN organization_members om ON c.org_id = om.org_id
  WHERE om.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- user_has_client_access: now goes through org membership
CREATE OR REPLACE FUNCTION user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients c
    JOIN organization_members om ON c.org_id = om.org_id
    WHERE c.id = check_client_id
    AND om.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- create_client_with_owner: now requires org_id, no longer inserts user_clients
CREATE OR REPLACE FUNCTION create_client_with_owner(
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
  INSERT INTO clients (name, domain, industry, target_keywords, brand_voice, org_id)
  VALUES (client_name, client_domain, client_industry, client_target_keywords, client_brand_voice, p_org_id)
  RETURNING id INTO new_client_id;

  -- Legacy: still insert user_clients for backwards compat during transition
  INSERT INTO user_clients (user_id, client_id, role)
  VALUES (auth.uid(), new_client_id, 'owner');

  RETURN new_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── New function: create org with owner ─────────────────────

CREATE OR REPLACE FUNCTION create_org_with_owner(
  org_name TEXT,
  org_slug TEXT
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'owner');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Migrate existing data ───────────────────────────────────
-- For each distinct user in user_clients, create an org and migrate their clients.

DO $$
DECLARE
  r RECORD;
  new_org_id UUID;
BEGIN
  FOR r IN (SELECT DISTINCT user_id FROM user_clients) LOOP
    -- Create org for user
    INSERT INTO organizations (name, slug)
    VALUES (
      'My Organization',
      'org-' || replace(r.user_id::TEXT, '-', '')
    )
    RETURNING id INTO new_org_id;

    -- Add user as org owner
    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, r.user_id, 'owner');

    -- Set org_id on all clients this user owns
    UPDATE clients
    SET org_id = new_org_id
    WHERE id IN (
      SELECT client_id FROM user_clients
      WHERE user_id = r.user_id
      AND role = 'owner'
    )
    AND org_id IS NULL;
  END LOOP;

  -- Handle any clients that didn't get assigned (non-owner memberships only)
  -- Assign them to the org of their first owner
  UPDATE clients c
  SET org_id = (
    SELECT om.org_id
    FROM user_clients uc
    JOIN organization_members om ON om.user_id = uc.user_id
    WHERE uc.client_id = c.id
    LIMIT 1
  )
  WHERE c.org_id IS NULL
  AND EXISTS (SELECT 1 FROM user_clients WHERE client_id = c.id);
END;
$$;
