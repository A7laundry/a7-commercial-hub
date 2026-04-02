-- ============================================================
-- DEALS MODULE
-- ============================================================

-- deals table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value NUMERIC(14,2),
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_close_date DATE,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  loss_reason TEXT CHECK (loss_reason IN ('price', 'no_response', 'out_of_area', 'competitor', 'budget', 'timing', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- deal_stage_history for audit trail
CREATE TABLE deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Indexes
CREATE INDEX idx_deals_tenant_stage ON deals (tenant_id, stage);
CREATE INDEX idx_deals_account ON deals (account_id);
CREATE INDEX idx_deals_assigned ON deals (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_deal_history_deal ON deal_stage_history (deal_id, changed_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_select" ON deals FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "deals_insert" ON deals FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "deals_update" ON deals FOR UPDATE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "deals_delete" ON deals FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "deal_history_select" ON deal_stage_history FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "deal_history_insert" ON deal_stage_history FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
