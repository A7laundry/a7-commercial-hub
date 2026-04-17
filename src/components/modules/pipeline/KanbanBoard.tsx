"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { movePipelineStage, updateCommercialData } from "@/app/(app)/pipeline/actions"
import { PIPELINE_STAGES, STAGE_CONFIG, type PipelineBoard, type OperatorByAccount } from "@/hooks/pipeline/usePipeline"
import {
  computeCommercialScore,
  computeOpportunitySignals,
  SCORE_CONFIG,
  daysSince,
} from "@/lib/commercial-intelligence"
import type { Account, PipelineStage, CommercialStatus } from "@/types"
import { cn } from "@/lib/utils"
import { DollarSign, Clock, AlertTriangle, Pencil, ExternalLink, X, Save } from "lucide-react"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  board: PipelineBoard
  tenantId: string
  operatorByAccount?: OperatorByAccount
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────

export function KanbanBoard({ board, tenantId, operatorByAccount }: Props) {
  const qc = useQueryClient()
  const [optimisticBoard, setOptimisticBoard] = useState<PipelineBoard>(board)
  const [dragAccountId, setDragAccountId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
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
      const result = await movePipelineStage(dragAccountId, targetStage)
      if (!result?.error) {
        qc.invalidateQueries({ queryKey: ["pipeline", tenantId] })
        qc.invalidateQueries({ queryKey: ["dashboard", tenantId] })
      }
    })
  }

  function handleDragEnd() {
    setDragAccountId(null)
    setDragOverStage(null)
  }

  function handleSaved(updated: Account) {
    // Optimistic update: move to correct stage column and update fields
    setOptimisticBoard((prev) => {
      const next = { ...prev }
      // Remove from all columns
      for (const stage of PIPELINE_STAGES) {
        next[stage] = prev[stage].filter((a) => a.id !== updated.id)
      }
      // Add to the correct column
      next[updated.pipeline_stage] = [
        updated,
        ...(next[updated.pipeline_stage] ?? []),
      ]
      return next
    })
    setEditingAccount(null)
    qc.invalidateQueries({ queryKey: ["pipeline", tenantId] })
    qc.invalidateQueries({ queryKey: ["dashboard", tenantId] })
  }

  return (
    <>
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
                    onEdit={() => setEditingAccount(account)}
                    operator={operatorByAccount?.get(account.id)}
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

      {/* Edit sheet */}
      {editingAccount && (
        <KanbanEditSheet
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

// ── AccountCard ───────────────────────────────────────────────────────────────

function AccountCard({
  account,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  operator,
}: {
  account: Account
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onEdit: () => void
  operator?: { name: string; avatarUrl: string | null; initials: string }
}) {
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
        "crm-card bg-white border rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-[0_2px_8px_rgba(2,36,72,0.06)] select-none",
        score === "at_risk" ? "border-red-200" : "border-transparent",
        isDragging && "opacity-40 rotate-1"
      )}
    >
      {/* Avatar + Name + edit button */}
      <div className="flex items-start gap-2 mb-2">
        <UserAvatar displayName={account.name} size={28} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <Link
              href={`/accounts/${account.id}`}
              className="text-xs font-semibold leading-tight hover:text-primary transition-colors line-clamp-2 block"
              onClick={(e) => e.stopPropagation()}
            >
              {account.name}
            </Link>
            {account.client_code && (
              <span className="text-[9px] font-mono text-slate-400 shrink-0 leading-tight mt-px">
                {account.client_code}
              </span>
            )}
          </div>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block",
            scoreCfg.bg, scoreCfg.color
          )}>
            {scoreCfg.label}
          </span>
        </div>
        {/* Edit button — always visible */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[#022448]/40 hover:bg-[#022448]/10 hover:text-[#022448] transition-colors"
          title="Editar cliente"
        >
          <Pencil className="w-3 h-3" />
        </button>
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
              ? `${(account.estimated_value / 1000).toFixed(1)}k`
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

      {/* Operator badge */}
      {operator && (
        <div
          className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5"
          title={`Operador: ${operator.name}`}
        >
          {operator.avatarUrl ? (
            <img
              src={operator.avatarUrl}
              alt={operator.name}
              className="w-4 h-4 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="w-4 h-4 rounded-full bg-[#022448]/10 text-[#022448] text-[8px] font-bold flex items-center justify-center shrink-0 leading-none">
              {operator.initials}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground truncate leading-none">
            {operator.name}
          </span>
        </div>
      )}
    </div>
  )
}

// ── KanbanEditSheet ───────────────────────────────────────────────────────────

const PIPELINE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: "lead",       label: "Lead" },
  { value: "em_contato", label: "Em contato" },
  { value: "proposta",   label: "Proposta" },
  { value: "sucesso",    label: "Sucesso" },
  { value: "cliente",    label: "Cliente ativo" },
  { value: "recorrente", label: "Recorrente" },
]

function KanbanEditSheet({
  account,
  onClose,
  onSaved,
}: {
  account: Account
  onClose: () => void
  onSaved: (updated: Account) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [pipelineStage, setPipelineStage] = useState<PipelineStage>(account.pipeline_stage)
  const [commercialStatus, setCommercialStatus] = useState<CommercialStatus>(account.commercial_status)
  const [estimatedValue, setEstimatedValue] = useState(account.estimated_value?.toString() ?? "")
  const [frequency, setFrequency] = useState(account.frequency ?? "")
  const [lastContact, setLastContact] = useState(account.last_contact_at?.slice(0, 10) ?? "")
  const [nextAction, setNextAction] = useState(account.next_action ?? "")
  const [notes, setNotes] = useState(account.notes ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    fd.set("pipeline_stage", pipelineStage)
    fd.set("commercial_status", commercialStatus)
    fd.set("estimated_value", estimatedValue)
    fd.set("frequency", frequency)
    fd.set("last_contact_at", lastContact)
    fd.set("next_action", nextAction)
    fd.set("notes", notes)

    startTransition(async () => {
      const result = await updateCommercialData(account.id, fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      onSaved({
        ...account,
        pipeline_stage: pipelineStage,
        commercial_status: commercialStatus,
        estimated_value: estimatedValue ? Number(estimatedValue) : null,
        frequency: frequency || null,
        last_contact_at: lastContact || null,
        next_action: nextAction || null,
        notes: notes || null,
      })
    })
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-[360px] sm:w-[400px] flex flex-col p-0 gap-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar displayName={account.name} size={36} className="shrink-0" />
            <div className="min-w-0">
              <SheetTitle className="text-sm font-bold text-[#022448] leading-tight truncate">
                {account.name}
              </SheetTitle>
              <p className="text-xs text-muted-foreground truncate">{account.segment ?? "Sem segmento"}</p>
            </div>
          </div>
          <Link
            href={`/accounts/${account.id}`}
            className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#022448] transition-colors ml-2"
            title="Ver perfil completo"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            {/* Pipeline stage */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Estágio</Label>
              <Select value={pipelineStage} onValueChange={(v) => setPipelineStage(v as PipelineStage)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commercial status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status comercial</Label>
              <Select value={commercialStatus} onValueChange={(v) => setCommercialStatus(v as CommercialStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Saudável</SelectItem>
                  <SelectItem value="at_risk">Em risco</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-4">
              {/* Ticket + Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="kes-value" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Ticket R$</Label>
                  <Input
                    id="kes-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="0,00"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kes-freq" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Frequência</Label>
                  <Input
                    id="kes-freq"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="Ex: Mensal"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Last contact + Next action */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="kes-contact" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Último contato</Label>
                  <Input
                    id="kes-contact"
                    type="date"
                    value={lastContact}
                    onChange={(e) => setLastContact(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kes-action" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Próxima ação</Label>
                  <Input
                    id="kes-action"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    placeholder="Ex: Enviar proposta"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="kes-notes" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Observações</Label>
                <Textarea
                  id="kes-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas sobre a negociação..."
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t shrink-0 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isPending}
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#022448] hover:bg-[#022448]/90"
            disabled={isPending}
            onClick={(e) => {
              // Trigger form submit from footer button
              const form = (e.currentTarget.closest(".flex.flex-col") as HTMLElement)
                ?.querySelector("form")
              form?.requestSubmit()
            }}
          >
            <Save className="w-4 h-4 mr-1" />
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
