-- ============================================================
-- Sprint 9: Onboarding + Activation
-- Creates onboarding_state and activation_metrics tables
-- with RLS tenant isolation and updated_at triggers.
-- ============================================================

-- ── 1. onboarding_state ───────────────────────────────────────────────────────

CREATE TABLE onboarding_state (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_first_account boolean     NOT NULL DEFAULT false,
  connected_whatsapp    boolean     NOT NULL DEFAULT false,
  sent_first_message    boolean     NOT NULL DEFAULT false,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_state_tenant_isolation" ON onboarding_state
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE TRIGGER trg_onboarding_state_updated_at
  BEFORE UPDATE ON onboarding_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. activation_metrics ─────────────────────────────────────────────────────

CREATE TABLE activation_metrics (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_created_at      timestamptz,
  whatsapp_connected_at   timestamptz,
  first_message_sent_at   timestamptz,
  activated_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE activation_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activation_metrics_tenant_isolation" ON activation_metrics
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE TRIGGER trg_activation_metrics_updated_at
  BEFORE UPDATE ON activation_metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
