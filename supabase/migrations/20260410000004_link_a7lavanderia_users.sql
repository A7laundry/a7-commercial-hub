-- ---------------------------------------------------------------------------
-- Link founding users to the "A7 Lavanderia" tenant
--
-- Idempotent: safe to run multiple times.
-- Uses INSERT ... ON CONFLICT DO UPDATE so a role change is also applied
-- on subsequent runs without duplicating rows.
--
-- Role mapping note:
--   "manager" is not a valid role in tenant_users.
--   comercial@a7lavanderia.com.br was requested as 'manager' → mapped to 'admin'
--   (valid roles: owner | admin | member | viewer)
-- ---------------------------------------------------------------------------

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
