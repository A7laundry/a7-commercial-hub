-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL CHECK (char_length(name) >= 2),
  slug       TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TENANT USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
             CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user   ON tenant_users (user_id);

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL CHECK (char_length(name) >= 1),
  segment       TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'prospect')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts (tenant_id, status);

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID          NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  account_id  UUID          NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  title       TEXT          NOT NULL CHECK (char_length(title) >= 1),
  status      TEXT          NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'active', 'expiring', 'expired', 'cancelled')),
  currency    CHAR(3)       NOT NULL DEFAULT 'BRL',
  total_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
  starts_at   DATE          NOT NULL,
  ends_at     DATE          NOT NULL,
  auto_renew  BOOLEAN       NOT NULL DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_contract_dates CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant  ON contracts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_account ON contracts (account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_ends_at ON contracts (tenant_id, ends_at);
CREATE INDEX IF NOT EXISTS idx_contracts_status  ON contracts (tenant_id, status);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  account_id   UUID        REFERENCES accounts(id)           ON DELETE SET NULL,
  contract_id  UUID        REFERENCES contracts(id)          ON DELETE SET NULL,
  name         TEXT        NOT NULL CHECK (char_length(name) >= 1),
  doc_type     TEXT        NOT NULL DEFAULT 'general',
  storage_path TEXT        NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT,
  version      SMALLINT    NOT NULL DEFAULT 1 CHECK (version > 0),
  uploaded_by  UUID        NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_doc_parent CHECK (
    account_id IS NOT NULL OR contract_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant   ON documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_account  ON documents (account_id)  WHERE account_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents (contract_id) WHERE contract_id IS NOT NULL;

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  account_id  UUID        REFERENCES accounts(id)           ON DELETE SET NULL,
  contract_id UUID        REFERENCES contracts(id)          ON DELETE SET NULL,
  type        TEXT        NOT NULL,
  severity    TEXT        NOT NULL DEFAULT 'warning'
              CHECK (severity IN ('info', 'warning', 'critical')),
  title       TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_alert_entity CHECK (
    account_id IS NOT NULL OR contract_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_open   ON alerts (tenant_id) WHERE status = 'open';

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
