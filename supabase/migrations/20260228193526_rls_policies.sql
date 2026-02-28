-- Junction table for multi-tenant access: which users can access which clients
CREATE TABLE user_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

CREATE INDEX idx_user_clients_user ON user_clients(user_id);
CREATE INDEX idx_user_clients_client ON user_clients(client_id);

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has access to a client
CREATE OR REPLACE FUNCTION user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_clients
    WHERE user_id = auth.uid()
    AND client_id = check_client_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get all client IDs for the current user
CREATE OR REPLACE FUNCTION user_client_ids()
RETURNS SETOF UUID AS $$
  SELECT client_id FROM user_clients
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- user_clients policies
CREATE POLICY "Users can view their own client memberships"
  ON user_clients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can add users to their clients"
  ON user_clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_clients uc
      WHERE uc.user_id = auth.uid()
      AND uc.client_id = user_clients.client_id
      AND uc.role = 'owner'
    )
  );

CREATE POLICY "Owners can remove users from their clients"
  ON user_clients FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_clients uc
      WHERE uc.user_id = auth.uid()
      AND uc.client_id = user_clients.client_id
      AND uc.role = 'owner'
    )
  );

-- clients policies
CREATE POLICY "Users can view their clients"
  ON clients FOR SELECT
  USING (id IN (SELECT user_client_ids()));

CREATE POLICY "Authenticated users can create clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners/admins can update their clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_id = auth.uid()
      AND client_id = clients.id
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete their clients"
  ON clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_id = auth.uid()
      AND client_id = clients.id
      AND role = 'owner'
    )
  );

-- competitors policies
CREATE POLICY "Users can view competitors of their clients"
  ON competitors FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Users can manage competitors of their clients"
  ON competitors FOR INSERT
  WITH CHECK (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Users can update competitors of their clients"
  ON competitors FOR UPDATE
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Users can delete competitors of their clients"
  ON competitors FOR DELETE
  USING (client_id IN (SELECT user_client_ids()));

-- content_briefs policies
CREATE POLICY "Users can view briefs of their clients"
  ON content_briefs FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Users can create briefs for their clients"
  ON content_briefs FOR INSERT
  WITH CHECK (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Users can update briefs of their clients"
  ON content_briefs FOR UPDATE
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Users can delete briefs of their clients"
  ON content_briefs FOR DELETE
  USING (client_id IN (SELECT user_client_ids()));

-- generated_content policies
CREATE POLICY "Users can view content of their clients"
  ON generated_content FOR SELECT
  USING (
    brief_id IN (
      SELECT cb.id FROM content_briefs cb
      WHERE cb.client_id IN (SELECT user_client_ids())
    )
  );

CREATE POLICY "Users can create content for their clients"
  ON generated_content FOR INSERT
  WITH CHECK (
    brief_id IN (
      SELECT cb.id FROM content_briefs cb
      WHERE cb.client_id IN (SELECT user_client_ids())
    )
  );

CREATE POLICY "Users can update content of their clients"
  ON generated_content FOR UPDATE
  USING (
    brief_id IN (
      SELECT cb.id FROM content_briefs cb
      WHERE cb.client_id IN (SELECT user_client_ids())
    )
  );

-- performance_tracking policies
CREATE POLICY "Users can view performance of their content"
  ON performance_tracking FOR SELECT
  USING (
    content_id IN (
      SELECT gc.id FROM generated_content gc
      JOIN content_briefs cb ON gc.brief_id = cb.id
      WHERE cb.client_id IN (SELECT user_client_ids())
    )
  );

CREATE POLICY "Users can track performance of their content"
  ON performance_tracking FOR INSERT
  WITH CHECK (
    content_id IN (
      SELECT gc.id FROM generated_content gc
      JOIN content_briefs cb ON gc.brief_id = cb.id
      WHERE cb.client_id IN (SELECT user_client_ids())
    )
  );

-- api_integrations policies
CREATE POLICY "Users can view integrations of their clients"
  ON api_integrations FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Owners/admins can manage integrations"
  ON api_integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_id = auth.uid()
      AND client_id = api_integrations.client_id
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can update integrations"
  ON api_integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_id = auth.uid()
      AND client_id = api_integrations.client_id
      AND role IN ('owner', 'admin')
    )
  );

-- Function: create a client and assign the creator as owner
CREATE OR REPLACE FUNCTION create_client_with_owner(
  client_name TEXT,
  client_domain TEXT,
  client_industry TEXT DEFAULT NULL,
  client_target_keywords JSONB DEFAULT NULL,
  client_brand_voice JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_client_id UUID;
BEGIN
  INSERT INTO clients (name, domain, industry, target_keywords, brand_voice)
  VALUES (client_name, client_domain, client_industry, client_target_keywords, client_brand_voice)
  RETURNING id INTO new_client_id;

  INSERT INTO user_clients (user_id, client_id, role)
  VALUES (auth.uid(), new_client_id, 'owner');

  RETURN new_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
