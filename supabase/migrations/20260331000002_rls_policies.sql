-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: tenant IDs for current user (public schema)
-- ============================================================
CREATE OR REPLACE FUNCTION public.my_tenant_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    ),
    '{}'::UUID[]
  );
$$;

-- ============================================================
-- TENANTS
-- ============================================================
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT TO authenticated
  USING (id = ANY(public.my_tenant_ids()));

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE TO authenticated
  USING (id = ANY(public.my_tenant_ids()))
  WITH CHECK (id = ANY(public.my_tenant_ids()));

-- ============================================================
-- TENANT_USERS
-- ============================================================
CREATE POLICY "tenant_users_select" ON tenant_users
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "tenant_users_insert" ON tenant_users
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE POLICY "accounts_select" ON accounts
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE POLICY "contracts_select" ON contracts
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "contracts_delete" ON contracts
  FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "documents_update" ON documents
  FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

-- ============================================================
-- ALERTS
-- ============================================================
CREATE POLICY "alerts_select" ON alerts
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "alerts_insert" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- No DELETE on alerts — only resolved, never deleted
