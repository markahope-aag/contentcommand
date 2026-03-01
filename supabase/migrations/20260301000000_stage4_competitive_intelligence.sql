-- Stage 4: Competitive Intelligence Dashboard

-- Time-series metrics history for trend charts
CREATE TABLE competitive_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cmh_client_metric_date
  ON competitive_metrics_history(client_id, metric_type, recorded_at DESC);

CREATE INDEX idx_cmh_competitor
  ON competitive_metrics_history(competitor_id)
  WHERE competitor_id IS NOT NULL;

-- RLS
ALTER TABLE competitive_metrics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics history of their clients"
  ON competitive_metrics_history FOR SELECT
  USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "Service role can insert metrics history"
  ON competitive_metrics_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can delete metrics history"
  ON competitive_metrics_history FOR DELETE
  USING (true);

-- Aggregated competitive summary function
CREATE OR REPLACE FUNCTION get_competitive_summary(p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'competitor_count', (
      SELECT COUNT(*) FROM competitors WHERE client_id = p_client_id
    ),
    'avg_strength', (
      SELECT COALESCE(ROUND(AVG(competitive_strength)::numeric, 1), 0)
      FROM competitors WHERE client_id = p_client_id
    ),
    'organic_traffic', (
      SELECT COALESCE(metric_value, 0)
      FROM competitive_metrics_history
      WHERE client_id = p_client_id
        AND metric_type = 'organic_traffic'
      ORDER BY recorded_at DESC
      LIMIT 1
    ),
    'keyword_gap_count', (
      SELECT COUNT(*)
      FROM competitive_analysis
      WHERE client_id = p_client_id
        AND analysis_type = 'keyword_gap'
        AND expires_at > NOW()
    ),
    'citation_sov', (
      SELECT COALESCE(ROUND(AVG(share_of_voice)::numeric, 1), 0)
      FROM ai_citations
      WHERE client_id = p_client_id
        AND tracked_at > NOW() - INTERVAL '30 days'
    ),
    'last_analysis_at', (
      SELECT MAX(created_at)
      FROM competitive_analysis
      WHERE client_id = p_client_id
    )
  ) INTO result;

  RETURN result;
END;
$$;
