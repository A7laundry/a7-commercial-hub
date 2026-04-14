-- ---------------------------------------------------------------------------
-- Internal chat: messages between users of the same tenant
-- ---------------------------------------------------------------------------

CREATE TABLE internal_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX internal_messages_receiver_idx ON internal_messages (tenant_id, receiver_id, created_at DESC);
CREATE INDEX internal_messages_thread_idx   ON internal_messages (tenant_id, sender_id, receiver_id, created_at DESC);

ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages where they are sender or receiver (within their tenant)
CREATE POLICY "chat_read" ON internal_messages
  FOR SELECT TO authenticated
  USING (
    tenant_id = ANY(public.my_tenant_ids())
    AND (sender_id = auth.uid() OR receiver_id = auth.uid())
  );

-- Users can only insert messages they are sending
CREATE POLICY "chat_insert" ON internal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ANY(public.my_tenant_ids())
    AND sender_id = auth.uid()
  );

-- Users can only mark as read messages they received
CREATE POLICY "chat_update_read" ON internal_messages
  FOR UPDATE TO authenticated
  USING (
    tenant_id = ANY(public.my_tenant_ids())
    AND receiver_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = ANY(public.my_tenant_ids())
    AND receiver_id = auth.uid()
  );
