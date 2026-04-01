-- ============================================================
-- INTERACTION OUTCOMES
-- Tracks the result of each daily interaction/contact
-- ============================================================

CREATE TABLE IF NOT EXISTS interaction_outcomes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id     UUID          REFERENCES accounts(id) ON DELETE SET NULL,
  account_name   TEXT,
  date           DATE          NOT NULL,
  operator_name  TEXT          NOT NULL DEFAULT 'Equipe',
  unit           TEXT,
  outcome_type   TEXT          NOT NULL
                 CHECK (outcome_type IN (
                   'sale', 'quote_only', 'no_response',
                   'out_of_area', 'info_only', 'lost_price',
                   'follow_up_pending'
                 )),
  revenue_amount NUMERIC(14,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_tenant_date    ON interaction_outcomes (tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_outcomes_operator       ON interaction_outcomes (tenant_id, operator_name);
CREATE INDEX IF NOT EXISTS idx_outcomes_outcome_type   ON interaction_outcomes (tenant_id, outcome_type);
CREATE INDEX IF NOT EXISTS idx_outcomes_account        ON interaction_outcomes (account_id);

-- RLS
ALTER TABLE interaction_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can manage outcomes"
  ON interaction_outcomes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = interaction_outcomes.tenant_id
        AND tenant_users.user_id   = auth.uid()
    )
  );
