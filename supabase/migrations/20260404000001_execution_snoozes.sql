-- Execution snoozes: persist per-account dismiss from Minha Fila
create table if not exists execution_snoozes (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  account_id   uuid not null references accounts(id) on delete cascade,
  snoozed_until timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (tenant_id, account_id)
);

alter table execution_snoozes enable row level security;

create policy "tenant_isolation" on execution_snoozes
  using (tenant_id = (
    select tenant_id from tenant_users
    where user_id = auth.uid()
    limit 1
  ));
