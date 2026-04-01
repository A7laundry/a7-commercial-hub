"use client"

import { useState, useMemo } from "react"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import {
  computeCommercialScore,
  computeLTV,
  SCORE_CONFIG,
  daysSince,
} from "@/lib/commercial-intelligence"
import { AUDIENCE_PRESETS, applyPreset } from "@/lib/campaign-rules"
import type { Account, PipelineStage, CampaignType } from "@/types"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search, Wand2, SlidersHorizontal, CheckSquare, Square, Users } from "lucide-react"

type Score = "hot" | "warm" | "cold" | "at_risk" | "upsell"

type Filters = {
  search: string
  score: Score | "all"
  pipeline_stage: PipelineStage | "all"
  status: Account["status"] | "all"
  ltv_min: string
  ltv_max: string
}

type Props = {
  tenantId: string
  selected: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onCampaignTypeHint?: (type: CampaignType) => void
}

const PIPELINE_LABELS: Record<PipelineStage, string> = {
  lead:        "Lead",
  in_service:  "Em serviço",
  quote_sent:  "Proposta",
  negotiating: "Negociando",
  closed:      "Fechado",
  recurring:   "Recorrente",
}

type Tab = "smart" | "manual"

export function AccountSelector({ tenantId, selected, onSelectionChange, onCampaignTypeHint }: Props) {
  const { data: allAccounts = [], isLoading } = useAccounts(tenantId)
  const [tab, setTab] = useState<Tab>("smart")
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    search: "",
    score: "all",
    pipeline_stage: "all",
    status: "all",
    ltv_min: "",
    ltv_max: "",
  })

  // Counts for each preset
  const presetCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const preset of AUDIENCE_PRESETS) {
      counts[preset.id] = applyPreset(preset, allAccounts).length
    }
    return counts
  }, [allAccounts])

  function applyPresetSelection(presetId: string) {
    const preset = AUDIENCE_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const matched = applyPreset(preset, allAccounts)
    setActivePresetId(presetId)
    onSelectionChange(new Set(matched.map((a) => a.id)))
    onCampaignTypeHint?.(preset.campaignType)
    setTab("manual") // switch to manual to show the filtered list
    // Apply equivalent manual filters
    setFilters({
      search: "",
      score: "all",
      pipeline_stage: "all",
      status: "all",
      ltv_min: "",
      ltv_max: "",
    })
  }

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
      if (filters.ltv_min !== "") {
        const ltv = computeLTV(a)
        if (ltv === null || ltv < Number(filters.ltv_min)) return false
      }
      if (filters.ltv_max !== "") {
        const ltv = computeLTV(a)
        if (ltv === null || ltv > Number(filters.ltv_max)) return false
      }
      return true
    })
  }, [allAccounts, filters])

  // When preset is active, show all matched accounts regardless of manual filters
  const displayAccounts = activePresetId
    ? (() => {
        const preset = AUDIENCE_PRESETS.find((p) => p.id === activePresetId)
        return preset ? applyPreset(preset, allAccounts) : filtered
      })()
    : filtered

  function toggleOne(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onSelectionChange(next)
  }

  function toggleAll() {
    if (displayAccounts.every((a) => selected.has(a.id))) {
      const next = new Set(selected)
      displayAccounts.forEach((a) => next.delete(a.id))
      onSelectionChange(next)
    } else {
      const next = new Set(selected)
      displayAccounts.forEach((a) => next.add(a.id))
      onSelectionChange(next)
    }
  }

  function clearPreset() {
    setActivePresetId(null)
    onSelectionChange(new Set())
  }

  const allDisplaySelected = displayAccounts.length > 0 && displayAccounts.every((a) => selected.has(a.id))

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-0 mb-3 border rounded-lg overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => setTab("smart")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 transition-colors",
            tab === "smart" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Audiência Inteligente
        </button>
        <button
          type="button"
          onClick={() => { setTab("manual"); setActivePresetId(null) }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 transition-colors",
            tab === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Manual
        </button>
      </div>

      {tab === "smart" ? (
        /* ── Smart Presets ── */
        <div className="flex-1 overflow-y-auto space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Selecione um segmento pré-definido baseado nos dados do CRM.
          </p>
          {AUDIENCE_PRESETS.map((preset) => {
            const count = presetCounts[preset.id] ?? 0
            const isActive = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                disabled={count === 0}
                onClick={() => applyPresetSelection(preset.id)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-lg border transition-all",
                  count === 0 && "opacity-40 cursor-not-allowed",
                  isActive
                    ? "border-primary bg-primary/5"
                    : count > 0
                    ? "hover:bg-muted/50 hover:border-border"
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{preset.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className={cn(
                      "text-sm font-bold",
                      count > 0 ? "text-primary" : "text-muted-foreground"
                    )}>
                      {count}
                    </span>
                    <p className="text-[10px] text-muted-foreground">clientes</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Manual filters ── */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Active preset banner */}
          {activePresetId && (
            <div className="flex items-center justify-between mb-2 px-2 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs">
              <span className="text-primary font-medium">
                {AUDIENCE_PRESETS.find((p) => p.id === activePresetId)?.emoji}{" "}
                Segmento: {AUDIENCE_PRESETS.find((p) => p.id === activePresetId)?.label}
              </span>
              <button type="button" onClick={clearPreset} className="text-muted-foreground hover:text-foreground">
                Limpar ×
              </button>
            </div>
          )}

          <div className="space-y-2 mb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-9 h-8 text-sm"
                value={filters.search}
                onChange={(e) => { setActivePresetId(null); setFilters((f) => ({ ...f, search: e.target.value })) }}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <FilterChip
                value={filters.score}
                options={[
                  { value: "all",     label: "Score: Todos" },
                  { value: "hot",     label: "Quente" },
                  { value: "warm",    label: "Morno" },
                  { value: "cold",    label: "Frio" },
                  { value: "at_risk", label: "Em risco" },
                  { value: "upsell",  label: "Upsell" },
                ]}
                onChange={(v) => { setActivePresetId(null); setFilters((f) => ({ ...f, score: v as Score | "all" })) }}
              />
              <FilterChip
                value={filters.status}
                options={[
                  { value: "all",      label: "Status: Todos" },
                  { value: "active",   label: "Ativo" },
                  { value: "inactive", label: "Inativo" },
                  { value: "prospect", label: "Prospect" },
                ]}
                onChange={(v) => { setActivePresetId(null); setFilters((f) => ({ ...f, status: v as Account["status"] | "all" })) }}
              />
              <FilterChip
                value={filters.pipeline_stage}
                options={[
                  { value: "all", label: "Estágio: Todos" },
                  ...Object.entries(PIPELINE_LABELS).map(([v, label]) => ({ value: v, label })),
                ]}
                onChange={(v) => { setActivePresetId(null); setFilters((f) => ({ ...f, pipeline_stage: v as PipelineStage | "all" })) }}
              />
            </div>

            {/* LTV range */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-medium shrink-0">LTV R$</span>
              <Input
                type="number"
                placeholder="Mín"
                value={filters.ltv_min}
                onChange={(e) => { setActivePresetId(null); setFilters((f) => ({ ...f, ltv_min: e.target.value })) }}
                className="h-7 text-xs w-20"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <Input
                type="number"
                placeholder="Máx"
                value={filters.ltv_max}
                onChange={(e) => { setActivePresetId(null); setFilters((f) => ({ ...f, ltv_max: e.target.value })) }}
                className="h-7 text-xs w-20"
              />
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-2 pb-2 border-b shrink-0">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {allDisplaySelected
                ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                : <Square className="w-3.5 h-3.5" />
              }
              Selecionar {displayAccounts.length} filtrados
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
            ) : displayAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma conta encontrada com esses filtros.
              </p>
            ) : (
              displayAccounts.map((account) => (
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
      )}
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
  const ltv = computeLTV(account)

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
              {days === 0 ? "hoje" : `${days}d`}
            </span>
          )}
          {account.segment && (
            <span className="text-[10px] text-muted-foreground truncate">{account.segment}</span>
          )}
        </div>
      </div>

      {ltv !== null && (
        <span className="text-xs text-green-700 font-medium shrink-0">
          {ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
        </span>
      )}
    </button>
  )
}

function FilterChip({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
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
