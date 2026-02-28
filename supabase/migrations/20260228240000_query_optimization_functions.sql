-- SQL functions for server-side aggregation (replaces JS-level loops)

-- Aggregated AI usage summary grouped by provider and operation
CREATE OR REPLACE FUNCTION get_ai_usage_summary(p_client_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_cost numeric,
  total_input_tokens bigint,
  total_output_tokens bigint,
  provider text,
  operation text,
  group_cost numeric,
  group_calls bigint
)
LANGUAGE sql STABLE
AS $$
  WITH totals AS (
    SELECT
      COALESCE(SUM(estimated_cost_usd), 0) AS total_cost,
      COALESCE(SUM(input_tokens), 0)       AS total_input_tokens,
      COALESCE(SUM(output_tokens), 0)      AS total_output_tokens
    FROM ai_usage_tracking
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
  ),
  grouped AS (
    SELECT
      a.provider,
      a.operation,
      COALESCE(SUM(a.estimated_cost_usd), 0) AS group_cost,
      COUNT(*)                                AS group_calls
    FROM ai_usage_tracking a
    WHERE (p_client_id IS NULL OR a.client_id = p_client_id)
    GROUP BY a.provider, a.operation
  )
  SELECT
    t.total_cost,
    t.total_input_tokens,
    t.total_output_tokens,
    g.provider,
    g.operation,
    g.group_cost,
    g.group_calls
  FROM grouped g
  CROSS JOIN totals t;
$$;

-- Pipeline stats: count of briefs per status
CREATE OR REPLACE FUNCTION get_pipeline_stats(p_client_id uuid DEFAULT NULL)
RETURNS TABLE (
  status text,
  count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cb.status,
    COUNT(*) AS count
  FROM content_briefs cb
  WHERE (p_client_id IS NULL OR cb.client_id = p_client_id)
  GROUP BY cb.status;
$$;
