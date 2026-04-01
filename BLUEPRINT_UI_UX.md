# Blueprint UI/UX — A7 Commercial Hub
> Gerado em 2026-03-31

---

## 1. Design System

### Paleta de Cores

| Token                   | Valor        | Uso                                        |
|-------------------------|--------------|--------------------------------------------|
| `primary`               | slate-900    | Botões primários, texto principal          |
| `primary-foreground`    | white        | Texto sobre primary                        |
| `muted`                 | slate-100    | Backgrounds alternativos                   |
| `muted-foreground`      | slate-500    | Textos secundários, labels                 |
| `border`                | slate-200    | Bordas de cards, separadores               |
| `destructive`           | red-600      | Erros, ações destrutivas                   |
| `background`            | white        | Fundo base                                 |

**Cores de Score (Commercial Intelligence):**

| Score    | Cor de borda / badge     | Significado                        |
|----------|--------------------------|------------------------------------|
| hot      | red-500 (urgente)        | Contato recente, pipeline ativo    |
| warm     | amber-500 (atenção)      | Atenção necessária                 |
| upsell   | emerald-500 (crescimento)| Oportunidade de crescimento        |
| cold     | slate-400 (frio)         | Sem contato há mais de 30 dias     |
| at_risk  | orange-500 (risco)       | Em risco de perda                  |

### Tipografia

- **Font:** System UI stack (Inter quando disponível)
- **Tamanhos:** xs (0.75rem), sm (0.875rem), base (1rem), lg (1.125rem), xl (1.25rem), 2xl+
- **Hierarquia de página:** `text-2xl font-bold` → `text-lg font-semibold` → `text-sm text-muted-foreground`

### Espaçamento

- Grid: gap-4 (1rem) padrão, gap-6 (1.5rem) entre seções maiores
- Padding de card: p-4 a p-6
- Padding de página: padding interno via AppShell (layout pai)

---

## 2. Layout Global

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (w-60, fixed, full height)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Logo A7                                             │   │
│  │  ──────────────────────────────                      │   │
│  │  🏠 Dashboard                                        │   │
│  │  👥 Contas                                           │   │
│  │  📋 Contratos                                        │   │
│  │  🔔 Alertas                                          │   │
│  │  📊 Pipeline                                         │   │
│  │  📄 Documentos                                       │   │
│  │  📢 Campanhas                                        │   │
│  │  🌐 Portal Clientes                                  │   │
│  │  ──────────────────────────────                      │   │
│  │  ⬇ Importar dados                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  CONTEÚDO PRINCIPAL (flex-1, overflow-auto)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PageHeader (título + ações)                         │   │
│  │  ──────────────────────────────                      │   │
│  │  [Conteúdo da página]                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**AppShell:** `flex h-screen overflow-hidden`
**Sidebar:** `w-60 border-r bg-background flex-shrink-0`
**Main:** `flex-1 overflow-y-auto`

---

## 3. Componentes Principais

### 3.1 PageHeader
```
┌─────────────────────────────────────────────────────────────┐
│  Título da Página                    [Ações / Botões]       │
│  Descrição curta em muted-foreground                        │
└─────────────────────────────────────────────────────────────┘
```
- `flex items-center justify-between`
- Título: `text-2xl font-bold`
- Descrição: `text-sm text-muted-foreground`
- Ações: direita — botões, toggles de view

---

### 3.2 Cards de Inteligência (Dashboard)

```
┌──────────────────────────────────┐
│  Ícone  Título do Card           │
│  ─────────────────────────────── │
│  [Conteúdo: lista, tabela, KPI]  │
│                                  │
│  [Rodapé / CTA]                  │
└──────────────────────────────────┘
```

**Grid do dashboard:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Cards existentes:
- KPI tiles (4x): Contas Ativas, Contratos, Alertas, Documentos
- Urgent Actions (col-span-2)
- Opportunities Feed (col-span-full)
- Expiring Contracts
- Expiring Docs
- At-Risk Accounts

---

### 3.3 Account Card (Grid View)

```
┌──────────────────────────────────────────────┐
│ ▌ (borda cor do score)                        │
│   NOME DO CLIENTE           [HOT] [UPSELL]   │
│   ──────────────────────────────────────────  │
│   💰 LTV: R$ 2.480    📊 Potencial: Alto     │
│   📞 Último contato: 3 dias                  │
│   🔥 AÇÃO: Fazer follow-up agora             │
└──────────────────────────────────────────────┘
```

