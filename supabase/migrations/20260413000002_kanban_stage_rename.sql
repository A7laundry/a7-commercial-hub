-- Rename pipeline stages to match the new 6-column Kanban structure:
--   Lead → Em contato → Proposta → Sucesso → Cliente ativo → Recorrente
--
-- Mapping:
--   in_service  → em_contato
--   negotiating → em_contato
--   quote_sent  → proposta
--   closed      → sucesso
--   recurring   → recorrente
--   lead        (unchanged)

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_pipeline_stage_check;

UPDATE accounts
SET pipeline_stage = CASE pipeline_stage
  WHEN 'in_service'  THEN 'em_contato'
  WHEN 'negotiating' THEN 'em_contato'
  WHEN 'quote_sent'  THEN 'proposta'
  WHEN 'closed'      THEN 'sucesso'
  WHEN 'recurring'   THEN 'recorrente'
  ELSE pipeline_stage
END
WHERE pipeline_stage IN ('in_service', 'negotiating', 'quote_sent', 'closed', 'recurring');

ALTER TABLE accounts
  ADD CONSTRAINT accounts_pipeline_stage_check
  CHECK (pipeline_stage = ANY (ARRAY[
    'lead', 'em_contato', 'proposta', 'sucesso', 'cliente', 'recorrente'
  ]));
