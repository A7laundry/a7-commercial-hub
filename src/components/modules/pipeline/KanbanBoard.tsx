"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { movePipelineStage } from "@/app/(app)/pipeline/actions"
import { PIPELINE_STAGES, STAGE_CONFIG, type PipelineBoard } from "@/hooks/pipeline/usePipeline"
import {
  computeCommercialScore,
  computeOpportunitySignals,
  SCORE_CONFIG,
  daysSince,
} from "@/lib/commercial-intelligence"
import type { Account, PipelineStage } from "@/types"
import { cn } from "@/lib/utils"
import { DollarSign, Clock, AlertTriangle } from "lucide-react"

type Props = {
  board: PipelineBoard
}

export function KanbanBoard({ board }: Props) {
  const [optimisticBoard, setOptimisticBoard] = useState<PipelineBoard>(board)
  const [dragAccountId, setDragAccountId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)
  const [, startTransition] = useTransition()
  const dragSource = useRef<PipelineStage | null>(null)

  if (board !== optimisticBoard && dragAccountId === null) {
    setOptimisticBoard(board)
  }

  function handleDragStart(account: Account, stage: PipelineStage) {
    setDragAccountId(account.id)
    dragSource.current = stage
  }

  function handleDragOver(e: React.DragEvent, stage: PipelineStage) {
    e.preventDefault()
    setDragOverStage(stage)
  }

  function handleDrop(e: React.DragEvent, targetStage: PipelineStage) {
    e.preventDefault()
    setDragOverStage(null)

    if (!dragAccountId || dragSource.current === targetStage) {
      setDragAccountId(null)
      return
    }

    const sourceStage = dragSource.current!
    const account = optimisticBoard[sourceStage].find((a) => a.id === dragAccountId)
    if (!account) { setDragAccountId(null); return }

    setOptimisticBoard((prev) => {
      const next = { ...prev }
      next[sourceStage] = prev[sourceStage].filter((a) => a.id !== dragAccountId)
      next[targetStage] = [...prev[targetStage], { ...account, pipeline_stage: targetStage }]
      return next
    })
    setDragAccountId(null)

    startTransition(async () => {
      await movePipelineStage(dragAccountId, targetStage)
    })
  }

  function handleDragEnd() {
    setDragAccountId(null)
    setDragOverStage(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 h-full">
      {PIPELINE_STAGES.map((stage) => {
        const cfg = STAGE_CONFIG[stage]
        const accounts = optimisticBoard[stage]
        const isOver = dragOverStage === stage

        return (
          <div
            key={stage}
            className={cn(
              "flex flex-col w-64 shrink-0 rounded-lg border transition-colors",
              cfg.color,
              isOver && "ring-2 ring-primary/40 bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Column header */}
            <div className={cn("px-3 py-2.5 rounded-t-lg border-b", cfg.color, cfg.headerBg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                  <span className="text-sm font-semibold">{cfg.label}</span>
                </div>
                <span className="text-xs text-muted-foreground bg-background/70 px-1.5 py-0.5 rounded-full">
                  {accounts.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isDragging={dragAccountId === account.id}
                  onDragStart={() => handleDragStart(account, stage)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {accounts.length === 0 && (
                <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/50 border border-dashed rounded-md">
                  Vazio
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AccountCard({
  account,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  account: Account
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  // No contracts available on kanban board — score from account fields only
  const score = computeCommercialScore(account, [])
  const scoreCfg = SCORE_CONFIG[score]
  const signals = computeOpportunitySignals(account, [])
  const criticalSignal = signals.find((s) => s.severity === "critical")
  const daysSinceContact = daysSince(account.last_contact_at)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "bg-card border rounded-md p-2.5 cursor-grab active:cursor-grabbing shadow-sm",
        "hover:shadow-md transition-all select-none",
        score === "at_risk" && "border-red-200",
        isDragging && "opacity-40 rotate-1"
      )}
    >
      {/* Name + score */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <Link
          href={`/accounts/${account.id}`}
          className="text-xs font-medium leading-tight hover:text-primary transition-colors line-clamp-2"
          onClick={(e) => e.stopPropagation()}
        >
          {account.name}
        </Link>
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium",
          scoreCfg.bg, scoreCfg.color
        )}>
          {scoreCfg.label}
        </span>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground mb-1.5">
        {daysSinceContact !== null && (
          <span className={cn(
            "flex items-center gap-1",
            daysSinceContact > 30 && "text-red-500",
            daysSinceContact > 14 && daysSinceContact <= 30 && "text-amber-500"
          )} suppressHydrationWarning>
            <Clock className="w-3 h-3" />
            {daysSinceContact === 0 ? "hoje" : `${daysSinceContact}d`}
          </span>
        )}
        {account.estimated_value != null && (
          <span className="flex items-center gap-1 text-green-700 font-medium ml-auto">
            <DollarSign className="w-3 h-3" />
            {account.estimated_value >= 1000
              ? `${(account.estimated_value / 1000).toFixed(0)}k`
              : account.estimated_value.toFixed(0)}
          </span>
        )}
      </div>

      {/* Next action */}
      {account.next_action && (
        <p className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-1 rounded line-clamp-1">
          → {account.next_action}
        </p>
      )}

      {/* Critical opportunity tag */}
      {criticalSignal && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 font-medium">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="line-clamp-1">{criticalSignal.label}</span>
        </div>
      )}
    </div>
  )
}
