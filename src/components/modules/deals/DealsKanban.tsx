"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Clock, DollarSign, CheckCircle, XCircle, ArrowRight, History } from "lucide-react"
import { DEAL_STAGES, DEAL_STAGE_CONFIG, type DealsBoard } from "@/hooks/deals/useDeals"
import { useDealHistory } from "@/hooks/deals/useDealHistory"
import { updateDealStage, markDealWon, markDealLost } from "@/app/(app)/deals/actions"
import type { Deal, DealStage, DealLossReason } from "@/types"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

// Stages from which cards cannot be dragged out
const TERMINAL_STAGES: DealStage[] = ["won", "lost"]

const LOSS_REASON_LABELS: Record<DealLossReason, string> = {
  price: "Preço",
  no_response: "Sem retorno",
  out_of_area: "Fora de área",
  competitor: "Concorrente",
  budget: "Orçamento",
  timing: "Timing",
  other: "Outro",
}

type Props = {
  board: DealsBoard
  onRefetch: () => void
  tenantId: string
}

export function DealsKanban({ board, onRefetch, tenantId }: Props) {
  const [optimisticBoard, setOptimisticBoard] = useState<DealsBoard>(board)
  const [dragDealId, setDragDealId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null)
  const dragSource = useRef<DealStage | null>(null)
  const [, startTransition] = useTransition()

  // Lost sheet state
  const [lostSheetOpen, setLostSheetOpen] = useState(false)
  const [pendingLostDealId, setPendingLostDealId] = useState<string | null>(null)
  const [pendingLostFromStage, setPendingLostFromStage] = useState<DealStage | null>(null)
  const [lossReason, setLossReason] = useState<DealLossReason | "">("")
  const [lossNotes, setLossNotes] = useState("")
  const [lostPending, setLostPending] = useState(false)
  const [lostError, setLostError] = useState<string | null>(null)

  // History sheet state
  const [historyDealId, setHistoryDealId] = useState<string | null>(null)
  const [historyDeal, setHistoryDeal] = useState<Deal | null>(null)
  const { data: historyEntries = [], isPending: historyLoading } = useDealHistory(tenantId, historyDealId)

  // Won confirm state
  const [wonConfirmOpen, setWonConfirmOpen] = useState(false)
  const [pendingWonDealId, setPendingWonDealId] = useState<string | null>(null)
  const [pendingWonFromStage, setPendingWonFromStage] = useState<DealStage | null>(null)
  const [wonPending, setWonPending] = useState(false)

  // Sync board from parent when not dragging
  if (board !== optimisticBoard && dragDealId === null) {
    setOptimisticBoard(board)
  }

  function handleDragStart(deal: Deal, stage: DealStage) {
    if (TERMINAL_STAGES.includes(stage)) return
    setDragDealId(deal.id)
    dragSource.current = stage
  }

  function handleDragOver(e: React.DragEvent, stage: DealStage) {
    // Cannot drag INTO terminal stages via regular drag (only via explicit drop to won/lost)
    e.preventDefault()
    setDragOverStage(stage)
  }

  function handleDrop(e: React.DragEvent, targetStage: DealStage) {
    e.preventDefault()
    setDragOverStage(null)

    if (!dragDealId || dragSource.current === targetStage) {
      setDragDealId(null)
      return
    }

    const sourceStage = dragSource.current!
    const deal = optimisticBoard[sourceStage]?.find((d) => d.id === dragDealId)
    if (!deal) { setDragDealId(null); return }

    setDragDealId(null)

    if (targetStage === "won") {
      // Show confirm dialog before marking won
      setPendingWonDealId(deal.id)
      setPendingWonFromStage(sourceStage)
      setWonConfirmOpen(true)
      return
    }

    if (targetStage === "lost") {
      // Show loss reason sheet
      setPendingLostDealId(deal.id)
      setPendingLostFromStage(sourceStage)
      setLossReason("")
      setLossNotes("")
      setLostError(null)
      setLostSheetOpen(true)
      return
    }

    // Optimistic update for non-terminal stages
    setOptimisticBoard((prev) => {
      const next = { ...prev }
      next[sourceStage] = prev[sourceStage].filter((d) => d.id !== deal.id)
      next[targetStage] = [...prev[targetStage], { ...deal, stage: targetStage }]
      return next
    })

    startTransition(async () => {
      const result = await updateDealStage(deal.id, targetStage)
      if (result.error) {
        // Rollback
        setOptimisticBoard(board)
      } else {
        onRefetch()
      }
    })
  }

  function handleDragEnd() {
    setDragDealId(null)
    setDragOverStage(null)
  }

  async function confirmWon() {
    if (!pendingWonDealId || !pendingWonFromStage) return
    setWonPending(true)

    // Optimistic move
    const dealId = pendingWonDealId
    const fromStage = pendingWonFromStage
    const deal = optimisticBoard[fromStage]?.find((d) => d.id === dealId)
    if (deal) {
      setOptimisticBoard((prev) => {
        const next = { ...prev }
        next[fromStage] = prev[fromStage].filter((d) => d.id !== dealId)
        next.won = [...prev.won, { ...deal, stage: "won" }]
        return next
      })
    }

    setWonConfirmOpen(false)
    const result = await markDealWon(dealId)
    setWonPending(false)
    setPendingWonDealId(null)
    setPendingWonFromStage(null)

    if (result.error) {
      setOptimisticBoard(board)
    } else {
      onRefetch()
    }
  }

  async function confirmLost() {
    if (!pendingLostDealId || !lossReason) return
    setLostPending(true)
    setLostError(null)

    const dealId = pendingLostDealId
    const fromStage = pendingLostFromStage!
    const deal = optimisticBoard[fromStage]?.find((d) => d.id === dealId)
    if (deal) {
      setOptimisticBoard((prev) => {
        const next = { ...prev }
        next[fromStage] = prev[fromStage].filter((d) => d.id !== dealId)
        next.lost = [...prev.lost, { ...deal, stage: "lost" }]
        return next
      })
    }

    const result = await markDealLost(dealId, lossReason as DealLossReason, lossNotes || undefined)
    setLostPending(false)

    if (result.error) {
      setLostError(result.error)
      setOptimisticBoard(board)
    } else {
      setLostSheetOpen(false)
      setPendingLostDealId(null)
      setPendingLostFromStage(null)
      setLossReason("")
      setLossNotes("")
      onRefetch()
    }
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 h-full">
        {DEAL_STAGES.map((stage) => {
          const cfg = DEAL_STAGE_CONFIG[stage]
          const deals = optimisticBoard[stage] ?? []
          const isOver = dragOverStage === stage
          const isTerminal = TERMINAL_STAGES.includes(stage)
          const stageValue = deals.reduce((s, d) => s + (d.value ?? 0), 0)

          return (
            <div
              key={stage}
              className={cn(
                "flex flex-col w-64 shrink-0 rounded-lg border transition-colors",
                cfg.color,
                isOver && !isTerminal && "ring-2 ring-primary/40 bg-primary/5",
                isOver && isTerminal && stage === "won" && "ring-2 ring-green-400/60 bg-green-50/60",
                isOver && isTerminal && stage === "lost" && "ring-2 ring-red-400/60 bg-red-50/60"
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
                    {deals.length}
                  </span>
                </div>
                {stageValue > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 pl-4">
                    {formatCurrency(stageValue, "BRL")}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto">
                {deals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    isDragging={dragDealId === deal.id}
                    isTerminal={isTerminal}
                    onDragStart={() => handleDragStart(deal, stage)}
                    onDragEnd={handleDragEnd}
                    onHistoryClick={() => {
                      setHistoryDeal(deal)
                      setHistoryDealId(deal.id)
                    }}
                  />
                ))}
                {deals.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/50 border border-dashed rounded-md">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Won confirmation dialog (inline) */}
      {wonConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-popover rounded-xl border shadow-lg p-5 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-sm">Marcar como Ganha?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Confirma que esta oportunidade foi ganha? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setWonConfirmOpen(false)
                  setPendingWonDealId(null)
                  setPendingWonFromStage(null)
                }}
                disabled={wonPending}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={confirmWon}
                disabled={wonPending}
              >
                {wonPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deal history sheet */}
      <Sheet open={Boolean(historyDealId)} onOpenChange={(open) => {
        if (!open) { setHistoryDealId(null); setHistoryDeal(null) }
      }}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm">
              <History className="w-4 h-4 text-muted-foreground" />
              Histórico de estágios
            </SheetTitle>
            {historyDeal && (
              <SheetDescription className="text-xs truncate">
                {historyDeal.title}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="px-4 py-3 flex-1 overflow-y-auto">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : historyEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
            ) : (
              <ol className="relative border-l border-muted-foreground/20 space-y-5 ml-2">
                {historyEntries.map((entry) => {
                  const toCfg = DEAL_STAGE_CONFIG[entry.to_stage]
                  return (
                    <li key={entry.id} className="ml-4">
                      <div className={cn("absolute -left-[5px] w-2.5 h-2.5 rounded-full border-2 border-background", toCfg?.dot ?? "bg-muted")} />
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {entry.fromLabel && (
                          <>
                            <span className="text-muted-foreground">{entry.fromLabel}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                          </>
                        )}
                        <span>{entry.toLabel}</span>
                      </div>
                      <time className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                        {new Date(entry.changed_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </time>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.notes}</p>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {historyDeal && (
            <SheetFooter>
              <Link
                href={`/accounts/${historyDeal.account_id}`}
                className="text-xs text-primary hover:underline"
                onClick={() => { setHistoryDealId(null); setHistoryDeal(null) }}
              >
                Ver conta →
              </Link>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Lost reason sheet */}
      <Sheet open={lostSheetOpen} onOpenChange={(open) => {
        if (!open) {
          setLostSheetOpen(false)
          setPendingLostDealId(null)
          setPendingLostFromStage(null)
          setLossReason("")
          setLossNotes("")
          setLostError(null)
        }
      }}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Marcar como Perdida
            </SheetTitle>
            <SheetDescription>
              Informe o motivo da perda para registrar o histórico.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-4 py-2 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Motivo da perda <span className="text-destructive">*</span>
              </label>
              <Select
                value={lossReason}
                onValueChange={(v) => setLossReason(v as DealLossReason)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(LOSS_REASON_LABELS) as [DealLossReason, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Observações (opcional)
              </label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
                placeholder="Detalhes sobre a perda..."
                value={lossNotes}
                onChange={(e) => setLossNotes(e.target.value)}
              />
            </div>

            {lostError && (
              <p className="text-sm text-destructive">{lostError}</p>
            )}
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLostSheetOpen(false)}
              disabled={lostPending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={confirmLost}
              disabled={lostPending || !lossReason}
            >
              {lostPending ? "Salvando..." : "Confirmar perda"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

function DealCard({
  deal,
  isDragging,
  isTerminal,
  onDragStart,
  onDragEnd,
  onHistoryClick,
}: {
  deal: Deal
  isDragging: boolean
  isTerminal: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onHistoryClick: () => void
}) {
  const now = new Date()
  const updatedAt = new Date(deal.updated_at)
  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
  const isStale = daysSinceUpdate > 14 && !isTerminal

  return (
    <div
      draggable={!isTerminal}
      onDragStart={isTerminal ? undefined : onDragStart}
      onDragEnd={isTerminal ? undefined : onDragEnd}
      className={cn(
        "crm-card bg-white border rounded-xl p-3 shadow-[0_2px_8px_rgba(2,36,72,0.06)] select-none",
        !isTerminal && "cursor-grab active:cursor-grabbing",
        isTerminal && "cursor-default opacity-75",
        isDragging && "opacity-40 rotate-1"
      )}
    >
      {/* Title + stale alert */}
      <div className="flex items-start gap-1 mb-1">
        <Link
          href={`/deals/${deal.id}`}
          className="flex-1 text-xs font-medium leading-tight hover:text-primary transition-colors line-clamp-2"
          onClick={(e) => e.stopPropagation()}
        >
          {deal.title}
        </Link>
        {isStale && (
          <Clock className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Account name */}
      {deal.account_name && (
        <p className="text-[10px] text-muted-foreground mb-1.5 line-clamp-1">
          {deal.account_name}
        </p>
      )}

      {/* Value + days + history */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
        {deal.value != null && (
          <span className="flex items-center gap-1 text-green-700 font-medium">
            <DollarSign className="w-3 h-3" />
            {deal.value >= 1000
              ? `${(deal.value / 1000).toFixed(0)}k`
              : formatCurrency(deal.value, "BRL")}
          </span>
        )}
        <span className={cn(
          "ml-auto",
          isStale && "text-amber-500 font-medium"
        )} suppressHydrationWarning>
          {daysSinceUpdate === 0 ? "hoje" : `${daysSinceUpdate}d`}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onHistoryClick() }}
          className="p-0.5 rounded hover:bg-muted/70 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          title="Ver histórico"
        >
          <History className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