Borda esquerda (`border-l-4`):
- `border-red-500` → urgente (hot + priority urgent)
- `border-amber-500` → atenção (high priority)
- `border-border` → normal

Badge do score: colored pill (red=hot, amber=warm, emerald=upsell, slate=cold, orange=at_risk)

---

### 3.4 Página de Detalhe da Conta

Hierarquia vertical de blocos:

```
┌──────────────────────────────────────────────────────────────┐
│  HERO HEADER (bg = cor do score)                            │
│  [Ícone score] Nome · Contato                               │
│  [Badge pipeline] [Badge status] [Score]                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  AÇÃO AGORA (card destacado, cor = prioridade)              │
│  "Enviar proposta" → [Botão Marcar feito]                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  LTV         │ │  Ticket      │ │  Último      │
│  R$ 2.480    │ │  R$ 320      │ │  Contato     │
│  ticket×freq │ │  2x/semana   │ │  3 dias      │
│  × 12 meses  │ │              │ │  (vermelho)  │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────────────────────────────────────────────────────┐
│  BLOCO COMERCIAL                                            │
│  Pipeline · Status Comercial · Próxima ação                 │
│  [Botão Editar] → abre popup AccountForm (tabs)            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  OPORTUNIDADES (sinais detectados)                          │
│  🔥 Negociação parada → Follow-up                          │
│  💰 Ticket baixo para recorrente → Upsell                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  TIMELINE WHATSAPP                                          │
│  [mensagem recebida] → [mensagem enviada]                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  SUGESTÕES DE MENSAGEM                                      │
│  [Copiar follow-up] [Copiar upsell] [Copiar reativação]    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  CONTRATOS    │   DOCUMENTOS    │   CADASTRO               │
└──────────────────────────────────────────────────────────────┘
```

---

### 3.5 AccountForm (Popup de Edição)

```
┌─────────────────────────────────────────┐
│  Dialog — "Editar conta"               │
│  ┌─────────────────────────────────┐   │
│  │  [Comercial]  [Cadastro]  ← tabs│   │
│  │  ─────────────────────────────  │   │
│  │  Tab Comercial:                 │   │
│  │  Pipeline Stage | Status Coml   │   │
│  │  Ticket (R$)   | Frequência     │   │
│  │  Último contato| Próxima ação   │   │
│  │                                 │   │
│  │  Tab Cadastro:                  │   │
│  │  Nome *                         │   │
│  │  Segmento      | Status         │   │
│  │  Contato       | Email          │   │
│  │  Notas                          │   │
│  └─────────────────────────────────┘   │
│  [Cancelar]              [Salvar]      │
└─────────────────────────────────────────┘
```

---

### 3.6 AccountsSpreadsheet (Planilha)

```
┌─────────────────────────────────────────────────────────────┐
│  [Filtros ▼] [Busca...] [Pipeline ▼] [Status ▼]            │
├─────────────────────────────────────────────────────────────┤
│  Nome ↕  │ Score │ Pipeline │ Comercial │ LTV │ Ticket │ …  │
│──────────┼───────┼──────────┼───────────┼─────┼────────┼──  │
│  Cliente │ 🔴HOT │ Negoc.   │ Em risco  │2.4k │ R$320  │ …  │
│  Cliente │ 🟡WARM│ Recorr.  │ Saudável  │1.2k │ R$100  │ …  │
│  …       │  …   │  …       │  …        │  …  │  …     │ …  │
├─────────────────────────────────────────────────────────────┤
│  ← [1] [2] [3] … →          25/página ▼    Total: 9.847    │
└─────────────────────────────────────────────────────────────┘
```

- Header sticky
- Colunas clicáveis para ordenar (ícone ↑↓)
- Rows clicáveis → navega para `/accounts/[id]`
- Skeleton loading animado durante fetch

---

### 3.7 Pipeline Kanban

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Lead    │ │Em serviço│ │ Proposta │ │Negociando│ │  Fechado │ │Recorrente│
│  (N)     │ │  (N)     │ │  (N)     │ │  (N)     │ │  (N)     │ │  (N)     │
│──────────│ │──────────│ │──────────│ │──────────│ │──────────│ │──────────│
│ [Card]   │ │ [Card]   │ │ [Card]   │ │ [Card]   │ │ [Card]   │ │ [Card]   │
│ [Card]   │ │ [Card]   │ │          │ │ [Card]   │ │          │ │ [Card]   │
│   …      │ │   …      │ │          │ │   …      │ │          │ │   …      │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

