-- subscriptions: one row per tenant, tracks Stripe billing state
CREATE TABLE subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  status                  text        NOT NULL DEFAULT 'trialing',
  -- status values: trialing | active | past_due | canceled | paused
  plan                    text        NOT NULL DEFAULT 'free',
  -- plan values: free | pro | scale
  current_period_end      timestamptz,
  trial_end               timestamptz,
  cancel_at_period_end    boolean     NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('trialing','active','past_due','canceled','paused')),
  CONSTRAINT subscriptions_plan_check   CHECK (plan   IN ('free','pro','scale'))
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_tenant_isolation" ON subscriptions
  FOR ALL TO authenticated
  USING  (tenant_id = ANY(public.my_tenant_ids()))
  WITH CHECK (tenant_id = ANY(public.my_tenant_ids()));

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
