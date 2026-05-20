# 🧪 Lead Capture Smoke Test — Quickstart

Helpers pra validar o fluxo de captura automática de lead via webhook WhatsApp.

---

## 📋 Pré-requisitos

1. **Sistema deployado** no Vercel com último commit (`feat(lead-capture)`)
2. **Tenant identificável** no Supabase. Tenta na seguinte ordem:
   - `whatsapp_tenant_config` tem entry pro `phone_number_id` do Meta Business
   - OU env `WHATSAPP_TENANT_ID` setada no Vercel
3. **Env vars locais** pra rodar o mock:
   ```bash
   export INGEST_URL="https://<sua-app>.vercel.app/api/whatsapp/ingest"
   export WHATSAPP_APP_SECRET="<mesmo da env do Vercel>"
   ```
4. **Dependências CLI:** `jq`, `openssl`, `curl` (Mac: já vem ou `brew install jq`)
5. **(Opcional)** `PHONE_NUMBER_ID_DEFAULT` se quiser testar com ID específico

---

## 🚀 Cenário 1 — Happy Path (validação inicial)

```bash
cd scripts/lead-capture-smoke
chmod +x mock-meta-webhook.sh   # primeira vez

# Dispara webhook simulando lead novo via LP de sofá em SJC
./mock-meta-webhook.sh "5512991234567" \
  "Oi! 🛋️ Quero higienizar meu sofá em SJC. [#sofa-sao-jose-dos-campos-hero]"
```

**Resposta esperada:**
```
← HTTP 200
← Response: {"processed":1,"statuses_updated":0}
✓ Webhook aceito.
```

**Depois, valida no Supabase SQL Editor:**
```sql
-- Cole o conteúdo de inspect-recent-leads.sql
-- Troca <TENANT_ID> pelo UUID do seu tenant
```

**Depois, valida na UI:**
1. Abre `https://<sua-app>.vercel.app/dashboard`
2. Procura o card **"Leads novos · últimas 24h"**
3. Confirma que o lead aparece com:
   - 📞 telefone `5512991234567`
   - 🟢 badge verde "LP identificada"
   - 🏷️ tag "Sofá × SJC"
   - 📍 unidade "SJC — Vila Adyana (Central)" (se phone_number_id mapeado)
   - 💬 snippet "Oi! 🛋️ Quero higienizar meu sofá em SJC..."
4. **Clica no lead** → deve abrir `/accounts/<id>`
5. **Na página da account** confere:
   - `pipeline_stage = lead`
   - Stage timeline tem entrada `lead_created`
   - WhatsApp Timeline mostra a mensagem inbound
   - Deal aparece na seção de Deals com `stage = new`

---

## 📱 Validação UX operacional (mobile)

Pega o celular do operador e abre `/dashboard`:

- [ ] Card "Leads novos" aparece no topo, acima de "Operacional"
- [ ] Conta de leads no badge laranja é visível
- [ ] Cada linha cabe em 1 tela (não scroll horizontal)
- [ ] Toca no lead → abre `/accounts/[id]` (não trava, não pisca)
- [ ] Tempo "5min" / "12min" atualiza em tempo real (30s refetch)

**Se ALGO falhar:** anota qual passo + screenshot → ajustamos antes de avançar.

---

## 🧹 Cleanup após teste

No SQL Editor:
```sql
DELETE FROM accounts
WHERE name LIKE 'Lead WA — 5512991234567'
  AND tenant_id = '<TENANT_ID>';
-- Cascade remove phone_mappings, deals, account_timeline, whatsapp_messages
```

---

## 🔍 Como descobrir os `phone_number_id` reais do Meta Business

Antes de virar tráfego, preencher `PHONE_NUMBER_ID_TO_UNIT` em `src/lib/lead-capture.ts`:

1. Abre **business.facebook.com** com a conta admin A7
2. Menu lateral → **WhatsApp** → **Phone Numbers** (ou "Números de telefone")
3. Cada número tem um **Phone Number ID** (≈ 15 dígitos, copy do detalhe)
4. Mapeia cada um pra unidade A7 correspondente:

```ts
export const PHONE_NUMBER_ID_TO_UNIT: Record<string, UnitInfo> = {
  "1234567890123":  { unit: "vila-adyana",       city: "sao-jose-dos-campos", unit_label: "SJC — Vila Adyana (Central)" },
  "2345678901234":  { unit: "bosque-eucaliptos", city: "sao-jose-dos-campos", unit_label: "SJC — Bosque dos Eucaliptos" },
  // ... 8 unidades restantes
}
```

Commit + push → próximo lead já cai com `unit` correto via phone_number_id (mais robusto que display_phone fallback).

---

## 🔭 Após Cenário 1 passar, próximos:

| # | Cenário | Comando |
|---|---|---|
| 2 | Tag inválida | `./mock-meta-webhook.sh "5512992222222" "Oi! Vi o site. [#tag-fake-xyz]"` |
| 3 | Sem tag | `./mock-meta-webhook.sh "5512993333333" "Oi! Quero coleta de roupa."` |
| 4 | Lead existente (não duplica) | Reenviar Cenário 1 com mesmo phone |
| 5 | phone_number_id desconhecido | `./mock-meta-webhook.sh "5512994444444" "Oi! [#home-hero]" "999999999999999"` |
| 6 | Race condition | Disparar 2 cenário 1 em paralelo com `&` |

Detalhes em `docs/operacao/smoke-test-lead-capture.md`.
