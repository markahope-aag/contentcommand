-- Core Tables
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT,
  target_keywords JSONB,
  brand_voice JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  competitive_strength INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  target_keyword TEXT NOT NULL,
  competitive_gap TEXT,
  unique_angle TEXT,
  ai_citation_opportunity TEXT,
  status TEXT DEFAULT 'draft',
  content_requirements JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES content_briefs(id),
  content TEXT,
  quality_score INTEGER,
  seo_optimizations JSONB,
  ai_citations_ready BOOLEAN DEFAULT FALSE,
  word_count INTEGER,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES generated_content(id),
  platform TEXT,
  metric_type TEXT,
  metric_value JSONB,
  tracked_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE api_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  provider TEXT NOT NULL,
  credentials JSONB,
  status TEXT DEFAULT 'pending',
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_competitors_client ON competitors(client_id);
CREATE INDEX idx_content_briefs_client ON content_briefs(client_id);
CREATE INDEX idx_content_briefs_client_created ON content_briefs(client_id, created_at DESC);
CREATE INDEX idx_generated_content_brief ON generated_content(brief_id);
CREATE INDEX idx_generated_content_status ON generated_content(status);
CREATE INDEX idx_performance_content_platform ON performance_tracking(content_id, platform);
CREATE INDEX idx_api_integrations_client ON api_integrations(client_id);
