-- ============================================================
-- CAMPAIGNS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  type             TEXT        NOT NULL
                   CHECK (type IN ('reactivation','upsell','follow_up','renewal','custom')),
  status           TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','active','completed','cancelled')),
  message_template TEXT        NOT NULL,
  recipient_count  INT         NOT NULL DEFAULT 0,
  sent_count       INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  account_id  UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone       TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','sent','failed','no_phone')),
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_campaign_account UNIQUE (campaign_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant   ON campaigns           (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_camp_recip_campaign ON campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_recip_account  ON campaign_recipients (account_id);

-- RLS
ALTER TABLE campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select" ON campaigns FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "camp_recip_select" ON campaign_recipients FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "camp_recip_insert" ON campaign_recipients FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "camp_recip_update" ON campaign_recipients FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
