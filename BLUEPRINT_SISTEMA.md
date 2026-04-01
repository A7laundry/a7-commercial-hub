# Blueprint do Sistema — A7 Commercial Hub
> Gerado em 2026-03-31 · Stack: Next.js 16 + Supabase + TanStack Query v5

---

## 1. Visão Geral

Sistema SaaS multi-tenant de inteligência comercial para lavanderias B2B.
Objetivo: transformar dados de clientes em ações comerciais claras — upsell, follow-up, renovação, reativação.

---

## 2. Stack Tecnológica

| Camada         | Tecnologia                              |
|----------------|-----------------------------------------|
| Frontend       | Next.js 16.2.1 (App Router, React 19)  |
| Backend/DB     | Supabase (PostgreSQL + RLS + Storage)  |
| Auth           | Supabase Auth (email/senha + magic link)|
| State / Cache  | TanStack React Query v5                 |
| UI             | Tailwind CSS v4 + shadcn/ui             |
| Icons          | lucide-react                            |
| Imports        | papaparse, xlsx                         |
| Deploy         | Vercel (CI/CD via git push)             |
| WhatsApp       | Webhook Meta → /api/whatsapp/ingest     |

---

## 3. Arquitetura Multi-Tenant

```
supabase.auth.users
      │
      └── tenant_users (user_id, tenant_id, role)
                │
                └── tenants (id, name, slug)
                          │
                          ├── accounts
                          ├── contracts
                          ├── documents
                          ├── alerts
                          ├── campaigns / campaign_recipients
                          ├── whatsapp_messages / phone_mappings
                          ├── portal_clients
                          ├── invoices
                          └── automation_triggers
```

- Todo registro tem `tenant_id` → isolamento completo entre clientes
- RLS ativo no Supabase → segurança a nível de banco
- TenantProvider (React Context) distribui tenant + role para toda a UI

---

## 4. Módulos do Sistema

### 4.1 Accounts (Clientes/Contas)
**O núcleo do sistema.**

Campos principais:
- `name`, `segment`, `contact_name`, `contact_email`
- `status`: active | inactive | prospect
- `pipeline_stage`: lead → in_service → quote_sent → negotiating → closed → recurring
- `commercial_status`: active | at_risk | lost
- `estimated_value` (ticket), `frequency` (frequência em texto livre)
- `last_contact_at`, `next_action`

Views disponíveis:
- **Cards** — grid visual com score, LTV, potencial, ação
- **Planilha** — tabela server-side com paginação, ordenação, filtros

### 4.2 Commercial Intelligence (`src/lib/commercial-intelligence.ts`)
**Motor de scoring e recomendações — 100% client-side, sem IA externa.**

| Função                    | O que faz                                                 |
|---------------------------|-----------------------------------------------------------|
| `parseFrequencyPerMonth`  | "semanal" → 4.3, "2x/semana" → 8.6, "mensal" → 1       |
| `computeLTV`              | ticket × freq/mês × 12 meses                              |
| `computeCommercialScore`  | hot / warm / cold / at_risk / upsell                     |
| `computeNextBestAction`   | Label + prioridade (urgent/high/normal)                   |
| `computeOpportunitySignals` | Lista de sinais (stalled, no_contact, expiring, etc.) |
| `getMessageSuggestions`   | Templates WhatsApp por tipo (upsell, follow-up, renovação)|

**Score Logic:**
```
hot       → contato há < 7 dias + pipeline ativo
warm      → contato há 7-14 dias
cold      → contato há > 30 dias OR nunca
at_risk   → commercial_status = "at_risk" OR stalled em negotiating > 14 dias
upsell    → recurring + ticket abaixo da média
```

### 4.3 Dashboard
KPIs + cards de inteligência em tempo real:
- Contas ativas, Contratos vigentes, Alertas abertos, Documentos
- **Urgent Actions** — lista de ações urgentes por score/priority
- **Opportunities Feed** — top 20 oportunidades ranqueadas por criticidade + LTV
- **Expiring Contracts / Docs** — vencimentos próximos
- **At-Risk Accounts**

### 4.4 Pipeline (Kanban)
- 6 colunas: Lead → Em serviço → Proposta enviada → Negociando → Fechado → Recorrente
- Drag & drop → `moveAccountToStage()` server action
- Automation triggers: ao mover para "recurring" → cria trigger de upsell

### 4.5 Contratos
- `status` derivado automaticamente de `starts_at` / `ends_at`:
  - draft, active, expiring (< 30 dias), expired, cancelled
- Alertas gerados automaticamente para expirando/expirado

### 4.6 Documentos
- Upload para Supabase Storage
- Status derivado de `expires_at`:
  - valid, expiring (< 30 dias), expired, no_expiry
- Vinculados a conta e/ou contrato

### 4.7 Alertas
- Tipos: `contract_expiring_soon`, `contract_expired`, `document_missing`
- Severidade: info | warning | critical
- Fluxo: open → acknowledged → resolved

### 4.8 Campanhas (WhatsApp)
- Selecionar contas → compor mensagem → executar
- `CampaignRecipient`: pending → sent | failed | no_phone
- Templates por tipo: reactivation, upsell, follow_up, renewal, custom

