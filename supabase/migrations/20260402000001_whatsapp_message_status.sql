-- ============================================================
-- P0 FIX: WhatsApp message delivery status
-- Adds send_status, send_attempts, last_error to whatsapp_messages
-- Safe: additive only, no existing columns changed
-- ============================================================

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS send_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (send_status IN ('pending', 'sent', 'delivered', 'failed')),
  ADD COLUMN IF NOT EXISTS send_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Index for querying failed/pending messages (retry jobs)
CREATE INDEX IF NOT EXISTS idx_wa_messages_send_status
  ON whatsapp_messages (tenant_id, send_status)
  WHERE send_status IN ('pending', 'failed');

COMMENT ON COLUMN whatsapp_messages.send_status IS
  'pending=not attempted, sent=API accepted, delivered=webhook confirmed, failed=all retries exhausted';
COMMENT ON COLUMN whatsapp_messages.send_attempts IS
  'Number of send attempts made (max 3)';
COMMENT ON COLUMN whatsapp_messages.last_error IS
  'Last error message from Meta API or network failure';

-- ============================================================
-- P0 FIX: Campaign partial_failure status
-- ============================================================

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_status_check
    CHECK (status IN ('draft', 'active', 'completed', 'partial_failure', 'failed', 'cancelled'));

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS failed_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_rate NUMERIC(5,2);

COMMENT ON COLUMN campaigns.failed_count IS
  'Number of recipients that failed to receive the message';
COMMENT ON COLUMN campaigns.failure_rate IS
  'Percentage of failed sends (0.00-100.00)';

-- ============================================================
-- P0 FIX: Campaign type — add missing types used in TypeScript
-- ============================================================

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_type_check
    CHECK (type IN (
      'reactivation', 'upsell', 'follow_up', 'renewal', 'custom',
      'birthday', 'risk', 'acquisition', 'recurrence'
    ));

COMMENT ON COLUMN campaigns.type IS
  'Campaign type — must match CampaignType in src/types/index.ts';
