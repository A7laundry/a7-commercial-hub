# 🤖 AI Copilot — Setup + Smoke Test

Protótipo de **sugestão de resposta WhatsApp via Claude** — NÃO autônomo.
Gera draft, operador revisa e envia. Zero auto-resposta.

> **Estado atual:** feature flag OFF (default). Código em produção dormente até você ligar.

---

## ⚙️ Env vars (Vercel)

| Var | Obrigatória? | Default | Descrição |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ se ligar | — | API key da Anthropic (console.anthropic.com) |
| `AI_COPILOT_ENABLED` | ✅ pra ligar | `false` | Gate server-side. Set `true` pra habilitar endpoint |
| `NEXT_PUBLIC_AI_COPILOT_ENABLED` | ✅ pra ligar | `false` | Gate client-side. Set `true` pra UI aparecer |
| `AI_COPILOT_MODEL` | ⚪ | `claude-opus-4-7` | Override do modelo. Pra prod com volume: `claude-haiku-4-5` |

**Pra ligar em homologação:**
1. Vercel → Project Settings → Environment Variables
2. Adiciona as 3 vars acima (`AI_COPILOT_ENABLED=true`, `NEXT_PUBLIC_AI_COPILOT_ENABLED=true`, `ANTHROPIC_API_KEY=sk-ant-...`)
3. Redeploy (necessário pra `NEXT_PUBLIC_*` reler)

**Pra desligar:** unset ou `=false` em qualquer uma das duas flags → tanto API quanto UI param.

---

## 💰 Custo estimado

| Modelo | Preço (1k draft típico) | 100 leads/mês × 8 drafts | 500 leads/mês × 8 drafts |
|---|---:|---:|---:|
| `claude-opus-4-7` (default) | ~$0.04 | ~$32/mês | ~$160/mês |
| `claude-haiku-4-5` | ~$0.004 | ~$3/mês | ~$15/mês |

**Recomendação prática:**
- **Validação (primeiros 10-50 leads):** Opus 4.7 — qualidade máxima pra avaliar se o copiloto serve
- **Após validar:** trocar pra Haiku 4.5 via `AI_COPILOT_MODEL=claude-haiku-4-5`, recomparar qualidade. Diferença geralmente é pequena pra esse caso (atendimento conversacional curto).

---

## 🧪 Smoke test

### Pré-requisitos
- Account já existe no Supabase com pelo menos 1 mensagem inbound em `whatsapp_messages`
- (Idealmente) lead criado via fluxo automático do lead capture (commit `1dc83a3`)

### Passo a passo

1. **Loga no sistema** (usuário do tenant que tem o account)
2. **Acessa** `/accounts/[id]` do lead que você quer testar
3. **Procura o card "Copiloto IA · sugestão de resposta"** acima do WhatsAppTimeline
4. **(Opcional)** Digita um hint no campo: ex `"oferecer foto pra orçamento exato"`
5. **Clica "Gerar sugestão"**
6. Espera 2-5s (Opus 4.7) ou 1-2s (Haiku 4.5)
7. **Confere:**
   - Aparece um **[Racional]** curto explicando a abordagem
   - Aparece o **draft** pronto pra enviar
   - **OU** aparece "IA recomendou escalar" com motivo (caso fora do padrão)
8. **Clica "Usar este draft"** → texto copiado pro clipboard
9. Cola no WhatsApp Web/Business pra enviar — ou no input de envio do sistema

### Validação no Supabase

```sql
-- Evento de geração registrado?
SELECT created_at, event_type, summary, metadata
FROM account_timeline
WHERE account_id = '<ACCOUNT_ID>'
  AND event_type = 'ai_draft_generated'
ORDER BY created_at DESC
LIMIT 5;

-- Métricas de uso/custo agregadas (todos os drafts):
SELECT
  COUNT(*) AS total_drafts,
  SUM((metadata->>'tokens_input')::int) AS total_input_tokens,
  SUM((metadata->>'tokens_output')::int) AS total_output_tokens,
  SUM((metadata->>'cache_read_tokens')::int) AS total_cache_read,
  SUM(CASE WHEN (metadata->>'escalate')::boolean THEN 1 ELSE 0 END) AS escalated_count
FROM account_timeline
WHERE tenant_id = '<TENANT_ID>'
  AND event_type = 'ai_draft_generated'
  AND created_at >= NOW() - INTERVAL '30 days';
```

---

## ✅ Critérios pra "passou"

- [ ] UI aparece (não vazia) com card laranja gradient
- [ ] Botão "Gerar sugestão" responde em < 5s
- [ ] [Racional] curto e coerente com contexto
- [ ] Draft em PT-BR informal, sem inflar
- [ ] Draft respeita persona A7 (sem inventar valor exato, etc.)
- [ ] "Usar este draft" copia pro clipboard
- [ ] "Regenerar" gera variação diferente
- [ ] Quando contexto é problemático (desconto 30%, reclamação grave) → IA escala
- [ ] Footer mostra tokens + cache hits (após 2ª chamada, cache_read > 0)
- [ ] Timeline da account mostra evento `ai_draft_generated`

---

## 🎚 Ajustar persona / regras

O system prompt está em `src/lib/ai-copilot.ts` (constante `SYSTEM_PROMPT`).

Editar e fazer commit + deploy. Em ~30s o cache de prompt invalida e o novo prompt entra em uso.

Áreas comuns de ajuste:
- **Preços de referência** (seção SERVIÇOS) — quando A7 mudar tabela
- **Áreas atendidas** (seção ÁREAS) — quando abrir/fechar unidade
- **Regras de escalar** (seção QUANDO PASSAR PRO HUMANO) — quando decidir que IA pode lidar com mais casos

---

## 🔬 Próximos passos (após estabilização)

Não fazer agora. Documenta-do pra futuro:

| Feature | O que faz | Quando faz sentido |
|---|---|---|
| Auto-fill `cidade_lead` / `servico_pedido` | IA preenche campos do Account a partir da conversa | Após validar 50+ drafts manuais |
| Botão "Enviar direto" | Pula clipboard e dispara `/api/whatsapp/send` | Após 200+ drafts com taxa de aceitação > 70% |
| Triagem automática (1º contato) | IA responde a saudação inicial sem operador | Após avaliar Meta policy + 500 leads humanos |
| Sugestão proativa | Sistema sugere draft sem operador pedir, ao detectar mensagem inbound | Volume > 50 leads/dia |
| Avaliação A/B Opus vs Haiku | Roteador que alterna modelo e mede taxa de aceitação | Quando volume ≥ 200/mês justificar análise |

---

## 📂 Implementação

- `src/lib/ai-copilot.ts` — System prompt + função `generateReplyDraft()`
- `src/app/api/ai-copilot/draft/route.ts` — Endpoint server-side
- `src/hooks/ai-copilot/useGenerateDraft.ts` — Mutation hook TanStack
- `src/components/modules/accounts/CopilotDraftBox.tsx` — UI no painel
- Integrado em `src/app/(app)/accounts/[id]/page.tsx` (acima do WhatsAppTimeline)

---

## 🚨 Quando NÃO ligar

- Antes de validar o **lead capture** (Cenário 1 do smoke do webhook) — você não tem leads pra testar
- Antes de ter ANTHROPIC_API_KEY com **billing ativo** (free tier mata em horas)
- Antes de operadores entenderem **que é só sugestão**, não resposta automática

Ligue só quando o fluxo humano está rodando e você quer ver onde IA acelera.
