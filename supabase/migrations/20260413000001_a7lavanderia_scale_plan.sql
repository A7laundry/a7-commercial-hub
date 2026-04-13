-- ---------------------------------------------------------------------------
-- Upgrade "A7 Lavanderia" subscription to scale plan (unlimited accounts)
--
-- Idempotent: safe to run multiple times.
-- Scale plan: maxAccounts = -1 (unlimited), all features enabled.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN

  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE name = 'A7 Lavanderia';

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant "A7 Lavanderia" not found — skipping';
    RETURN;
  END IF;

  INSERT INTO subscriptions (tenant_id, status, plan)
  VALUES (v_tenant_id, 'active', 'scale')
  ON CONFLICT (tenant_id) DO UPDATE
    SET plan    = 'scale',
        status  = 'active',
        updated_at = now();

  RAISE NOTICE 'A7 Lavanderia (%) upgraded to scale/active', v_tenant_id;

END $$;
