"use client"

import { useState, useCallback, useTransition } from "react"
import Link from "next/link"
import { useAccountsTable, DEFAULT_FILTERS, DEFAULT_PARAMS } from "@/hooks/accounts/useAccountsTable"
import type { TableParams, TableFilters, SortField, SortDir, ScoreFilter } from "@/hooks/accounts/useAccountsTable"
import { computeCommercialScore, computeLTV, SCORE_CONFIG, daysSince } from "@/lib/commercial-intelligence"
import type { Account, PipelineStage, CommercialStatus, AccountStatus } from "@/types"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
  Search, SlidersHorizontal, X, Phone,
} from "lucide-react"

const PIPELINE_LABEL: Record<string, string> = {
  lead: "Lead", in_service: "Em serviço", quote_sent: "Proposta",
  negotiating: "Negociando", closed: "Fechado", recurring: "Recorrente",
}

const COMMERCIAL_COLOR: Record<string, string> = {
  active: "text-green-700", at_risk: "text-red-600", lost: "text-gray-400",
}

const COMMERCIAL_LABEL: Record<string, string> = {
  active: "Saudável", at_risk: "Em risco", lost: "Perdido",
}

type Props = { tenantId: string }

export function AccountsSpreadsheet({ tenantId }: Props) {
  const [params, setParams] = useState<TableParams>(DEFAULT_PARAMS)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isPending: isLoading, isFetching } = useAccountsTable(tenantId, params)
  const accounts = data?.accounts ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  // ── helpers ───────────────────────────────────────────────────────────────

  function setFilter<K extends keyof TableFilters>(key: K, value: TableFilters[K]) {
    setParams((p) => ({
      ...p,
      page: 1,
      filters: { ...p.filters, [key]: value },
    }))
  }

  function setSort(field: SortField) {
    setParams((p) => ({
      ...p,
      page: 1,
      sort: {
        field,
        dir: p.sort.field === field && p.sort.dir === "asc" ? "desc" : "asc",
      },
    }))
  }

  function setPage(page: number) {
    setParams((p) => ({ ...p, page }))
  }

  function clearFilters() {
    setParams((p) => ({ ...p, page: 1, filters: DEFAULT_FILTERS }))
  }

  const hasActiveFilters = Object.entries(params.filters).some(
    ([k, v]) => k !== "search" && v !== "all" && v !== "" && v !== false
  )

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, contato, segmento..."
            className="pl-9 h-8 text-sm"
            value={params.filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 h-8 rounded-md border transition-colors",
            showFilters || hasActiveFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 bg-white/30 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
              {Object.entries(params.filters).filter(([k, v]) => k !== "search" && v !== "all" && v !== "" && v !== false).length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter("noPhone", !params.filters.noPhone)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 h-8 rounded-md border transition-colors",
            params.filters.noPhone
              ? "bg-red-600 text-white border-red-600"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
          title="Mostrar apenas clientes sem telefone"
        >
          <Phone className="w-3.5 h-3.5" />
          Sem telefone
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {isFetching && !isLoading ? "Atualizando..." : <span suppressHydrationWarning>{total.toLocaleString("pt-BR")} clientes</span>}
        </span>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 p-3 bg-muted/40 rounded-lg border">
          <FilterSelect
            label="Score"
            value={params.filters.score}
            onChange={(v) => setFilter("score", v as ScoreFilter)}
            options={[
              { value: "all", label: "Todos" },
              { value: "hot", label: "🔥 Quente" },
              { value: "warm", label: "🌤 Morno" },
              { value: "cold", label: "❄️ Frio" },
              { value: "at_risk", label: "⚠️ Em risco" },
              { value: "upsell", label: "📈 Upsell" },
            ]}
          />
          <FilterSelect
            label="Pipeline"
            value={params.filters.pipeline_stage}
            onChange={(v) => setFilter("pipeline_stage", v as PipelineStage | "all")}
            options={[
              { value: "all", label: "Todos" },
              { value: "lead", label: "Lead" },
              { value: "in_service", label: "Em serviço" },
              { value: "quote_sent", label: "Proposta" },
              { value: "negotiating", label: "Negociando" },
              { value: "closed", label: "Fechado" },
              { value: "recurring", label: "Recorrente" },
            ]}
          />
          <FilterSelect
            label="Status comercial"
            value={params.filters.commercial_status}
            onChange={(v) => setFilter("commercial_status", v as CommercialStatus | "all")}
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Saudável" },
              { value: "at_risk", label: "Em risco" },
              { value: "lost", label: "Perdido" },
            ]}
          />
          <FilterSelect
            label="Status"
            value={params.filters.status}
            onChange={(v) => setFilter("status", v as AccountStatus | "all")}
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Ativo" },
              { value: "prospect", label: "Prospect" },
              { value: "inactive", label: "Inativo" },
            ]}
          />
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Valor mín.</label>
            <Input
              type="number"
              placeholder="R$ 0"
              className="h-7 text-xs"
              value={params.filters.valueMin}
              onChange={(e) => setFilter("valueMin", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Valor máx.</label>
            <Input
              type="number"
              placeholder="R$ ∞"
              className="h-7 text-xs"
              value={params.filters.valueMax}
              onChange={(e) => setFilter("valueMax", e.target.value)}
            />
          </div>
          <div className="space-y-1 flex flex-col justify-end">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Telefone</label>
            <button
              type="button"
              onClick={() => setFilter("noPhone", !params.filters.noPhone)}
              className={cn(
                "h-7 text-xs px-2 rounded-md border transition-colors flex items-center gap-1.5",
                params.filters.noPhone
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <Phone className="w-3 h-3" />
              Sem telefone
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto border rounded-lg bg-card">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted/60 border-b sticky top-0 z-10">
              <Th field="name" label="Nome" sort={params.sort} onSort={setSort} className="min-w-[180px]" />
              <Th field={null} label="Telefone" sort={params.sort} onSort={setSort} className="w-36" />
              <Th field={null} label="Score" sort={params.sort} onSort={setSort} className="w-20" />
              <Th field="pipeline_stage" label="Pipeline" sort={params.sort} onSort={setSort} className="w-28" />
              <Th field="commercial_status" label="Comercial" sort={params.sort} onSort={setSort} className="w-24" />
              <Th field={null} label="LTV" sort={params.sort} onSort={setSort} className="w-24 text-right" />
              <Th field="estimated_value" label="Ticket" sort={params.sort} onSort={setSort} className="w-20 text-right" />
              <Th field="frequency" label="Frequência" sort={params.sort} onSort={setSort} className="w-24" />
              <Th field="last_contact_at" label="Último contato" sort={params.sort} onSort={setSort} className="w-28" />
              <Th field="next_action" label="Próxima ação" sort={params.sort} onSort={setSort} className="min-w-[140px]" />
              <Th field="segment" label="Segmento" sort={params.sort} onSort={setSort} className="w-28" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 20 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="px-3 py-1.5">
                      <div className="h-3 bg-muted/60 rounded animate-pulse" style={{ width: `${40 + ((i * 11 + j * 7) % 40)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-muted-foreground">
                  Nenhum cliente encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              accounts.map((account, idx) => (
                <AccountRow key={account.id} account={account} idx={idx} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span suppressHydrationWarning>
          Página {params.page} de {pages} · {total.toLocaleString("pt-BR")} clientes
        </span>
        <div className="flex items-center gap-1">
          <PageBtn onClick={() => setPage(1)} disabled={params.page === 1}>«</PageBtn>
          <PageBtn onClick={() => setPage(params.page - 1)} disabled={params.page === 1}>
            <ChevronLeft className="w-3 h-3" />
          </PageBtn>
          {Array.from({ length: Math.min(7, pages) }, (_, i) => {
            const mid = Math.min(Math.max(params.page, 4), pages - 3)
            const p = pages <= 7 ? i + 1 : i + mid - 3
            if (p < 1 || p > pages) return null
            return (
              <PageBtn key={p} onClick={() => setPage(p)} active={params.page === p}>{p}</PageBtn>
            )
          })}
          <PageBtn onClick={() => setPage(params.page + 1)} disabled={params.page >= pages}>
            <ChevronRight className="w-3 h-3" />
          </PageBtn>
          <PageBtn onClick={() => setPage(pages)} disabled={params.page >= pages}>»</PageBtn>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Linhas:</span>
          {[25, 50, 100].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setParams((p) => ({ ...p, page: 1, pageSize: n }))}
              className={cn(
                "px-2 py-0.5 rounded border",
                params.pageSize === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  // +5512999998888 → (12) 99999-8888  or  +551239998888 → (12) 3999-8888
  const local = digits.startsWith("55") ? digits.slice(2) : digits
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return phone
}

function AccountRow({ account, idx }: { account: Account; idx: number }) {
  const score = computeCommercialScore(account, [])
  const ltv = computeLTV(account)
  const cfg = SCORE_CONFIG[score]
  const days = daysSince(account.last_contact_at)
  const phone = account.phone_mappings?.[0]?.phone ?? null
  const hasPhone = !!phone

  return (
    <tr className={cn(
      "border-b hover:bg-primary/5 transition-colors cursor-pointer group",
      !hasPhone
        ? "bg-red-50 hover:bg-red-100"
        : idx % 2 === 0 ? "bg-background" : "bg-muted/20"
    )}>
      <td className="px-3 py-1.5 font-medium">
        <Link href={`/accounts/${account.id}`} className="hover:text-primary hover:underline block truncate max-w-[200px]">
          {account.name}
        </Link>
      </td>
      <td className="px-3 py-1.5">
        {hasPhone ? (
          <span className="tabular-nums text-muted-foreground">{formatPhone(phone!)}</span>
        ) : (
          <span className="text-red-500 font-medium text-[10px]">— sem tel.</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap", cfg.bg, cfg.color)}>
          {cfg.label}
        </span>
      </td>
      <td className="px-3 py-1.5 text-muted-foreground">
        {PIPELINE_LABEL[account.pipeline_stage] ?? account.pipeline_stage}
      </td>
      <td className={cn("px-3 py-1.5 font-medium", COMMERCIAL_COLOR[account.commercial_status])}>
        {COMMERCIAL_LABEL[account.commercial_status] ?? account.commercial_status}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-green-700" suppressHydrationWarning>
        {ltv != null
          ? ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
          : "—"}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground" suppressHydrationWarning>
        {account.estimated_value != null
          ? account.estimated_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
          : "—"}
      </td>
      <td className="px-3 py-1.5 text-muted-foreground">{account.frequency ?? "—"}</td>
      <td className={cn(
        "px-3 py-1.5 tabular-nums",
        days === null ? "text-muted-foreground" :
        days > 30 ? "text-red-600 font-medium" :
        days > 14 ? "text-amber-600 font-medium" : "text-foreground"
      )}>
        {days === null ? "—" : days === 0 ? "hoje" : `${days}d`}
      </td>
      <td className="px-3 py-1.5 text-muted-foreground max-w-[160px]">
        <span className="block truncate">{account.next_action ?? "—"}</span>
      </td>
      <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[120px]">
        {account.segment ?? "—"}
      </td>
    </tr>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Th({
  field, label, sort, onSort, className,
}: {
  field: SortField | null
  label: string
  sort: TableParams["sort"]
  onSort: (f: SortField) => void
  className?: string
}) {
  const active = field && sort.field === field
  return (
    <th
      className={cn(
        "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap select-none",
        field && "cursor-pointer hover:text-foreground",
        className
      )}
      onClick={() => field && onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {field && (
          active
            ? sort.dir === "asc"
              ? <ChevronUp className="w-3 h-3 text-primary" />
              : <ChevronDown className="w-3 h-3 text-primary" />
            : <ChevronsUpDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary h-7"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function PageBtn({
  children, onClick, disabled, active,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-w-[24px] h-6 px-1.5 rounded border text-xs transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" :
        disabled ? "opacity-30 cursor-not-allowed" :
        "hover:bg-muted"
      )}
    >
      {children}
    </button>
  )
}
