-- ============================================================
-- ACCOUNT ENRICHMENT — commercial-first onboarding
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'pf'
    CHECK (client_type IN ('pf', 'pj')),
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_client_type ON accounts (tenant_id, client_type);
CREATE INDEX IF NOT EXISTS idx_accounts_source ON accounts (tenant_id, source);
