-- ============================================================
-- CLIENT CODE — sequential identifier per account
-- Format: A7-00001, A7-00002, ...
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS accounts_client_code_seq START 1;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;

-- Auto-generate on INSERT if not provided
CREATE OR REPLACE FUNCTION set_client_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_code IS NULL THEN
    NEW.client_code := 'A7-' || LPAD(nextval('accounts_client_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_client_code
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION set_client_code();

-- Backfill existing rows (ordered by created_at so oldest gets lowest number)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM accounts WHERE client_code IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE accounts
      SET client_code = 'A7-' || LPAD(nextval('accounts_client_code_seq')::text, 5, '0')
      WHERE id = rec.id;
  END LOOP;
END;
$$;
