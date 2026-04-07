-- =============================================================================
-- MANUAL COMPANION SCRIPT: Link A7 Lavanderia users to their tenant
-- =============================================================================
--
-- PURPOSE
--   Links three users to the "A7 Lavanderia" organisation in tenant_users.
--   This is the same SQL that lives in the Supabase migration:
--     supabase/migrations/20260410000004_link_a7lavanderia_users.sql
--
-- HOW TO RUN IN THE SUPABASE SQL EDITOR
--   1. Open https://supabase.com/dashboard → your project
--   2. Go to "SQL Editor" in the left sidebar
--   3. Paste the DO $$ ... $$ block below and click "Run" (Ctrl+Enter)
--   4. Check the "Messages" tab for NOTICE output confirming what was linked
--
-- IDEMPOTENCY
--   Safe to run multiple times. Uses INSERT ... ON CONFLICT DO UPDATE
--   so repeated runs update the role if it changed, never insert duplicates.
--
-- ROLE MAPPING NOTE
--   "manager" is not a valid role in tenant_users.
--   comercial@a7lavanderia.com.br was originally requested as 'manager'
--   and has been mapped to 'admin'.
--   Valid roles: owner | admin | member | viewer
--
-- USERS LINKED
--   Email                                  Role
--   -----------------------------------    ------
--   comercial@a7lavanderia.com.br          admin   (mapped from 'manager')
--   moises.espindola@a7lavanderia.com.br   member
--   comerciala7lavanderia717@gmail.com     member
--
-- EXPECTED NOTICE OUTPUT (when all users exist)
--   NOTICE: Tenant "A7 Lavanderia" resolved: <uuid>
--   NOTICE: Linked comercial@a7lavanderia.com.br (<uuid>) as admin
--   NOTICE: Linked moises.espindola@a7lavanderia.com.br (<uuid>) as member
--   NOTICE: Linked comerciala7lavanderia717@gmail.com (<uuid>) as member
--
-- If a user account does not exist in auth.users yet, that row is skipped
-- with a NOTICE message and the script continues for the remaining users.
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID;
BEGIN

  -- -----------------------------------------------------------------------
  -- 1. Resolve tenant
  -- -----------------------------------------------------------------------
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE name = 'A7 Lavanderia';

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant "A7 Lavanderia" not found — skipping all user links';
    RETURN;
  END IF;

  RAISE NOTICE 'Tenant "A7 Lavanderia" resolved: %', v_tenant_id;

  -- -----------------------------------------------------------------------
  -- 2. comercial@a7lavanderia.com.br → admin
  --    (requested role 'manager' mapped to 'admin' — not a valid enum value)
  -- -----------------------------------------------------------------------
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'comercial@a7lavanderia.com.br';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'admin')
    ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
    RAISE NOTICE 'Linked comercial@a7lavanderia.com.br (%) as admin', v_user_id;
  ELSE
    RAISE NOTICE 'User comercial@a7lavanderia.com.br not found — skipped';
  END IF;

  -- -----------------------------------------------------------------------
  -- 3. moises.espindola@a7lavanderia.com.br → member
  -- -----------------------------------------------------------------------
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'moises.espindola@a7lavanderia.com.br';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'member')
    ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
    RAISE NOTICE 'Linked moises.espindola@a7lavanderia.com.br (%) as member', v_user_id;
  ELSE
    RAISE NOTICE 'User moises.espindola@a7lavanderia.com.br not found — skipped';
  END IF;

  -- -----------------------------------------------------------------------
  -- 4. comerciala7lavanderia717@gmail.com → member
  -- -----------------------------------------------------------------------
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'comerciala7lavanderia717@gmail.com';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'member')
    ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
    RAISE NOTICE 'Linked comerciala7lavanderia717@gmail.com (%) as member', v_user_id;
  ELSE
    RAISE NOTICE 'User comerciala7lavanderia717@gmail.com not found — skipped';
  END IF;

END $$;
