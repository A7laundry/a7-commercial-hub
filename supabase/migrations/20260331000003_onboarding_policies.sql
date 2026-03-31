-- Fix: allow authenticated users to INSERT tenants (onboarding)
CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Fix: allow users to insert themselves into tenant_users (onboarding)
-- Drop old restrictive policy first
DROP POLICY IF EXISTS "tenant_users_insert" ON tenant_users;

CREATE POLICY "tenant_users_insert" ON tenant_users
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR tenant_id = ANY(public.my_tenant_ids())
  );
