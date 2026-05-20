# 🧪 Smoke Test — Lead Capture via Webhook WhatsApp

Cenários pra validar manualmente após o deploy. Cada teste simula um webhook Meta
chegando no `/api/whatsapp/ingest` e valida o resultado no Supabase + UI.

> **Pré-requisitos:**
> - Endpoint deployado em `https://app.exemplo.com.br/api/whatsapp/ingest`
> - `WHATSAPP_APP_SECRET` configurado (HMAC) ou `WHATSAPP_API_KEY` (modo interno)
> - Tenant existente no Supabase com `whatsapp_tenant_config` mapeado pro phone_number_id
>   OU `WHATSAPP_TENANT_ID` env var como fallback

---

## 🔐 Autenticação dos testes

Para evitar HMAC complexa em testes manuais, use o **modo interno** com `x-api-key`:

```bash
export INGEST_URL="https://app.exemplo.com.br/api/whatsapp/ingest"
export API_KEY="$WHATSAPP_API_KEY"  # mesmo da env var
```

Modo interno aceita payload simplificado:
```json
{
  "tenant_id": "<uuid>",
  "phone": "5511987654321",
  "message_text": "Oi! Quero higienizar meu sofá. [#sofa-sao-jose-dos-campos-hero]"
}
```

⚠️ **Mas:** o modo interno **não passa pelo handleMetaWebhook** — passa por `handleInternalMessage`, que **não executa o lead capture**.

**Para testar lead capture, use o formato Meta completo** (abaixo).

---

## 📦 Helper — gerar payload Meta

Salva este script como `mock-meta-webhook.sh`:

```bash
#!/usr/bin/env bash
# Uso: ./mock-meta-webhook.sh <phone_from> <message_text> [phone_number_id]

PHONE_FROM="${1:?phone_from required}"
MESSAGE_TEXT="${2:?message_text required}"
PHONE_NUMBER_ID="${3:-123456789012345}"  # mapeado em PHONE_NUMBER_ID_TO_UNIT
WA_MSG_ID="wamid.test_$(date +%s)_$RANDOM"
TIMESTAMP=$(date +%s)

PAYLOAD=$(jq -n \
  --arg from "$PHONE_FROM" \
  --arg text "$MESSAGE_TEXT" \
  --arg pnid "$PHONE_NUMBER_ID" \
  --arg waid "$WA_MSG_ID" \
  --arg ts "$TIMESTAMP" \
  '{
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        value: {
          metadata: { phone_number_id: $pnid, display_phone_number: "5512974128390" },
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

# Calcula HMAC-SHA256 com WHATSAPP_APP_SECRET
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | awk '{print $2}')

curl -X POST "$INGEST_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD" | jq
```

---

## ✅ Cenário 1 — Lead novo + tag válida (HAPPY PATH)

```bash
./mock-meta-webhook.sh "5512991234567" \
  "Oi! 🛋️ Quero higienizar meu sofá em SJC. [#sofa-sao-jose-dos-campos-hero]"
```

**Esperado:**
- Response: `{ "processed": 1, "statuses_updated": 0 }` (status 200)
- Logs: evento `whatsapp.lead.created` com `parsed_tag: 'sofa-sao-jose-dos-campos-hero'`, `lp_label: 'Sofá × SJC'`, `unit: 'vila-adyana'`
- Supabase `accounts`: nova linha com:
  - `pipeline_stage = 'lead'`
  - `status = 'prospect'`
  - `source = 'website-whatsapp'`
  - `tags = ['sofa-sao-jose-dos-campos-hero']`
  - `unit = 'vila-adyana'`
  - `name = 'Lead WA — 5512991234567'`
  - `next_action = 'Qualificar: cidade, serviço, prazo'`
  - `notes` contém "Origem: Sofá × SJC (/lp/sofa-sao-jose-dos-campos)" + primeira msg
- Supabase `deals`: nova linha com `title = 'Lead Sofá × SJC'`, `stage = 'new'`
- Supabase `phone_mappings`: nova linha `phone=5512991234567 → account_id`, `source='auto'`
- Supabase `account_timeline`: evento `lead_created` com metadata completa
- Supabase `whatsapp_messages`: mensagem gravada com `account_id` linkado
- UI Dashboard `/dashboard`: **NewLeadsInbox** mostra o lead em <30s (refetchInterval)

---

## 🟡 Cenário 2 — Lead novo + tag inválida/desconhecida

```bash
./mock-meta-webhook.sh "5512992222222" \
  "Oi! Vi o site. [#tag-inexistente-fake]"
```

**Esperado:**
- Account criada com:
  - `source = 'website-no-tag-match'`
  - `tags = ['tag-inexistente-fake']` (tag raw preservada)
  - `unit = 'vila-adyana'` (se phone_number_id mapeia) ou `null` (se não)
- Deal: `title = 'Lead WA (tag não mapeada: tag-inexistente-fake)'`
- Timeline metadata: `lp_label: null`, `lp_url: null`, `raw_tag: 'tag-inexistente-fake'`
- UI: aparece em NewLeadsInbox com badge **"Tag não mapeada"** (amarelo)

