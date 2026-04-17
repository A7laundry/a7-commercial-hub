-- Add expires_at to documents table
-- Required for document expiry tracking in the dashboard widget
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;

-- Index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_documents_expires_at
  ON documents (tenant_id, expires_at)
  WHERE expires_at IS NOT NULL;
