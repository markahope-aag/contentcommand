-- ============================================================
-- Existing Content Audit tables
-- ============================================================

-- ── content_pages: per-page metrics from GSC + GA4 ──────────

CREATE TABLE IF NOT EXISTS content_pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  page_url      text NOT NULL,
  page_path     text NOT NULL,
  title         text,

  -- Current period metrics (GSC)
  clicks        integer NOT NULL DEFAULT 0,
  impressions   integer NOT NULL DEFAULT 0,
  ctr           numeric(6,4) NOT NULL DEFAULT 0,
  position      numeric(6,2) NOT NULL DEFAULT 0,

  -- Previous period metrics (GSC)
  prev_clicks      integer NOT NULL DEFAULT 0,
  prev_impressions integer NOT NULL DEFAULT 0,
  prev_ctr         numeric(6,4) NOT NULL DEFAULT 0,
  prev_position    numeric(6,2) NOT NULL DEFAULT 0,

  -- GA4 metrics
  page_views        integer NOT NULL DEFAULT 0,
  bounce_rate       numeric(6,4) NOT NULL DEFAULT 0,
  avg_session_duration numeric(8,2) NOT NULL DEFAULT 0,

  -- Classification
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','decaying','thin','opportunity')),

  -- Period info
  period_start  date NOT NULL,
  period_end    date NOT NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (client_id, page_path, period_end)
);

CREATE INDEX idx_content_pages_client ON content_pages(client_id);
CREATE INDEX idx_content_pages_status ON content_pages(client_id, status);

-- ── content_page_keywords: per-page keyword metrics from GSC ─

CREATE TABLE IF NOT EXISTS content_page_keywords (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  page_path     text NOT NULL,
  keyword       text NOT NULL,

  -- Current period
  clicks        integer NOT NULL DEFAULT 0,
  impressions   integer NOT NULL DEFAULT 0,
  ctr           numeric(6,4) NOT NULL DEFAULT 0,
  position      numeric(6,2) NOT NULL DEFAULT 0,

  -- Previous period
  prev_clicks      integer NOT NULL DEFAULT 0,
  prev_impressions integer NOT NULL DEFAULT 0,
  prev_ctr         numeric(6,4) NOT NULL DEFAULT 0,
  prev_position    numeric(6,2) NOT NULL DEFAULT 0,

  period_end    date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (client_id, page_path, keyword, period_end)
);

CREATE INDEX idx_cpk_client ON content_page_keywords(client_id);
CREATE INDEX idx_cpk_striking ON content_page_keywords(client_id, position)
  WHERE position >= 4 AND position <= 20;

-- ── content_audit_syncs: track sync jobs ────────────────────

CREATE TABLE IF NOT EXISTS content_audit_syncs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','completed','failed')),
  pages_synced  integer NOT NULL DEFAULT 0,
  keywords_synced integer NOT NULL DEFAULT 0,
  error_message text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX idx_cas_client ON content_audit_syncs(client_id);

-- ── RLS Policies ────────────────────────────────────────────

ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_page_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_audit_syncs ENABLE ROW LEVEL SECURITY;

-- SELECT via user_client_ids()
CREATE POLICY "content_pages_select" ON content_pages
  FOR SELECT USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "content_page_keywords_select" ON content_page_keywords
  FOR SELECT USING (client_id IN (SELECT user_client_ids()));

CREATE POLICY "content_audit_syncs_select" ON content_audit_syncs
  FOR SELECT USING (client_id IN (SELECT user_client_ids()));

-- Service role handles writes (via admin client)

-- ── Summary function ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_content_audit_summary(p_client_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_pages', count(*),
    'total_clicks', coalesce(sum(clicks), 0),
    'total_impressions', coalesce(sum(impressions), 0),
    'avg_position', round(coalesce(avg(position), 0)::numeric, 1),
    'avg_ctr', round(coalesce(avg(ctr), 0)::numeric, 4),
    'decaying_count', count(*) FILTER (WHERE status = 'decaying'),
    'thin_count', count(*) FILTER (WHERE status = 'thin'),
    'opportunity_count', count(*) FILTER (WHERE status = 'opportunity'),
    'active_count', count(*) FILTER (WHERE status = 'active')
  )
  FROM content_pages
  WHERE client_id = p_client_id
    AND period_end = (
      SELECT max(period_end) FROM content_pages WHERE client_id = p_client_id
    );
$$;
