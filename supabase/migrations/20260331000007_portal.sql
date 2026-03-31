-- ============================================================
-- CLIENT PORTAL
-- ============================================================

-- portal_clients: maps auth users → account within a tenant
CREATE TABLE IF NOT EXISTS portal_clients (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  account_id UUID        NOT NULL REFERENCES accounts(id)  ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id)          ON DELETE SET NULL,
  email      TEXT        NOT NULL,
  name       TEXT,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_portal_client UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_portal_clients_user    ON portal_clients (user_id)    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_clients_account ON portal_clients (account_id);
CREATE INDEX IF NOT EXISTS idx_portal_clients_tenant  ON portal_clients (tenant_id);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  account_id  UUID        NOT NULL REFERENCES accounts(id)  ON DELETE CASCADE,
  contract_id UUID        REFERENCES contracts(id)           ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  amount      NUMERIC(14,2) NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date    DATE        NOT NULL,
  paid_at     TIMESTAMPTZ,
  reference   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_account ON invoices (tenant_id, account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices (tenant_id, status);

-- ── Helper: returns portal context (tenant + account) for current user ──────
CREATE OR REPLACE FUNCTION public.my_portal_context()
RETURNS TABLE(tenant_id UUID, account_id UUID)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT tenant_id, account_id
  FROM portal_clients
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE portal_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;

-- portal_clients — self-read (portal user sees own record)
CREATE POLICY "portal_clients_self"
  ON portal_clients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- portal_clients — tenant admin CRUD
CREATE POLICY "portal_clients_tenant_select"
  ON portal_clients FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "portal_clients_tenant_insert"
  ON portal_clients FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "portal_clients_tenant_update"
  ON portal_clients FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "portal_clients_tenant_delete"
  ON portal_clients FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

-- invoices — tenant admin CRUD
CREATE POLICY "invoices_tenant_select"
  ON invoices FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "invoices_tenant_insert"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE POLICY "invoices_tenant_update"
  ON invoices FOR UPDATE TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- invoices — portal client read (via my_portal_context)
CREATE POLICY "portal_invoices_select"
  ON invoices FOR SELECT TO authenticated
  USING (
    account_id = (SELECT account_id FROM public.my_portal_context() LIMIT 1)
    AND tenant_id = (SELECT tenant_id FROM public.my_portal_context() LIMIT 1)
  );

-- contracts — portal client read
CREATE POLICY "portal_contracts_select"
  ON contracts FOR SELECT TO authenticated
  USING (
    account_id = (SELECT account_id FROM public.my_portal_context() LIMIT 1)
    AND tenant_id = (SELECT tenant_id FROM public.my_portal_context() LIMIT 1)
  );

-- documents — portal client read
CREATE POLICY "portal_documents_select"
  ON documents FOR SELECT TO authenticated
  USING (
    account_id = (SELECT account_id FROM public.my_portal_context() LIMIT 1)
    AND tenant_id = (SELECT tenant_id FROM public.my_portal_context() LIMIT 1)
  );

-- accounts — portal client read (their own account info)
CREATE POLICY "portal_accounts_select"
  ON accounts FOR SELECT TO authenticated
  USING (
    id        = (SELECT account_id FROM public.my_portal_context() LIMIT 1)
    AND tenant_id = (SELECT tenant_id FROM public.my_portal_context() LIMIT 1)
  );
