-- =============================================================================
-- WhatsApp Phase 1 — Security fixes + schema correctness
-- Safe: all changes are additive or fix broken behaviour
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix send_status constraint — add 'read' (currently rejected at DB level,
--    causing silent failures when Meta delivers a "read" status webhook)
-- ---------------------------------------------------------------------------
ALTER TABLE whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_send_status_check;

ALTER TABLE whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_send_status_check
    CHECK (send_status IN ('pending', 'sent', 'delivered', 'read', 'failed'));

COMMENT ON COLUMN whatsapp_messages.send_status IS
  'pending=not attempted, sent=API accepted, delivered=webhook confirmed, read=recipient read, failed=all retries exhausted';

-- ---------------------------------------------------------------------------
-- 2. Fix RLS on whatsapp_tenant_config
--    BUG: original policy used "tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id)"
--    which is a self-comparison always evaluating to TRUE — effectively no restriction.
--    Fix: use my_tenant_ids() exactly like every other table in this schema.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation_whatsapp_config" ON whatsapp_tenant_config;

CREATE POLICY "wtc_tenant_isolation" ON whatsapp_tenant_config
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- ---------------------------------------------------------------------------
-- 3. Add waba_id to whatsapp_integrations
--    WhatsApp Business Account ID — required for template management API calls.
-- ---------------------------------------------------------------------------
ALTER TABLE whatsapp_integrations
  ADD COLUMN IF NOT EXISTS waba_id TEXT;

COMMENT ON COLUMN whatsapp_integrations.waba_id IS
  'WhatsApp Business Account ID (WABA ID) from Meta Business Manager — used for template API calls';

-- ---------------------------------------------------------------------------
-- 4. Add verify_token to whatsapp_integrations
--    Each tenant gets their own verify_token for webhook verification.
--    This replaces the global WHATSAPP_VERIFY_TOKEN env var in multi-tenant mode.
-- ---------------------------------------------------------------------------
ALTER TABLE whatsapp_integrations
  ADD COLUMN IF NOT EXISTS verify_token TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN whatsapp_integrations.verify_token IS
  'Per-tenant webhook verify_token — operator must copy this into Meta for Developers webhook config';

-- Backfill: generate a unique UUID token for any existing rows that have none.
-- New rows will have their verify_token set at application level (crypto.randomUUID()).
UPDATE whatsapp_integrations
  SET verify_token = gen_random_uuid()::TEXT
  WHERE verify_token = '';
