-- ---------------------------------------------------------------------------
-- Phase 2: wa_conversations — one row per tenant+phone
-- ---------------------------------------------------------------------------

-- 1. Create wa_conversations table
CREATE TABLE IF NOT EXISTS wa_conversations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id            UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  phone                 TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'resolved', 'archived')),
  assigned_to           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at       TIMESTAMPTZ,
  last_message_preview  TEXT,
  last_message_direction TEXT        CHECK (last_message_direction IN ('inbound', 'outbound')),
  unread_count          INTEGER     NOT NULL DEFAULT 0,
  window_expires_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, phone)
);

CREATE INDEX IF NOT EXISTS wa_conversations_tenant_last_message_at_idx
  ON wa_conversations (tenant_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS wa_conversations_tenant_phone_idx
  ON wa_conversations (tenant_id, phone);

CREATE INDEX IF NOT EXISTS wa_conversations_assigned_to_idx
  ON wa_conversations (assigned_to);

-- 2. RLS
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wac_tenant_isolation" ON wa_conversations
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- 3. Add conversation_id FK to whatsapp_messages
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID
    REFERENCES wa_conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_id_idx
  ON whatsapp_messages (conversation_id);

-- 4. Atomic upsert function
--    Called by both ingest (inbound) and send (outbound) routes.
--    For inbound: increments unread_count, extends window_expires_at.
--    For outbound: resets unread_count to 0 (operator has "seen" the thread).
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
    -- Keep account_id once it has been set; only accept new value if not already known
    account_id            = COALESCE(wa_conversations.account_id, EXCLUDED.account_id),
    -- Advance last_message if this message is newer
    last_message_at       = GREATEST(wa_conversations.last_message_at, EXCLUDED.last_message_at),
    last_message_preview  = CASE
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
    unread_count          = CASE
                              WHEN p_direction = 'inbound'  THEN wa_conversations.unread_count + 1
                              ELSE 0
                            END,
    -- Extend 24h window only for inbound
    window_expires_at     = CASE
                              WHEN p_direction = 'inbound'
                              THEN GREATEST(v_window_expires_at, wa_conversations.window_expires_at)
                              ELSE wa_conversations.window_expires_at
                            END,
    updated_at            = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. Mark-as-read helper — resets unread_count and clears window guard
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE wa_conversations
  SET unread_count = 0,
      updated_at   = NOW()
  WHERE id = p_conversation_id;
END;
$$;

-- 6. Backfill: create conversation rows from existing messages
--    DISTINCT ON keeps only the latest message per (tenant_id, phone).
INSERT INTO wa_conversations (
  tenant_id, phone, account_id,
  last_message_at, last_message_preview, last_message_direction,
  unread_count, window_expires_at, created_at, updated_at
)
SELECT DISTINCT ON (tenant_id, phone)
  tenant_id,
  phone,
  account_id,
  received_at                           AS last_message_at,
  LEFT(message_text, 200)               AS last_message_preview,
  direction                             AS last_message_direction,
  0                                     AS unread_count,
  NULL::TIMESTAMPTZ                     AS window_expires_at,
  MIN(received_at) OVER (PARTITION BY tenant_id, phone) AS created_at,
  NOW()                                 AS updated_at
FROM whatsapp_messages
ORDER BY tenant_id, phone, received_at DESC
ON CONFLICT (tenant_id, phone) DO NOTHING;

-- 7. Link existing messages to their conversation rows
UPDATE whatsapp_messages wm
SET conversation_id = wc.id
FROM wa_conversations wc
WHERE wm.tenant_id = wc.tenant_id
  AND wm.phone     = wc.phone
  AND wm.conversation_id IS NULL;
