-- Add created_by to account_timeline for operator attribution
-- Historical rows stay NULL — attribution starts from this migration

alter table account_timeline
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists account_timeline_created_by_idx
  on account_timeline(tenant_id, created_by, created_at desc);
