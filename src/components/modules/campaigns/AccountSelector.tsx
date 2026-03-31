"use client"

import { useState, useMemo } from "react"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import {
  computeCommercialScore,
  SCORE_CONFIG,
  daysSince,
} from "@/lib/commercial-intelligence"
import type { Account, PipelineStage } from "@/types"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search, Filter, CheckSquare, Square, Users } from "lucide-react"

type Score = "hot" | "warm" | "cold" | "at_risk" | "upsell"

type Filters = {
  search: string
  score: Score | "all"
  pipeline_stage: PipelineStage | "all"
  status: Account["status"] | "all"
}

type Props = {
  tenantId: string
  selected: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

const PIPELINE_LABELS: Record<PipelineStage, string> = {
  lead:        "Lead",
  in_service:  "Em serviço",
  quote_sent:  "Proposta",
  negotiating: "Negociando",
  closed:      "Fechado",
  recurring:   "Recorrente",
}

export function AccountSelector({ tenantId, selected, onSelectionChange }: Props) {
  const { data: allAccounts = [], isLoading } = useAccounts(tenantId)
  const [filters, setFilters] = useState<Filters>({
    search: "",
    score: "all",
    pipeline_stage: "all",
    status: "all",
  })

  const filtered = useMemo(() => {
    return allAccounts.filter((a) => {
      if (filters.status !== "all" && a.status !== filters.status) return false
      if (filters.pipeline_stage !== "all" && a.pipeline_stage !== filters.pipeline_stage) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!a.name.toLowerCase().includes(q) && !(a.contact_name ?? "").toLowerCase().includes(q)) return false
      }
      if (filters.score !== "all") {
        const score = computeCommercialScore(a, [])
        if (score !== filters.score) return false
      }
      return true
    })
  }, [allAccounts, filters])

  function toggleOne(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onSelectionChange(next)
  }

  function toggleAll() {
    if (filtered.every((a) => selected.has(a.id))) {
      const next = new Set(selected)
      filtered.forEach((a) => next.delete(a.id))
      onSelectionChange(next)
    } else {
      const next = new Set(selected)
      filtered.forEach((a) => next.add(a.id))
      onSelectionChange(next)
    }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id))

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-9 h-8 text-sm"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <FilterChip
            label="Score"
            icon={<Filter className="w-3 h-3" />}
            value={filters.score}
            options={[
              { value: "all", label: "Todos" },
              { value: "hot",     label: "Quente" },
              { value: "warm",    label: "Morno" },
              { value: "cold",    label: "Frio" },
              { value: "at_risk", label: "Em risco" },
              { value: "upsell",  label: "Upsell" },
            ]}
            onChange={(v) => setFilters((f) => ({ ...f, score: v as Score | "all" }))}
          />
          <FilterChip
            label="Status"
            value={filters.status}
            options={[
              { value: "all",      label: "Todos" },
              { value: "active",   label: "Ativo" },
              { value: "inactive", label: "Inativo" },
              { value: "prospect", label: "Prospect" },
            ]}
            onChange={(v) => setFilters((f) => ({ ...f, status: v as Account["status"] | "all" }))}
          />
          <FilterChip
            label="Estágio"
            value={filters.pipeline_stage}
            options={[
              { value: "all", label: "Todos" },
              ...Object.entries(PIPELINE_LABELS).map(([v, label]) => ({ value: v, label })),
            ]}
            onChange={(v) => setFilters((f) => ({ ...f, pipeline_stage: v as PipelineStage | "all" }))}
          />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-2 pb-2 border-b">
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {allFilteredSelected
            ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
            : <Square className="w-3.5 h-3.5" />
          }
          Selecionar {filtered.length} filtrados
        </button>
        <span className="text-xs text-muted-foreground">
          <Users className="w-3 h-3 inline mr-1" />
          {selected.size} selecionados
        </span>
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto space-y-1 mt-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="h-12 bg-muted/40 rounded-md animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma conta encontrada com esses filtros.
          </p>
        ) : (
          filtered.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              isSelected={selected.has(account.id)}
              onToggle={() => toggleOne(account.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function AccountRow({
  account,
  isSelected,
  onToggle,
}: {
  account: Account
  isSelected: boolean
  onToggle: () => void
}) {
  const score = computeCommercialScore(account, [])
  const scoreCfg = SCORE_CONFIG[score]
  const days = daysSince(account.last_contact_at)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors border",
        isSelected
          ? "bg-primary/5 border-primary/30"
          : "bg-card border-transparent hover:bg-muted/40 hover:border-border"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
      )}>
        {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{account.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", scoreCfg.bg, scoreCfg.color)}>
            {scoreCfg.label}
          </span>
          {days !== null && (
            <span className={cn(
              "text-[10px] text-muted-foreground",
              days > 30 && "text-red-500"
            )}>
              {days === 0 ? "hoje" : `${days}d sem contato`}
            </span>
          )}
          {account.segment && (
            <span className="text-[10px] text-muted-foreground truncate">{account.segment}</span>
          )}
        </div>
      </div>

      {account.estimated_value != null && (
        <span className="text-xs text-green-700 font-medium shrink-0">
          R${(account.estimated_value / 1000).toFixed(0)}k
        </span>
      )}
    </button>
  )
}

function FilterChip({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  icon?: React.ReactNode
}) {
  const current = options.find((o) => o.value === value)
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs border rounded-md pl-2 pr-6 py-1 bg-card cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        ▾
      </div>
    </div>
  )
}
