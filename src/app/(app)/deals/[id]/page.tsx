"use client"

import { use, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { useTenant } from "@/hooks/useTenant"
import { useDeal } from "@/hooks/deals/useDeal"
import { useDealHistory } from "@/hooks/deals/useDealHistory"
import { DEAL_STAGE_CONFIG, DEAL_STAGES } from "@/hooks/deals/useDeals"
import {
  updateDeal,
  markDealWon,
  markDealLost,
  deleteDeal,
} from "../actions"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle,
  Clock,
  DollarSign,
  History,
  Pencil,
  Save,
  Trash2,
  Trophy,
  X,
  XCircle,
} from "lucide-react"
import type { DealLossReason, DealStage } from "@/types"

const LOSS_REASON_LABELS: Record<DealLossReason, string> = {
  price: "Preço",
  no_response: "Sem retorno",
  out_of_area: "Fora de área",
  competitor: "Concorrente",
  budget: "Orçamento",
  timing: "Timing",
  other: "Outro",
}

const TERMINAL_STAGES: DealStage[] = ["won", "lost"]

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { tenant } = useTenant()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: deal, isPending: isLoading } = useDeal(tenant.id, id)
  const { data: history = [], isPending: historyLoading } = useDealHistory(tenant.id, id)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editValue, setEditValue] = useState("")
  const [editCloseDate, setEditCloseDate] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [, startSave] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Won / lost dialogs
  const [wonDialogOpen, setWonDialogOpen] = useState(false)
  const [lostDialogOpen, setLostDialogOpen] = useState(false)
  const [lossReason, setLossReason] = useState<DealLossReason | "">("")
  const [lossNotes, setLossNotes] = useState("")
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  function startEdit() {
    if (!deal) return
    setEditTitle(deal.title)
    setEditValue(deal.value != null ? String(deal.value) : "")
    setEditCloseDate(deal.expected_close_date ?? "")
    setEditNotes(deal.notes ?? "")
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  function handleSave() {
    if (!editTitle.trim()) return
    setSaveError(null)
    startSave(async () => {
      const result = await updateDeal(id, {
        title: editTitle.trim(),
        value: editValue ? parseFloat(editValue) : null,
        expected_close_date: editCloseDate || null,
        notes: editNotes || null,
      })
      if (result.error) {
        setSaveError(result.error)
        return
      }
      setEditing(false)
      qc.invalidateQueries({ queryKey: ["deals", tenant.id, id] })
      qc.invalidateQueries({ queryKey: ["deals", tenant.id] })
    })
  }

  async function handleMarkWon() {
    setActionPending(true)
    setActionError(null)
    const result = await markDealWon(id)
    setActionPending(false)
    if (result.error) { setActionError(result.error); return }
    setWonDialogOpen(false)
    qc.invalidateQueries({ queryKey: ["deals", tenant.id, id] })
    qc.invalidateQueries({ queryKey: ["deals", tenant.id] })
    qc.invalidateQueries({ queryKey: ["deal-history", tenant.id, id] })
    qc.invalidateQueries({ queryKey: ["dashboard-period", tenant.id] })
  }

  async function handleMarkLost() {
    if (!lossReason) return
    setActionPending(true)
    setActionError(null)
    const result = await markDealLost(id, lossReason as DealLossReason, lossNotes || undefined)
    setActionPending(false)
    if (result.error) { setActionError(result.error); return }
    setLostDialogOpen(false)
    setLossReason("")
    setLossNotes("")
    qc.invalidateQueries({ queryKey: ["deals", tenant.id, id] })
    qc.invalidateQueries({ queryKey: ["deals", tenant.id] })
    qc.invalidateQueries({ queryKey: ["deal-history", tenant.id, id] })
    qc.invalidateQueries({ queryKey: ["dashboard-period", tenant.id] })
  }

  async function handleDelete() {
    const result = await deleteDeal(id)
    if (result.error) { setActionError(result.error); return }
    qc.invalidateQueries({ queryKey: ["deals", tenant.id] })
    router.push("/deals")
  }

  const isTerminal = deal ? TERMINAL_STAGES.includes(deal.stage) : false
  const cfg = deal ? DEAL_STAGE_CONFIG[deal.stage] : null

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={isLoading ? "Oportunidade" : (deal?.title ?? "Oportunidade")}
        description={
          isLoading ? "" : deal?.account_name ? `Conta: ${deal.account_name}` : ""
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/deals"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kanban
            </Link>
            {!isLoading && deal && !isTerminal && !editing && (
              <>
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={() => setWonDialogOpen(true)}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Marcar como ganha
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => setLostDialogOpen(true)}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Marcar como perdida
                </Button>
              </>
            )}
            {!isLoading && deal && !editing && (deal.stage === "new" || deal.stage === "lost") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !deal ? (
        <p className="text-sm text-muted-foreground">Oportunidade não encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Main info + edit form */}
          <div className="lg:col-span-2 space-y-5">

            {/* Stage badge */}
            <div className="flex items-center gap-3">
              {cfg && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border",
                  cfg.color, cfg.headerBg
                )}>
                  <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                  {cfg.label}
                </span>
              )}
              {deal.stage === "won" && deal.won_at && (
                <span className="text-xs text-muted-foreground">
                  Ganha em {formatDate(deal.won_at)}
                </span>
              )}
              {deal.stage === "lost" && deal.lost_at && (
                <span className="text-xs text-muted-foreground">
                  Perdida em {formatDate(deal.lost_at)}
                  {deal.loss_reason && ` · ${LOSS_REASON_LABELS[deal.loss_reason]}`}
                </span>
              )}
            </div>

            {/* Info / Edit panel */}
            <div className="border rounded-lg p-5 space-y-4">
              {editing ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Título <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Valor (R$)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Data prevista de fechamento
                        </label>
                        <Input
                          type="date"
                          value={editCloseDate}
                          onChange={(e) => setEditCloseDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Observações
                      </label>
                      <textarea
                        className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notas sobre esta oportunidade..."
                      />
                    </div>
                  </div>
                  {saveError && (
                    <p className="text-sm text-destructive">{saveError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!editTitle.trim()}>
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Salvar
                    </Button>
                  </div>
                </>
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Conta
                    </dt>
                    <dd>
                      {deal.account_id ? (
                        <Link
                          href={`/accounts/${deal.account_id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {deal.account_name ?? deal.account_id}
                        </Link>
                      ) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> Valor
                    </dt>
                    <dd className="font-semibold text-green-700">
                      {deal.value != null ? formatCurrency(deal.value, "BRL") : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" /> Fechamento previsto
                    </dt>
                    <dd>
                      {deal.expected_close_date ? formatDate(deal.expected_close_date) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Criado em
                    </dt>
                    <dd>{formatDate(deal.created_at)}</dd>
                  </div>
                  {deal.notes && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground mb-1">Observações</dt>
                      <dd className="text-sm text-foreground/80 whitespace-pre-wrap">{deal.notes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>

            {actionError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {actionError}
              </p>
            )}
          </div>

          {/* RIGHT: Stage history timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="w-4 h-4 text-muted-foreground" />
              Histórico de estágios
            </div>
            <Separator />
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum histórico.</p>
            ) : (
              <ol className="relative border-l border-muted-foreground/20 space-y-5 ml-2">
                {history.map((entry) => {
                  const toCfg = DEAL_STAGE_CONFIG[entry.to_stage]
                  return (
                    <li key={entry.id} className="ml-4">
                      <div className={cn(
                        "absolute -left-[5px] w-2.5 h-2.5 rounded-full border-2 border-background",
                        toCfg?.dot ?? "bg-muted"
                      )} />
                      <div className="flex items-center gap-1 text-xs font-medium">
                        {entry.fromLabel && (
                          <>
                            <span className="text-muted-foreground">{entry.fromLabel}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                          </>
                        )}
                        <span>{entry.toLabel}</span>
                      </div>
                      <time className="text-[10px] text-muted-foreground">
                        {new Date(entry.changed_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </time>
                      {entry.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">{entry.notes}</p>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      )}

      {/* Mark as Won */}
      <AlertDialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Marcar como Ganha?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marca a oportunidade como fechada e ganha. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={handleMarkWon}
              disabled={actionPending}
            >
              {actionPending ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Lost */}
      <AlertDialog open={lostDialogOpen} onOpenChange={(open) => {
        setLostDialogOpen(open)
        if (!open) { setLossReason(""); setLossNotes(""); setActionError(null) }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Marcar como Perdida
            </AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo para registrar o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 py-2 space-y-3">
            <Select value={lossReason} onValueChange={(v) => setLossReason(v as DealLossReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Motivo da perda..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(LOSS_REASON_LABELS) as [DealLossReason, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <textarea
              className="w-full min-h-[60px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              placeholder="Observações (opcional)..."
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
            />
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleMarkLost}
              disabled={actionPending || !lossReason}
            >
              {actionPending ? "Salvando..." : "Confirmar perda"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A oportunidade e seu histórico serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
