#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# mock-meta-webhook.sh — simula um webhook Meta WhatsApp pra smoke test
#
# Uso:
#   ./mock-meta-webhook.sh <phone_from> "<message_text>" [phone_number_id] [display_phone]
#
# Exemplo (Cenário 1 — happy path):
#   ./mock-meta-webhook.sh "5512991234567" \
#     "Oi! 🛋️ Quero higienizar meu sofá em SJC. [#sofa-sao-jose-dos-campos-hero]"
#
# Pré-requisitos (env vars):
#   INGEST_URL              — ex: https://app.exemplo.com.br/api/whatsapp/ingest
#   WHATSAPP_APP_SECRET     — pra gerar HMAC válido (mesmo do Vercel env)
#
# Opcionais:
#   PHONE_NUMBER_ID_DEFAULT — phone_number_id da unidade central
#   DISPLAY_PHONE_DEFAULT   — número visível (padrão 5512974128390 = Vila Adyana)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Validação de env ─────────────────────────────────────────────────────────
: "${INGEST_URL:?ERRO: defina INGEST_URL (ex: export INGEST_URL=https://app.exemplo.com.br/api/whatsapp/ingest)}"
: "${WHATSAPP_APP_SECRET:?ERRO: defina WHATSAPP_APP_SECRET (mesmo da env do Vercel)}"

# Dependências
command -v jq >/dev/null      || { echo "ERRO: jq não instalado (brew install jq)"; exit 1; }
command -v openssl >/dev/null || { echo "ERRO: openssl não instalado"; exit 1; }
command -v curl >/dev/null    || { echo "ERRO: curl não instalado"; exit 1; }

# ── Args ─────────────────────────────────────────────────────────────────────
PHONE_FROM="${1:?Uso: $0 <phone_from> \"<message_text>\" [phone_number_id] [display_phone]}"
MESSAGE_TEXT="${2:?Uso: $0 <phone_from> \"<message_text>\" [phone_number_id] [display_phone]}"
PHONE_NUMBER_ID="${3:-${PHONE_NUMBER_ID_DEFAULT:-123456789012345}}"
DISPLAY_PHONE="${4:-${DISPLAY_PHONE_DEFAULT:-5512974128390}}"

WA_MSG_ID="wamid.smoke_$(date +%s)_$RANDOM"
TIMESTAMP=$(date +%s)

# ── Monta payload Meta ───────────────────────────────────────────────────────
PAYLOAD=$(jq -nc \
  --arg from   "$PHONE_FROM" \
  --arg text   "$MESSAGE_TEXT" \
  --arg pnid   "$PHONE_NUMBER_ID" \
  --arg disp   "$DISPLAY_PHONE" \
  --arg waid   "$WA_MSG_ID" \
  --arg ts     "$TIMESTAMP" \
  '{
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        value: {
          metadata: {
            phone_number_id: $pnid,
            display_phone_number: $disp
          },
          messages: [{
            id: $waid,
            from: $from,
            timestamp: $ts,
            text: { body: $text }
          }]
        }
      }]
    }]
  }')

# ── Calcula HMAC SHA-256 ─────────────────────────────────────────────────────
SIGNATURE=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | awk '{print $2}')

# ── Dispara ──────────────────────────────────────────────────────────────────
echo "→ POST $INGEST_URL"
echo "→ phone_from:      $PHONE_FROM"
echo "→ phone_number_id: $PHONE_NUMBER_ID"
echo "→ display_phone:   $DISPLAY_PHONE"
echo "→ wa_message_id:   $WA_MSG_ID"
echo "→ message:         $MESSAGE_TEXT"
echo ""

RESPONSE=$(curl -sS -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$INGEST_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1 | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "← HTTP $HTTP_STATUS"
echo "← Response: $BODY"

if [[ "$HTTP_STATUS" =~ ^2 ]]; then
  echo ""
  echo "✓ Webhook aceito. Próximos passos:"
  echo "  1. Confere account criada em /accounts (pipeline_stage=lead)"
  echo "  2. Confere NewLeadsInbox no /dashboard"
  echo "  3. Rode: psql ou Supabase SQL Editor → inspect-recent-leads.sql"
  exit 0
else
  echo ""
  echo "✗ Webhook rejeitado. Verifica:"
  echo "  - WHATSAPP_APP_SECRET bate com o do Vercel?"
  echo "  - INGEST_URL aceita HMAC ou exige x-api-key?"
  echo "  - Tenant resolvido? (phone_number_id mapeado em whatsapp_tenant_config)"
  exit 1
fi
