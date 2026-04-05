-- Fix: whatsapp_messages UPDATE policy was missing WITH CHECK clause.
-- Without WITH CHECK on FOR UPDATE, a user belonging to multiple tenants could
-- change the tenant_id of a row to any other tenant they belong to.
-- This replaces the original "wa_messages_update" policy with a correct version.

DROP POLICY IF EXISTS "wa_messages_update" ON whatsapp_messages;

CREATE POLICY "wa_messages_update" ON whatsapp_messages
  FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
