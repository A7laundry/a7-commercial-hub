-- ── phone_mappings v2 ─────────────────────────────────────────────────────────
-- Add source tracking + updated_at for auditability

ALTER TABLE phone_mappings
  ADD COLUMN IF NOT EXISTS source      TEXT NOT NULL DEFAULT 'auto'
    CHECK (source IN ('auto', 'manual', 'import')),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── whatsapp_tenant_config ─────────────────────────────────────────────────────
-- Maps WhatsApp Business phone_number_id → tenant
-- Allows the Meta webhook to identify the tenant without a phone_mapping
-- (one row per WhatsApp Business number registered for a tenant)

CREATE TABLE IF NOT EXISTS whatsapp_tenant_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wa_phone_number_id UNIQUE (phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_tenant_config
  ON whatsapp_tenant_config (phone_number_id);

-- RLS: same pattern as rest of CRM
ALTER TABLE whatsapp_tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_whatsapp_config"
  ON whatsapp_tenant_config
  FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));
