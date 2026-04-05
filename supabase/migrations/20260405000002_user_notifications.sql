-- ─────────────────────────────────────────────────────────────────────────────
-- user_notifications
-- Tracks digest and alert notifications sent per tenant.
-- Used for anti-spam: max 1 daily_digest per tenant per day.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists user_notifications (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references tenants(id) on delete cascade,
  type       text        not null,   -- 'daily_digest' | 'urgent_alert' | etc.
  payload    jsonb,                  -- digest content, for audit/debug
  sent_at    timestamptz not null default now()
);

create index if not exists user_notifications_tenant_type_sent_at_idx
  on user_notifications (tenant_id, type, sent_at desc);

alter table user_notifications enable row level security;

create policy "tenant_isolation" on user_notifications
  for all using (
    tenant_id in (
      select tenant_id from tenant_users where user_id = auth.uid()
    )
  );
