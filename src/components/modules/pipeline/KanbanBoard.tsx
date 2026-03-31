"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { movePipelineStage } from "@/app/(app)/pipeline/actions"
import { PIPELINE_STAGES, STAGE_CONFIG, type PipelineBoard } from "@/hooks/pipeline/usePipeline"
import type { Account, PipelineStage } from "@/types"
import { cn } from "@/lib/utils"
import { Building2, DollarSign } from "lucide-react"

type Props = {
  board: PipelineBoard
}

export function KanbanBoard({ board }: Props) {
  const [optimisticBoard, setOptimisticBoard] = useState<PipelineBoard>(board)
  const [dragAccountId, setDragAccountId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)
  const [, startTransition] = useTransition()
  const dragSource = useRef<PipelineStage | null>(null)

  // Sync prop changes into optimistic state
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

    // Optimistic update
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
  const statusColor = {
    active: "bg-green-100 text-green-700",
    at_risk: "bg-amber-100 text-amber-700",
    lost: "bg-red-100 text-red-700",
  }[account.commercial_status]

  const statusLabel = {
    active: "Ativo",
    at_risk: "Em risco",
    lost: "Perdido",
  }[account.commercial_status]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "bg-card border rounded-md p-2.5 cursor-grab active:cursor-grabbing shadow-sm",
        "hover:shadow-md transition-all select-none",
        isDragging && "opacity-40 rotate-1"
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <Link
          href={`/accounts/${account.id}`}
          className="text-xs font-medium leading-tight hover:text-primary transition-colors line-clamp-2"
          onClick={(e) => e.stopPropagation()}
        >
          {account.name}
        </Link>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium", statusColor)}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {account.segment && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {account.segment}
          </span>
        )}
        {account.estimated_value != null && (
          <span className="flex items-center gap-1 ml-auto text-green-700 font-medium">
            <DollarSign className="w-3 h-3" />
            {(account.estimated_value / 1000).toFixed(0)}k
          </span>
        )}
      </div>

      {account.next_action && (
        <p className="mt-1.5 text-[10px] text-muted-foreground bg-muted/60 px-2 py-1 rounded line-clamp-1">
          → {account.next_action}
        </p>
      )}
    </div>
  )
}
