-- ============================================================
-- DAILY PERFORMANCE MODULE
-- ============================================================

-- Add loss_reason and unit to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS loss_reason TEXT
    CHECK (loss_reason IN ('only_quote', 'no_response', 'out_of_area', 'info_only', 'price', 'other')),
  ADD COLUMN IF NOT EXISTS unit TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_unit ON accounts (tenant_id, unit);
CREATE INDEX IF NOT EXISTS idx_accounts_loss_reason ON accounts (tenant_id, loss_reason);

-- Daily goals table
CREATE TABLE IF NOT EXISTS daily_goals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  goal_contacts   INT         NOT NULL DEFAULT 0,
  goal_sales      INT         NOT NULL DEFAULT 0,
  goal_revenue    NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_goals UNIQUE (tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_goals_tenant_date ON daily_goals (tenant_id, date);
