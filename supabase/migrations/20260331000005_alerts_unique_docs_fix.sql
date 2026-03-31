-- Unique constraint for alerts upsert deduplication
ALTER TABLE alerts
  ADD CONSTRAINT uq_alert_contract_type
  UNIQUE (tenant_id, contract_id, type);

-- Drop the parent requirement so documents can be uploaded globally
-- (without being linked to a specific account or contract)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_doc_parent;
