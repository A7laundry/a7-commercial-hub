-- ============================================================
-- SECURITY FIXES — Hotfix for RLS gaps found in audit
-- Safe: DROP existing broken policies, add correct ones.
-- ============================================================

-- ── 1. daily_goals — no RLS at all ───────────────────────────────────────────
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_goals_all" ON daily_goals
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- ── 2. whatsapp_tenant_config — tautological policy (WHERE id = tenant_id) ───
DROP POLICY IF EXISTS "tenant_isolation_whatsapp_config" ON whatsapp_tenant_config;

CREATE POLICY "whatsapp_tenant_config_all" ON whatsapp_tenant_config
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- ── 3. execution_snoozes — USING only, no WITH CHECK on INSERT ───────────────
DROP POLICY IF EXISTS "tenant_isolation" ON execution_snoozes;

CREATE POLICY "execution_snoozes_all" ON execution_snoozes
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- ── 4. account_timeline — FOR ALL without WITH CHECK, allows cross-tenant INSERT
DROP POLICY IF EXISTS "tenant isolation" ON account_timeline;

CREATE POLICY "account_timeline_all" ON account_timeline
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

-- ── 5. user_notifications — same: FOR ALL without WITH CHECK ─────────────────
DROP POLICY IF EXISTS "tenant_isolation" ON user_notifications;

CREATE POLICY "user_notifications_all" ON user_notifications
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));
