-- Account Timeline — persistent activity log per account
-- Used for: "what happened with this client", priority context, operational memory

create table if not exists account_timeline (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references tenants(id) on delete cascade,
  account_id  uuid        not null references accounts(id) on delete cascade,
  event_type  text        not null, -- message_sent | stage_changed | deal_created | deal_won | deal_lost | alert | snooze | note | action_taken
  summary     text        not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists account_timeline_account_idx on account_timeline(account_id, created_at desc);
create index if not exists account_timeline_tenant_idx  on account_timeline(tenant_id, created_at desc);

alter table account_timeline enable row level security;

create policy "tenant isolation" on account_timeline
  for all using (
    tenant_id = (
      select tenant_id from tenant_users where user_id = auth.uid() limit 1
    )
  );
