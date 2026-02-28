-- Stage 3: AI Content Generation Engine
-- Extends content_briefs and generated_content, adds quality analysis and AI usage tracking

-- ── ALTER content_briefs ──────────────────────────────────
ALTER TABLE content_briefs
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'blog_post',
  ADD COLUMN IF NOT EXISTS competitive_gap_analysis JSONB,
  ADD COLUMN IF NOT EXISTS ai_citation_opportunity_data JSONB,
  ADD COLUMN IF NOT EXISTS serp_content_analysis TEXT,
  ADD COLUMN IF NOT EXISTS authority_signals TEXT,
  ADD COLUMN IF NOT EXISTS controversial_positions TEXT,
  ADD COLUMN IF NOT EXISTS target_word_count INTEGER DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS required_sections TEXT[],
  ADD COLUMN IF NOT EXISTS semantic_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS internal_links TEXT[],
  ADD COLUMN IF NOT EXISTS client_voice_profile JSONB,
  ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- ── ALTER generated_content ──────────────────────────────
ALTER TABLE generated_content
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS ai_model_used TEXT,
  ADD COLUMN IF NOT EXISTS generation_prompt TEXT,
  ADD COLUMN IF NOT EXISTS generation_time_seconds NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS authority_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS expertise_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS readability_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS optimization_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS aeo_optimizations JSONB,
  ADD COLUMN IF NOT EXISTS internal_links_added TEXT[],
  ADD COLUMN IF NOT EXISTS external_references TEXT[],
  ADD COLUMN IF NOT EXISTS predicted_seo_impact JSONB,
  ADD COLUMN IF NOT EXISTS predicted_ai_citations JSONB,
  ADD COLUMN IF NOT EXISTS competitive_advantage_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS human_review_time_minutes NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS revision_requests TEXT[],
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- ── New table: content_quality_analysis ──────────────────
CREATE TABLE IF NOT EXISTS content_quality_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2),
  seo_score NUMERIC(5,2),
  readability_score NUMERIC(5,2),
  authority_score NUMERIC(5,2),
  engagement_score NUMERIC(5,2),
  aeo_score NUMERIC(5,2),
  detailed_feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── New table: ai_usage_tracking ─────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  brief_id UUID REFERENCES content_briefs(id) ON DELETE SET NULL,
  content_id UUID REFERENCES generated_content(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_content_briefs_status ON content_briefs(status);
CREATE INDEX IF NOT EXISTS idx_content_briefs_client_priority ON content_briefs(client_id, priority_level);
CREATE INDEX IF NOT EXISTS idx_generated_content_client ON generated_content(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_brief_status ON generated_content(brief_id, status);
CREATE INDEX IF NOT EXISTS idx_content_quality_content ON content_quality_analysis(content_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_client ON ai_usage_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_tracking(created_at);

-- ── RLS Policies ─────────────────────────────────────────
ALTER TABLE content_quality_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- content_quality_analysis: access via generated_content → client_id
CREATE POLICY "Users can view quality analysis for their content"
  ON content_quality_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_content gc
      WHERE gc.id = content_quality_analysis.content_id
        AND gc.client_id IN (SELECT user_client_ids())
    )
  );

CREATE POLICY "Service role can insert quality analysis"
  ON content_quality_analysis FOR INSERT
  WITH CHECK (true);

-- ai_usage_tracking: access via client_id
CREATE POLICY "Users can view their AI usage"
  ON ai_usage_tracking FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Service role can insert AI usage"
  ON ai_usage_tracking FOR INSERT
  WITH CHECK (true);

-- Add client_id-based SELECT policy on generated_content
CREATE POLICY "Users can view generated content by client"
  ON generated_content FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

-- Update trigger for content_briefs.updated_at
CREATE OR REPLACE FUNCTION update_content_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_briefs_updated_at ON content_briefs;
CREATE TRIGGER content_briefs_updated_at
  BEFORE UPDATE ON content_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_content_briefs_updated_at();
