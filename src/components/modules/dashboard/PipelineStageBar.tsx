"use client"

import { Skeleton } from "@/components/ui/skeleton"
import type { PipelineStats } from "@/hooks/pipeline/usePipeline"
import { PIPELINE_STAGES, STAGE_CONFIG } from "@/hooks/pipeline/usePipeline"

// ── Stage color map ───────────────────────────────────────────────────────────

const STAGE_BAR_COLOR: Record<string, string> = {
  lead:       "#94a3b8",
  em_contato: "#3b82f6",
  proposta:   "#a855f7",
  sucesso:    "#f59e0b",
  cliente:    "#22c55e",
  recorrente: "#10b981",
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PipelineStageBarProps = {
  stats: PipelineStats | undefined
  isLoading: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PipelineStageBar({ stats, isLoading }: PipelineStageBarProps) {
  if (isLoading || !stats) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const maxCount = Math.max(
    ...PIPELINE_STAGES.map((s) => stats.byStage[s]?.count ?? 0),
    1
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-[13px] font-bold text-[#022448]"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Pipeline por Estágio
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">
          {stats.totalAccounts} clientes
        </span>
      </div>

      {/* Bars */}
      <div className="space-y-3.5" role="list" aria-label="Distribuição de clientes por estágio">
        {PIPELINE_STAGES.map((stage) => {
          const stageData = stats.byStage[stage]
          const count = stageData?.count ?? 0
          const widthPct = Math.round((count / maxCount) * 100)
          const color = STAGE_BAR_COLOR[stage] ?? "#94a3b8"
          const label = STAGE_CONFIG[stage]?.label ?? stage

          return (
            <div
              key={stage}
              className="flex items-center gap-3"
              role="listitem"
            >
              {/* Stage label */}
              <span className="text-[12px] text-slate-500 font-medium w-24 shrink-0 truncate">
                {label}
              </span>

              {/* Bar track */}
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                  }}
                  role="progressbar"
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={maxCount}
                  aria-label={`${label}: ${count} clientes`}
                />
              </div>

              {/* Count */}
              <span className="text-[12px] font-bold text-[#022448] w-6 text-right shrink-0">
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
