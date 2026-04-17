"use client"

import { Skeleton } from "@/components/ui/skeleton"
import type { PipelineStats } from "@/hooks/pipeline/usePipeline"
import { PIPELINE_STAGES, STAGE_CONFIG } from "@/hooks/pipeline/usePipeline"

// ── Stage color map ───────────────────────────────────────────────────────────

const STAGE_COLOR: Record<string, string> = {
  lead:       "#94a3b8",
  em_contato: "#3b82f6",
  proposta:   "#a855f7",
  sucesso:    "#f59e0b",
  cliente:    "#22c55e",
  recorrente: "#10b981",
}

// ── Types ─────────────────────────────────────────────────────────────────────

type StagePieDistributionProps = {
  stats: PipelineStats | undefined
  isLoading: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StagePieDistribution({ stats, isLoading }: StagePieDistributionProps) {
  if (isLoading || !stats) {
    return (
      <div>
        <Skeleton className="h-4 w-36 mb-5" />
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-36 h-36 rounded-full" />
          <div className="space-y-2 w-full">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const total = stats.totalAccounts || 1

  // Build conic-gradient segments
  type Segment = {
    stage: string
    label: string
    count: number
    pct: number
    color: string
    startDeg: number
    endDeg: number
  }

  const segments: Segment[] = []
  let cumulative = 0

  for (const stage of PIPELINE_STAGES) {
    const count = stats.byStage[stage]?.count ?? 0
    const pct = (count / total) * 100
    const degrees = (count / total) * 360
    segments.push({
      stage,
      label: STAGE_CONFIG[stage]?.label ?? stage,
      count,
      pct,
      color: STAGE_COLOR[stage] ?? "#94a3b8",
      startDeg: cumulative,
      endDeg: cumulative + degrees,
    })
    cumulative += degrees
  }

  // Build conic-gradient string
  const conicParts = segments
    .filter((s) => s.count > 0)
    .map((s) => `${s.color} ${s.startDeg.toFixed(1)}deg ${s.endDeg.toFixed(1)}deg`)
    .join(", ")

  const conicGradient =
    conicParts.length > 0
      ? `conic-gradient(${conicParts})`
      : "conic-gradient(#e2e8f0 0deg 360deg)"

  return (
    <div>
      {/* Header */}
      <h3
        className="text-[13px] font-bold text-[#022448] mb-5"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        Distribuição
      </h3>

      {/* Donut */}
      <div className="flex flex-col items-center gap-5">
        <div
          className="relative w-36 h-36 rounded-full shrink-0"
          style={{ background: conicGradient }}
          role="img"
          aria-label={`Distribuição do pipeline: ${stats.totalAccounts} clientes no total`}
        >
          {/* Inner hole */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center">
              <span
                className="text-xl font-extrabold text-[#022448] leading-none"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {stats.totalAccounts}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">clientes</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-1.5" role="list" aria-label="Legenda dos estágios">
          {segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.stage}
                className="flex items-center justify-between gap-2"
                role="listitem"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                    aria-hidden="true"
                  />
                  <span className="text-[12px] text-slate-600 truncate">{s.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold text-[#022448]">{s.count}</span>
                  <span className="text-[11px] text-slate-400 w-8 text-right">
                    {Math.round(s.pct)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