---

## 🟢 Cenário 3 — Lead novo SEM tag

```bash
./mock-meta-webhook.sh "5512993333333" \
  "Oi! Vi vocês no Google, quero coleta de roupa."
```

**Esperado:**
- Account criada com:
  - `source = 'website-no-tag'`
  - `tags = ['website-no-tag']`
- Deal: `title = 'Lead WA (sem tag)'`
- UI: badge **"Sem tag"** (cinza) na NewLeadsInbox

---

## 🔁 Cenário 4 — Lead já EXISTENTE (phone_mapping existe)

Reenvia mensagem do **mesmo telefone do Cenário 1** com tag diferente:

```bash
./mock-meta-webhook.sh "5512991234567" \
  "Outra mensagem do mesmo cliente. [#home-hero]"
```

**Esperado:**
- ⚠️ **Não cria account nova** (phone_mapping já existe da primeira chamada)
- `whatsapp_messages` recebe a mensagem com `account_id` da conta original
- `accounts.last_contact_at` é atualizado
- **Não aparece** novamente em NewLeadsInbox (mesma account, mesma criação)
- Log: evento `whatsapp.ingest.message_stored` (caminho normal, não `lead.created`)

---

## ⚠️ Cenário 5 — phone_number_id desconhecido

```bash
./mock-meta-webhook.sh "5512994444444" \
  "Oi! Quero orçamento. [#home-hero]" \
  "999999999999999"
```

**Esperado:**
- Tenant ainda resolve (via `whatsapp_tenant_config` se houver entry, ou via env fallback)
- Account criada com `unit = null` se `display_phone_number` também não mapear
- Log warning `whatsapp.ingest.tenant_not_found` se tenant também não resolver — nesse caso **mensagem fica órfã** (comportamento atual preservado)

---

## 🏁 Cenário 6 — Race condition (2 webhooks simultâneos do mesmo phone)

Difícil simular manualmente, mas:

```bash
# Dispara 2 em paralelo (mesmo phone novo)
./mock-meta-webhook.sh "5512995555555" "Msg 1. [#home-hero]" &
./mock-meta-webhook.sh "5512995555555" "Msg 2. [#sofa-sjc-hero]" &
wait
```

**Esperado:**
- **Exatamente 1 Account criada** (não 2)
- `phone_mappings` tem 1 linha pra esse phone
- 2 mensagens em `whatsapp_messages` ambas com o mesmo `account_id`
- Log do segundo: `whatsapp.lead.race_recovered` (não `lead.created`)
- A primeira tag ganha (geralmente — depende de qual conseguiu inserir phone_mapping primeiro)

---

## 🧹 Cleanup após testes

```sql
-- No SQL Editor do Supabase, remove os accounts de teste:
DELETE FROM accounts
WHERE name LIKE 'Lead WA — 5512991234567'
   OR name LIKE 'Lead WA — 5512992222222'
   OR name LIKE 'Lead WA — 5512993333333'
   OR name LIKE 'Lead WA — 5512994444444'
   OR name LIKE 'Lead WA — 5512995555555';
-- Cascade remove phone_mappings, deals, account_timeline, whatsapp_messages
```

---

## ✅ Checklist final pra considerar "pronto pra produção"

- [ ] Cenário 1 passou (happy path)
- [ ] Cenário 2 passou (tag inválida, sem quebrar)
- [ ] Cenário 3 passou (sem tag, fallback elegante)
- [ ] Cenário 4 passou (idempotente — não duplica)
- [ ] Cenário 5 passou (phone_number_id desconhecido degrada com graça)
- [ ] Cenário 6 passou (race condition resolvida)
- [ ] **NewLeadsInbox aparece no /dashboard** com pelo menos 1 lead de teste
- [ ] Lead aparece com `lp_label`, `unit_label`, `first_message` enriquecidos
- [ ] Clicar no lead leva pra `/accounts/[id]` (página da conta)
- [ ] Pipeline mostra o lead na coluna "Lead"
- [ ] **PHONE_NUMBER_ID_TO_UNIT preenchido com IDs reais do Meta Business**
  (sem isso `unit` cai pro DISPLAY_PHONE_TO_UNIT fallback — também ok)
- [ ] **Operadores treinados** no playbook (`a7lavanderia.com.br/docs/operacao/whatsapp-playbook.md`)

---

## 📎 Anexos

- Implementação: `src/lib/lead-capture.ts`
- Endpoint: `src/app/api/whatsapp/ingest/route.ts` (função `handleMetaWebhook`)
- Hook: `src/hooks/dashboard/useNewLeads.ts`
- UI: `src/components/modules/dashboard/NewLeadsInbox.tsx`
- Schema: `supabase/migrations/20260401000001_account_enrichment.sql`,
  `20260402000002_deals.sql`, `20260405000001_account_timeline.sql`