### 4.9 Import
- Upload CSV / Excel
- Auto-detect colunas (português + inglês)
- Preview → mapeamento → import em batch
- `ON CONFLICT DO NOTHING` → seguro para reimportar

### 4.10 Portal do Cliente
- Login separado (magic link)
- Cliente vê: contratos, faturas, documentos, suporte
- Acesso gerenciado via `portal_clients`

### 4.11 WhatsApp Integration
- Webhook: `POST /api/whatsapp/ingest`
- `phone_mappings` → liga telefone à conta
- Timeline de mensagens na página da conta
- Campanhas disparam mensagens outbound

---

## 5. Banco de Dados — Tabelas

| Tabela                 | Descrição                                  |
|------------------------|--------------------------------------------|
| `tenants`              | Workspace (empresa)                        |
| `tenant_users`         | Membros + roles por tenant                 |
| `accounts`             | Clientes / contas CRM                      |
| `contracts`            | Contratos vinculados a contas              |
| `documents`            | Documentos com vencimento                  |
| `alerts`               | Notificações internas                      |
| `whatsapp_messages`    | Histórico de mensagens WhatsApp            |
| `phone_mappings`       | Telefone → conta                           |
| `campaigns`            | Campanhas de envio em massa                |
| `campaign_recipients`  | Destinatários por campanha                 |
| `portal_clients`       | Acesso externo de clientes                 |
| `invoices`             | Faturas vinculadas a contas/contratos      |
| `automation_triggers`  | Gatilhos de automação comercial            |

**Limite Supabase:** todas as queries usam `.limit(10000)` para contornar o cap padrão de 1k.

---

## 6. Fluxo de Dados

```
Usuário → UI (React)
           │
           ├── useQuery (TanStack) → Supabase Client → PostgreSQL (RLS)
           │
           └── Server Action (Next.js) → Supabase Server → PostgreSQL
                     │
                     └── revalidatePath / queryClient.invalidateQueries
```

- Leitura: hooks TanStack Query → Supabase client-side
- Escrita: Server Actions → Supabase server-side → invalidação de cache
- Cache: `staleTime` variável por hook (30s dashboard, 60s oportunidades, 5min dados estáticos)

---

## 7. Autenticação

```
Login (email/senha)
  │
  └── Supabase Auth Session (cookies SSR)
        │
        ├── App routes: middleware verifica session → redireciona /login
        └── Portal routes: fluxo separado → portal_clients table
```

---

## 8. Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL          # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Chave pública
SUPABASE_SERVICE_ROLE_KEY         # Chave de admin (server-side)
NEXT_PUBLIC_APP_URL               # URL do app (para redirects do portal)
WHATSAPP_API_KEY                  # Auth do webhook WhatsApp
WHATSAPP_VERIFY_TOKEN             # Verificação Meta webhook
```

---

## 9. Estrutura de Diretórios

```
src/
├── app/
│   ├── (app)/                    # Rotas protegidas (autenticado + tenant)
│   │   ├── dashboard/
│   │   ├── accounts/
│   │   │   └── [id]/
│   │   ├── contracts/
│   │   │   └── [id]/
│   │   ├── pipeline/
│   │   ├── alerts/
│   │   ├── documents/
│   │   ├── campaigns/
│   │   ├── import/
│   │   └── portal-clients/
│   ├── (auth)/                   # Login + onboarding
│   ├── portal/                   # Portal do cliente
│   └── api/
│       └── whatsapp/ingest/
│
├── components/
│   ├── ui/                       # shadcn primitivos
│   ├── shared/                   # PageHeader, StatusBadge, EmptyState
│   ├── layout/                   # AppShell, Sidebar
│   ├── providers/                # TenantProvider, ReactQueryProvider
│   ├── portal/                   # PortalShell
│   └── modules/
│       ├── accounts/
│       ├── contracts/
│       ├── dashboard/
│       ├── alerts/
│       ├── documents/
│       ├── campaigns/
│       ├── import/
│       └── pipeline/
│
├── hooks/
│   ├── accounts/
│   ├── contracts/
│   ├── dashboard/
│   ├── pipeline/
│   ├── alerts/
│   ├── campaigns/
│   ├── documents/
│   └── portal/
│
├── lib/
│   ├── commercial-intelligence.ts
│   ├── utils.ts
│   ├── supabase/client.ts
│   └── supabase/server.ts
│
└── types/index.ts
```

---

## 10. Pendências e Próximos Passos

| Prioridade | Item                                                       |
|------------|------------------------------------------------------------|
| Alta       | WhatsApp send real (integração com Meta API)               |
| Alta       | Automação de alertas (cron job ou Supabase edge functions) |
| Média      | IA generativa para SmartSummary (Claude API)               |
| Média      | Dashboard de campanhas com métricas de abertura            |
| Média      | Relatórios / exportação para Excel                         |
| Baixa      | App mobile (PWA ou React Native)                           |
| Baixa      | Integração ERP / NF-e                                      |
