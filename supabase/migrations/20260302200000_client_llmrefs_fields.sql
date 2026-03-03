-- Add LLMrefs configuration fields to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS llmrefs_org_id text,
  ADD COLUMN IF NOT EXISTS llmrefs_project_id text;
