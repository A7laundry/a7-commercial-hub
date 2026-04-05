-- WhatsApp Business integration credentials per tenant.
-- One row per tenant (UNIQUE on tenant_id).
-- api_key and instance_id map to Meta Cloud API credentials
-- (access_token and phone_number_id respectively).

CREATE TABLE IF NOT EXISTS whatsapp_integrations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number          TEXT        NOT NULL DEFAULT '',
  api_key               TEXT        NOT NULL DEFAULT '',
  instance_id           TEXT        NOT NULL DEFAULT '',
  status                TEXT        NOT NULL DEFAULT 'disconnected'
                        CHECK (status IN ('connected', 'disconnected', 'error')),
  last_activity_at      TIMESTAMPTZ,
  webhook_last_event_at TIMESTAMPTZ,
  webhook_status        TEXT        NOT NULL DEFAULT 'unknown'
                        CHECK (webhook_status IN ('active', 'inactive', 'unknown')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_tenant
  ON whatsapp_integrations (tenant_id);

ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_integrations_tenant_isolation" ON whatsapp_integrations
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

COMMENT ON TABLE  whatsapp_integrations IS
  'WhatsApp Business API credentials and connection status. One row per tenant.';
COMMENT ON COLUMN whatsapp_integrations.api_key IS
  'Meta Cloud API permanent access token (maps to WHATSAPP_ACCESS_TOKEN)';
COMMENT ON COLUMN whatsapp_integrations.instance_id IS
  'Meta phone_number_id (maps to WHATSAPP_PHONE_NUMBER_ID)';
COMMENT ON COLUMN whatsapp_integrations.phone_number IS
  'Display number registered in Meta Business Manager';
