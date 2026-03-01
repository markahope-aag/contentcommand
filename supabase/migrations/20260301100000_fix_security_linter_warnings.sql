-- Fix Supabase linter warnings:
-- 1. Set search_path on functions missing it
-- 2. Restrict "service role" RLS policies to service_role only

-- ══════════════════════════════════════════════════════════
-- FIX: function_search_path_mutable
-- ══════════════════════════════════════════════════════════

-- ── create_client_with_owner (re-create with search_path) ──
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

-- ── get_ai_usage_summary ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(p_client_id uuid DEFAULT NULL)
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
SET search_path = ''
AS $$
  WITH totals AS (
    SELECT
      COALESCE(SUM(estimated_cost_usd), 0) AS total_cost,
      COALESCE(SUM(input_tokens), 0)       AS total_input_tokens,
      COALESCE(SUM(output_tokens), 0)      AS total_output_tokens
    FROM public.ai_usage_tracking
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
  ),
  grouped AS (
    SELECT
      a.provider,
      a.operation,
      COALESCE(SUM(a.estimated_cost_usd), 0) AS group_cost,
      COUNT(*)                                AS group_calls
    FROM public.ai_usage_tracking a
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

-- ── get_pipeline_stats ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pipeline_stats(p_client_id uuid DEFAULT NULL)
RETURNS TABLE (
  status text,
  count bigint
)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT
    cb.status,
    COUNT(*) AS count
  FROM public.content_briefs cb
  WHERE (p_client_id IS NULL OR cb.client_id = p_client_id)
  GROUP BY cb.status;
$$;

-- ── get_competitive_summary ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_competitive_summary(p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'competitor_count', (
      SELECT COUNT(*) FROM public.competitors WHERE client_id = p_client_id
    ),
    'avg_strength', (
      SELECT COALESCE(ROUND(AVG(competitive_strength)::numeric, 1), 0)
      FROM public.competitors WHERE client_id = p_client_id
    ),
    'organic_traffic', (
      SELECT COALESCE(metric_value, 0)
      FROM public.competitive_metrics_history
      WHERE client_id = p_client_id
        AND metric_type = 'organic_traffic'
      ORDER BY recorded_at DESC
      LIMIT 1
    ),
    'keyword_gap_count', (
      SELECT COUNT(*)
      FROM public.competitive_analysis
      WHERE client_id = p_client_id
        AND analysis_type = 'keyword_gap'
        AND expires_at > NOW()
    ),
    'citation_sov', (
      SELECT COALESCE(ROUND(AVG(share_of_voice)::numeric, 1), 0)
      FROM public.ai_citations
      WHERE client_id = p_client_id
        AND tracked_at > NOW() - INTERVAL '30 days'
    ),
    'last_analysis_at', (
      SELECT MAX(created_at)
      FROM public.competitive_analysis
      WHERE client_id = p_client_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- FIX: rls_policy_always_true
-- Restrict service-role-only policies to the service_role role
-- ══════════════════════════════════════════════════════════

-- ── ai_citations ─────────────────────────────────────────
DROP POLICY IF EXISTS "Service role can manage citations" ON public.ai_citations;
CREATE POLICY "Service role can manage citations"
  ON public.ai_citations FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update citations" ON public.ai_citations;
CREATE POLICY "Service role can update citations"
  ON public.ai_citations FOR UPDATE TO service_role
  USING (true);

-- ── ai_usage_tracking ────────────────────────────────────
DROP POLICY IF EXISTS "Service role can insert AI usage" ON public.ai_usage_tracking;
CREATE POLICY "Service role can insert AI usage"
  ON public.ai_usage_tracking FOR INSERT TO service_role
  WITH CHECK (true);

-- ── api_request_logs ─────────────────────────────────────
DROP POLICY IF EXISTS "Service role can insert request logs" ON public.api_request_logs;
CREATE POLICY "Service role can insert request logs"
  ON public.api_request_logs FOR INSERT TO service_role
  WITH CHECK (true);

-- ── competitive_analysis ─────────────────────────────────
DROP POLICY IF EXISTS "Service role can manage competitive analysis" ON public.competitive_analysis;
CREATE POLICY "Service role can manage competitive analysis"
  ON public.competitive_analysis FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update competitive analysis" ON public.competitive_analysis;
CREATE POLICY "Service role can update competitive analysis"
  ON public.competitive_analysis FOR UPDATE TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can delete competitive analysis" ON public.competitive_analysis;
CREATE POLICY "Service role can delete competitive analysis"
  ON public.competitive_analysis FOR DELETE TO service_role
  USING (true);

-- ── competitive_metrics_history ──────────────────────────
DROP POLICY IF EXISTS "Service role can insert metrics history" ON public.competitive_metrics_history;
CREATE POLICY "Service role can insert metrics history"
  ON public.competitive_metrics_history FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete metrics history" ON public.competitive_metrics_history;
CREATE POLICY "Service role can delete metrics history"
  ON public.competitive_metrics_history FOR DELETE TO service_role
  USING (true);

-- ── content_quality_analysis ─────────────────────────────
DROP POLICY IF EXISTS "Service role can insert quality analysis" ON public.content_quality_analysis;
CREATE POLICY "Service role can insert quality analysis"
  ON public.content_quality_analysis FOR INSERT TO service_role
  WITH CHECK (true);

-- ── google_oauth_tokens ──────────────────────────────────
DROP POLICY IF EXISTS "Service role can manage Google OAuth tokens" ON public.google_oauth_tokens;
CREATE POLICY "Service role can manage Google OAuth tokens"
  ON public.google_oauth_tokens FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update Google OAuth tokens" ON public.google_oauth_tokens;
CREATE POLICY "Service role can update Google OAuth tokens"
  ON public.google_oauth_tokens FOR UPDATE TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can delete Google OAuth tokens" ON public.google_oauth_tokens;
CREATE POLICY "Service role can delete Google OAuth tokens"
  ON public.google_oauth_tokens FOR DELETE TO service_role
  USING (true);

-- ── integration_health ───────────────────────────────────
DROP POLICY IF EXISTS "Service role can manage integration health" ON public.integration_health;
CREATE POLICY "Service role can manage integration health"
  ON public.integration_health FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update integration health" ON public.integration_health;
CREATE POLICY "Service role can update integration health"
  ON public.integration_health FOR UPDATE TO service_role
  USING (true);