Card no kanban: nome + score badge + valor + último contato

---

### 3.8 Opportunities Feed (Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  🔥 OPORTUNIDADES                                          │
│  ─────────────────────────────────────────────────────────  │
│  [UPSELL]   Hospital São Lucas                             │
│             Recorrente com ticket baixo · LTV R$ 2.4k      │
│             [Copiar mensagem]                              │
│                                                             │
│  [FOLLOW-UP] Clínica Vitória                               │
│             Negociação parada há 8 dias · LTV R$ 1.8k     │
│             [Copiar mensagem] ✓ Copiado                    │
│                                                             │
│  [RENOVAÇÃO] Auto Peças Nobre                              │
│             Contrato vence em 12 dias · LTV R$ 960        │
│             [Copiar mensagem]                              │
└─────────────────────────────────────────────────────────────┘
```

Badges por tipo:
- `UPSELL` → emerald
- `FOLLOW-UP` → amber
- `RENOVAÇÃO` → blue
- `REATIVAR` → red

---

## 4. Padrões de Interação

### Loading States
- Cards/tabelas: `Skeleton` animado (pulse) mantém layout exato
- Transições de dados: `placeholderData: (prev) => prev` → sem flicker ao paginar

### Feedback de Ação
- Copy: botão muda para "✓ Copiado" por 2s (estado `copiedId`)
- Formulários: botão desabilitado + "Salvando..." durante `isPending`
- Erros: banner `text-destructive bg-destructive/10` dentro do form

### Navegação
- Sidebar: item ativo destacado com `bg-muted` + `text-primary`
- Rows de tabela: `cursor-pointer hover:bg-muted/50` → `router.push`
- Cards de conta: `hover:shadow-md transition-shadow` → link para detalhe

### Dialogs / Modais
- Criação de conta: `Dialog` centralizado `max-w-lg`
- Edição de conta: `Dialog` com tabs Comercial | Cadastro
- Upload de documentos: `Dialog` com Dropzone
- Confirmações destrutivas: `AlertDialog`

### Vistas Alternativas
- Contas: toggle Cards | Planilha no PageHeader (botões pill agrupados)
- Default atual: Planilha (mais densa, melhor para 9k+ contas)

---

## 5. Responsividade

| Breakpoint | Comportamento                                     |
|------------|---------------------------------------------------|
| Mobile     | Sidebar oculta (não implementado ainda)          |
| md (768px) | Grid 2 colunas no dashboard                      |
| lg (1024px)| Grid 3 colunas no dashboard, sidebar full        |
| xl+        | Layout ideal: planilha com todas as colunas      |

**Foco atual:** desktop-first (uso interno pela equipe comercial).

---

## 6. Portal do Cliente (UX Separada)

Rota `/portal/*` — UX mais simples, identidade visual diferente:
- PortalShell sem sidebar lateral complexa
- Acesso limitado: Contratos, Faturas, Documentos, Suporte
- Login próprio (magic link por email)
- Paleta pode ser customizada por tenant no futuro

---

## 7. Princípios de Design

1. **Decisão à vista** — score, LTV, próxima ação sempre visíveis sem clicar
2. **Densidade seletiva** — planilha para gestão em massa, cards para visão qualitativa
3. **Cor como dado** — cada cor de borda/badge carrega significado comercial real
4. **Zero clique zero** — oportunidades e mensagens prontas no dashboard, sem abrir telas
5. **Feedback imediato** — loading states, copy confirmado, saving state em cada ação

---

## 8. Próximas Evoluções de UI

| Item                                        | Impacto |
|---------------------------------------------|---------|
| Sidebar collapsível (ícone only em telas menores) | Alto |
| Dark mode                                   | Médio   |
| Filtros salvos na planilha                  | Alto    |
| Dashboard configurável (drag-drop cards)    | Médio   |
| Notificações in-app (sino no header)        | Alto    |
| Bulk actions na planilha (selecionar N → campanha) | Alto |
| Gráfico de funil no pipeline                | Médio   |
| Histórico de score ao longo do tempo        | Alto    |
