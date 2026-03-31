-- ============================================================
-- CRM PIPELINE LAYER
-- ============================================================

-- Add pipeline + commercial fields to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'lead'
    CHECK (pipeline_stage IN ('lead', 'in_service', 'quote_sent', 'negotiating', 'closed', 'recurring')),
  ADD COLUMN IF NOT EXISTS commercial_status TEXT NOT NULL DEFAULT 'active'
    CHECK (commercial_status IN ('active', 'at_risk', 'lost')),
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS frequency TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_pipeline ON accounts (tenant_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_accounts_commercial ON accounts (tenant_id, commercial_status);

-- ============================================================
-- WHATSAPP MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  phone         TEXT        NOT NULL,
  message_text  TEXT        NOT NULL,
  direction     TEXT        NOT NULL DEFAULT 'inbound'
                CHECK (direction IN ('inbound', 'outbound')),
  wa_message_id TEXT        UNIQUE,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_tenant  ON whatsapp_messages (tenant_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone   ON whatsapp_messages (phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_account ON whatsapp_messages (account_id) WHERE account_id IS NOT NULL;

-- ============================================================
-- PHONE MAPPINGS (phone number → account)
-- ============================================================
CREATE TABLE IF NOT EXISTS phone_mappings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone      TEXT        NOT NULL,
  account_id UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_phone_tenant UNIQUE (tenant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_phone_mappings ON phone_mappings (tenant_id, phone);

-- ============================================================
-- AUTOMATION TRIGGERS
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_triggers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id     UUID        REFERENCES accounts(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL
                 CHECK (type IN ('upsell', 'cross_sell', 'remarketing', 'reactivation')),
  status         TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'fired', 'dismissed')),
  reason         TEXT,
  scheduled_for  TIMESTAMPTZ,
  fired_at       TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_tenant ON automation_triggers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_account ON automation_triggers (account_id) WHERE account_id IS NOT NULL;

-- ============================================================
-- RLS FOR NEW TABLES
-- ============================================================
ALTER TABLE whatsapp_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_mappings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;

-- whatsapp_messages
CREATE POLICY "wa_messages_select" ON whatsapp_messages FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "wa_messages_insert" ON whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "wa_messages_update" ON whatsapp_messages FOR UPDATE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

-- phone_mappings
CREATE POLICY "phone_mappings_select" ON phone_mappings FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "phone_mappings_insert" ON phone_mappings FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "phone_mappings_update" ON phone_mappings FOR UPDATE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "phone_mappings_delete" ON phone_mappings FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

-- automation_triggers
CREATE POLICY "automation_select" ON automation_triggers FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "automation_insert" ON automation_triggers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
CREATE POLICY "automation_update" ON automation_triggers FOR UPDATE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
