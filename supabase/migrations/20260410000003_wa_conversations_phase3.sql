-- ---------------------------------------------------------------------------
-- Phase 3: wa_conversations — operational status, assignment metadata,
--          SLA hooks (first_response_at, resolved_at, assigned_at)
-- Zero-regression: all columns nullable or with defaults; backfill-safe.
-- ---------------------------------------------------------------------------

-- 1. Expand status CHECK to include operational values
--    Old set: ('open', 'resolved', 'archived')
--    New set adds: pending_customer, pending_internal, spam
ALTER TABLE wa_conversations
  DROP CONSTRAINT IF EXISTS wa_conversations_status_check;

ALTER TABLE wa_conversations
  ADD CONSTRAINT wa_conversations_status_check
    CHECK (status IN (
      'open',
      'pending_customer',
      'pending_internal',
      'resolved',
      'spam',
      'archived'          -- kept for backwards compat; no new code sets it
    ));

-- 2. Add operational timestamp columns (all nullable, no effect on existing rows)
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS assigned_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at  TIMESTAMPTZ;

-- 3. New indexes for filter queries
CREATE INDEX IF NOT EXISTS wa_conversations_tenant_status_idx
  ON wa_conversations (tenant_id, status);

-- assigned_to index already exists from Phase 2

-- 4. Replace upsert_wa_conversation to add:
--    a) Status reopen: resolved → open on new inbound
--    b) Spam protection: spam stays spam even on new inbound
--    c) resolved_at cleared on reopen
CREATE OR REPLACE FUNCTION upsert_wa_conversation(
  p_tenant_id           UUID,
  p_phone               TEXT,
  p_account_id          UUID,
  p_direction           TEXT,        -- 'inbound' | 'outbound'
  p_message_preview     TEXT,
  p_message_at          TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id                UUID;
  v_window_expires_at TIMESTAMPTZ;
BEGIN
  IF p_direction = 'inbound' THEN
    v_window_expires_at := p_message_at + INTERVAL '24 hours';
  END IF;

  INSERT INTO wa_conversations (
    tenant_id, phone, account_id,
    last_message_at, last_message_preview, last_message_direction,
    unread_count, window_expires_at, updated_at
  )
  VALUES (
    p_tenant_id, p_phone, p_account_id,
    p_message_at,
    LEFT(p_message_preview, 200),
    p_direction,
    CASE WHEN p_direction = 'inbound' THEN 1 ELSE 0 END,
    v_window_expires_at,
    NOW()
  )
  ON CONFLICT (tenant_id, phone) DO UPDATE SET
    -- Keep account_id once set; only accept new value if not yet known
    account_id             = COALESCE(wa_conversations.account_id, EXCLUDED.account_id),

    -- Advance last_message if this message is newer
    last_message_at        = GREATEST(wa_conversations.last_message_at, EXCLUDED.last_message_at),
    last_message_preview   = CASE
                               WHEN EXCLUDED.last_message_at >= COALESCE(wa_conversations.last_message_at, EXCLUDED.last_message_at)
                               THEN EXCLUDED.last_message_preview
                               ELSE wa_conversations.last_message_preview
                             END,
    last_message_direction = CASE
                               WHEN EXCLUDED.last_message_at >= COALESCE(wa_conversations.last_message_at, EXCLUDED.last_message_at)
                               THEN EXCLUDED.last_message_direction
                               ELSE wa_conversations.last_message_direction
                             END,

    -- unread: +1 for inbound, reset to 0 for outbound
    unread_count           = CASE
                               WHEN p_direction = 'inbound' THEN wa_conversations.unread_count + 1
                               ELSE 0
                             END,

    -- Extend 24h window only for inbound
    window_expires_at      = CASE
                               WHEN p_direction = 'inbound'
                               THEN GREATEST(v_window_expires_at, wa_conversations.window_expires_at)
                               ELSE wa_conversations.window_expires_at
                             END,

    -- Status reopen rules:
    --   inbound + resolved  → reopen to 'open'
    --   inbound + spam      → stay 'spam' (operator decision respected)
    --   inbound + anything else → unchanged
    --   outbound → unchanged
    status                 = CASE
                               WHEN p_direction = 'inbound' AND wa_conversations.status = 'resolved'
                               THEN 'open'
                               ELSE wa_conversations.status
                             END,

    -- Clear resolved_at when conversation is reopened
    resolved_at            = CASE
                               WHEN p_direction = 'inbound' AND wa_conversations.status = 'resolved'
                               THEN NULL
                               ELSE wa_conversations.resolved_at
                             END,

    updated_at             = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
