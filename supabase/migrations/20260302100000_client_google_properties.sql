-- Add explicit Google property mapping to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS gsc_site_url text,
  ADD COLUMN IF NOT EXISTS ga4_property_id text;

COMMENT ON COLUMN clients.gsc_site_url IS 'Google Search Console site URL (e.g. https://example.com or sc-domain:example.com)';
COMMENT ON COLUMN clients.ga4_property_id IS 'Google Analytics 4 property ID (numeric, e.g. 123456789)';
