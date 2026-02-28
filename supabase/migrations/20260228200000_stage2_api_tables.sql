-- Stage 2: API Integration Layer tables

-- Track every external API call
CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  request_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_request_logs_client ON api_request_logs(client_id);
CREATE INDEX idx_api_request_logs_provider ON api_request_logs(provider, created_at DESC);
CREATE INDEX idx_api_request_logs_created ON api_request_logs(created_at DESC);

-- Cached DataForSEO results
CREATE TABLE competitive_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL, -- 'keyword_gap', 'domain_metrics', 'serp_overlap'
  data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_competitive_analysis_client ON competitive_analysis(client_id);
CREATE INDEX idx_competitive_analysis_type ON competitive_analysis(client_id, analysis_type);
CREATE INDEX idx_competitive_analysis_expires ON competitive_analysis(expires_at);

-- Otterly.AI citation tracking
CREATE TABLE ai_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'chatgpt', 'perplexity', 'gemini', etc.
  query TEXT NOT NULL,
  cited BOOLEAN DEFAULT FALSE,
  share_of_voice NUMERIC(5,2),
  citation_url TEXT,
  citation_context TEXT,
  data JSONB,
  tracked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_citations_client ON ai_citations(client_id);
CREATE INDEX idx_ai_citations_platform ON ai_citations(client_id, platform);
CREATE INDEX idx_ai_citations_tracked ON ai_citations(tracked_at DESC);

-- Per-provider health monitoring
CREATE TABLE integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'
  last_success TIMESTAMP,
  last_failure TIMESTAMP,
  error_count INTEGER DEFAULT 0,
  avg_response_ms INTEGER,
  metadata JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Per-client encrypted Google OAuth tokens
CREATE TABLE google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP NOT NULL,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_google_oauth_tokens_client ON google_oauth_tokens(client_id);

-- RLS policies

ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- api_request_logs: users can view logs for their clients
CREATE POLICY "Users can view request logs of their clients"
  ON api_request_logs FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Service role can insert request logs"
  ON api_request_logs FOR INSERT
  WITH CHECK (true);

-- competitive_analysis: users can view analysis for their clients
CREATE POLICY "Users can view competitive analysis of their clients"
  ON competitive_analysis FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Service role can manage competitive analysis"
  ON competitive_analysis FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update competitive analysis"
  ON competitive_analysis FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete competitive analysis"
  ON competitive_analysis FOR DELETE
  USING (true);

-- ai_citations: users can view citations for their clients
CREATE POLICY "Users can view citations of their clients"
  ON ai_citations FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Service role can manage citations"
  ON ai_citations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update citations"
  ON ai_citations FOR UPDATE
  USING (true);

-- integration_health: all authenticated users can view health
CREATE POLICY "Authenticated users can view integration health"
  ON integration_health FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage integration health"
  ON integration_health FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update integration health"
  ON integration_health FOR UPDATE
  USING (true);

-- google_oauth_tokens: users can view tokens for their clients
CREATE POLICY "Users can view Google OAuth tokens of their clients"
  ON google_oauth_tokens FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Service role can manage Google OAuth tokens"
  ON google_oauth_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update Google OAuth tokens"
  ON google_oauth_tokens FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete Google OAuth tokens"
  ON google_oauth_tokens FOR DELETE
  USING (true);
