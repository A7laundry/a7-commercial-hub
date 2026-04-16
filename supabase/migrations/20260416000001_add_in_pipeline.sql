-- Add in_pipeline flag to accounts
-- Controls which accounts appear in the Kanban board.
-- true  = account is actively progressing through the pipeline (new registrations, activated accounts)
-- false = account exists in the DB but is not yet in the active pipeline (old/dormant records)

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS in_pipeline boolean NOT NULL DEFAULT false;

-- All existing accounts default to false (clean slate).
-- Operators will activate dormant accounts via the "Ativar" button in the Clientes list.
-- New accounts created via the app will be set to true automatically.
