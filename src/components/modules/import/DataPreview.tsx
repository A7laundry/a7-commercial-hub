"use client"

import { useState } from "react"
import type { ImportRow } from "@/lib/import/normalizer"
import type { ImportSummaryStats } from "@/lib/import/intelligence-analyzer"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  CheckCircle,
  Users,
  TrendingUp,
  Flame,
  Thermometer,
  Snowflake,
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

type Props = {
  rows: ImportRow[]
  stats: ImportSummaryStats
  skipDuplicates: boolean
  onSkipDuplicatesChange: (v: boolean) => void
}

const SCORE_CONFIG = {
  hot:     { label: "Quente",    icon: Flame,        color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  warm:    { label: "Morno",     icon: Thermometer,  color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  cold:    { label: "Frio",      icon: Snowflake,    color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  at_risk: { label: "Em risco",  icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  upsell:  { label: "Upsell",    icon: ArrowUpRight, color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
}

const SEG_LABELS: Record<string, string> = {
  high_value: "Alto Valor",
  recurring:  "Recorrentes",
  inactive:   "Inativos",
  lead:       "Leads",
  upsell:     "Candidatos Upsell",
}

export function DataPreview({ rows, stats, skipDuplicates, onSkipDuplicatesChange }: Props) {
  const [showTable, setShowTable] = useState(false)
  const displayRows = rows.filter((r) => !skipDuplicates || !r._duplicate).slice(0, 50)

  return (
    <div className="space-y-6">
      {/* Quality banner */}
      {(stats.duplicates > 0 || stats.withIssues > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.duplicates > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <strong>{stats.duplicates}</strong> duplicata{stats.duplicates > 1 ? "s" : ""} detectada{stats.duplicates > 1 ? "s" : ""}
            </div>
          )}
          {stats.withIssues > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <strong>{stats.withIssues}</strong> registro{stats.withIssues > 1 ? "s" : ""} com dados incompletos
            </div>
          )}
          {stats.duplicates > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => onSkipDuplicatesChange(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              Ignorar duplicatas na importação
            </label>
          )}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiBox icon={Users} label="Registros únicos" value={stats.unique} />
        <KpiBox
          icon={CheckCircle}
          label="Valor total estimado"
          value={stats.totalEstimatedValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          isText
        />
        <KpiBox icon={Flame} label="Clientes quentes" value={stats.byScore.hot} />
        <KpiBox icon={AlertCircle} label="Em risco" value={stats.byScore.at_risk} accent="text-red-600" />
      </div>

      {/* Score breakdown */}
      <Section title="Distribuição por Score Comercial">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.entries(SCORE_CONFIG) as [string, typeof SCORE_CONFIG.hot][]).map(([key, cfg]) => {
            const Icon = cfg.icon
            const count = stats.byScore[key as keyof typeof stats.byScore] ?? 0
            return (
              <div key={key} className={cn("rounded-lg border p-3 text-center", cfg.bg)}>
                <Icon className={cn("w-5 h-5 mx-auto mb-1", cfg.color)} />
                <p className={cn("text-lg font-bold", cfg.color)}>{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Segmentation */}
      <Section title="Segmentação">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(stats.bySegment).map(([key, count]) => (
            <div key={key} className="bg-card border rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm">{SEG_LABELS[key]}</span>
              <span className="text-lg font-bold">{count}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Priority list */}
      {stats.priorityList.length > 0 && (
        <Section title="Prioridade de Contato (Top 10)">
          <div className="space-y-2">
            {stats.priorityList.map((row, i) => {
              const scoreCfg = row._score ? SCORE_CONFIG[row._score] : null
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-card border rounded-md">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.name}</p>
                    {row._opportunities[0] && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {row._opportunities[0]}
                      </p>
                    )}
                  </div>
                  {scoreCfg && (
                    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full border shrink-0", scoreCfg.bg, scoreCfg.color)}>
                      {scoreCfg.label}
                    </span>
                  )}
                  {row.estimated_value != null && (
                    <span className="text-xs text-green-700 font-medium shrink-0">
                      {(row.estimated_value / 1000).toFixed(0)}k
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Data table toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showTable ? "Ocultar" : "Ver"} prévia dos dados ({Math.min(displayRows.length, 50)} registros)
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {["Nome", "Email", "Telefone", "Segmento", "Valor", "Frequência", "Score", "Issues"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => {
                  const scoreCfg = row._score ? SCORE_CONFIG[row._score] : null
                  return (
                    <tr key={i} className={cn("border-b last:border-0", row._duplicate && "opacity-50")}>
                      <td className="px-3 py-2 font-medium max-w-[140px] truncate">{row.name}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{row.contact_email ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.phone ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.segment ?? "—"}</td>
                      <td className="px-3 py-2">{row.estimated_value ? `R$ ${row.estimated_value.toFixed(0)}` : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[80px] truncate">{row.frequency ?? "—"}</td>
                      <td className="px-3 py-2">
                        {scoreCfg && (
                          <span className={cn("px-1 py-0.5 rounded text-[10px] font-medium", scoreCfg.color)}>
                            {scoreCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row._duplicate ? (
                          <span className="text-amber-600">Duplicata</span>
                        ) : row._issues.length > 0 ? (
                          <span className="text-muted-foreground">{row._issues[0]}</span>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      {children}
    </div>
  )
}

function KpiBox({
  icon: Icon,
  label,
  value,
  isText,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  isText?: boolean
  accent?: string
}) {
  return (
    <div className="bg-card border rounded-lg p-3">
      <Icon className="w-4 h-4 text-muted-foreground mb-1.5" />
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("font-bold", isText ? "text-sm" : "text-xl", accent)}>{value}</p>
    </div>
  )
}
