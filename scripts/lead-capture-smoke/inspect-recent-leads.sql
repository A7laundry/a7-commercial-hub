-- ─────────────────────────────────────────────────────────────────────────────
-- inspect-recent-leads.sql — inspeção rápida pós smoke test
--
-- Rode no Supabase SQL Editor logo após disparar o mock-meta-webhook.sh.
-- Mostra TUDO que o sistema criou: Account, Deal, phone_mapping, timeline, msg.
--
-- Substitua <TENANT_ID> pelo UUID do seu tenant ANTES de rodar.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. ÚLTIMOS 5 LEADS CRIADOS PELO WEBHOOK (últimos 60 min)
SELECT
  a.id,
  a.created_at,
  a.name,
  a.source,
  a.tags,
  a.unit,
  a.pipeline_stage,
  a.next_action,
  pm.phone        AS lead_phone,
  pm.source       AS mapping_source
FROM accounts a
LEFT JOIN phone_mappings pm ON pm.account_id = a.id
WHERE a.tenant_id = '<TENANT_ID>'
  AND a.source LIKE 'website-%'
  AND a.created_at >= NOW() - INTERVAL '60 minutes'
ORDER BY a.created_at DESC
LIMIT 5;

-- 2. DEAL ASSOCIADO AO LEAD MAIS RECENTE
SELECT
  d.id,
  d.created_at,
  d.title,
  d.stage,
  d.value,
  d.notes,
  a.name AS account_name
FROM deals d
JOIN accounts a ON a.id = d.account_id
WHERE d.tenant_id = '<TENANT_ID>'
  AND a.source LIKE 'website-%'
  AND d.created_at >= NOW() - INTERVAL '60 minutes'
ORDER BY d.created_at DESC
LIMIT 5;

-- 3. TIMELINE EVENT DO LEAD (event_type='lead_created')
-- Aqui mora a metadata enriquecida: lp_label, unit_label, first_message, etc.
SELECT
  t.id,
  t.created_at,
  t.event_type,
  t.summary,
  jsonb_pretty(t.metadata) AS metadata
FROM account_timeline t
WHERE t.tenant_id = '<TENANT_ID>'
  AND t.event_type = 'lead_created'
  AND t.created_at >= NOW() - INTERVAL '60 minutes'
ORDER BY t.created_at DESC
LIMIT 5;

-- 4. MENSAGEM WHATSAPP LINKADA AO LEAD
SELECT
  m.id,
  m.received_at,
  m.phone,
  LEFT(m.message_text, 200) AS message_preview,
  m.direction,
  m.account_id,
  m.conversation_id,
  m.wa_message_id
FROM whatsapp_messages m
WHERE m.tenant_id = '<TENANT_ID>'
  AND m.direction = 'inbound'
  AND m.received_at >= NOW() - INTERVAL '60 minutes'
ORDER BY m.received_at DESC
LIMIT 5;

-- 5. CHECK DE INTEGRIDADE — nenhuma mensagem deveria estar órfã
SELECT
  COUNT(*) AS orphaned_inbound_messages_last_hour
FROM whatsapp_messages
WHERE tenant_id = '<TENANT_ID>'
  AND direction = 'inbound'
  AND account_id IS NULL
  AND received_at >= NOW() - INTERVAL '60 minutes';
-- Se > 0 e for de smoke test → algo falhou no createLeadFromWebhook.
-- Olha os logs do Vercel: filter por event=whatsapp.lead.create_failed

-- 6. CLEANUP — após validação, remove leads de teste
-- ⚠️ CUIDADO — descomenta SÓ se for limpar testes específicos.
-- Cascata: phone_mappings, deals, account_timeline, whatsapp_messages.

-- DELETE FROM accounts
-- WHERE tenant_id = '<TENANT_ID>'
--   AND name LIKE 'Lead WA — 5512991234567'   -- ajusta pro phone usado no teste
--   AND created_at >= NOW() - INTERVAL '60 minutes';
