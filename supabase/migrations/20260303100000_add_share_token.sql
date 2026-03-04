-- Add share_token column to generated_content for public sharing
ALTER TABLE generated_content ADD COLUMN share_token TEXT UNIQUE;

CREATE INDEX idx_generated_content_share_token ON generated_content (share_token) WHERE share_token IS NOT NULL;
