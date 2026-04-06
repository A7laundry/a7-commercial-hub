"use client"

import { useState, useRef, useTransition, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { useTenant } from "@/hooks/useTenant"
import { useExecutionQueue, type ExecutionItem } from "@/hooks/dashboard/useExecutionQueue"
import { snoozeAccount, markActionDone } from "./actions"
import { PageHeader } from "@/components/shared/PageHeader"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { daysSince } from "@/lib/commercial-intelligence"
import { MESSAGE_VARIANTS, interpolateTemplate, type MessageTemplateType } from "@/lib/message-templates"
import Link from "next/link"
import {
  Zap, AlertTriangle, ArrowRight, Send, CheckCircle2, X,
  Building2, PhoneCall, MessageSquare, Target, RefreshCw,
  ChevronDown, ChevronUp, BellOff, Check, Phone, TrendingUp,
} from "lucide-react"

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  follow_up:    { label: "Follow-up",   color: "bg-amber-100 text-amber-700" },
  reactivation: { label: "Reativar",    color: "bg-red-100 text-red-700" },
  renewal:      { label: "Renovação",   color: "bg-blue-100 text-blue-700" },
  upsell:       { label: "Upsell",      color: "bg-emerald-100 text-emerald-700" },
  qualify:      { label: "Qualificar",  color: "bg-purple-100 text-purple-700" },
  proposal:     { label: "Proposta",    color: "bg-orange-100 text-orange-700" },
  call:         { label: "Ligar",       color: "bg-red-100 text-red-700" },
}

const URGENCY_CONFIG = {
  urgent: { label: "Urgente",         icon: AlertTriangle, color: "text-red-600",    border: "border-red-200",  bg: "bg-red-50" },
  high:   { label: "Alta Prioridade", icon: Zap,           color: "text-amber-600",  border: "border-amber-200",bg: "bg-amber-50" },
  normal: { label: "Normal",          icon: ArrowRight,    color: "text-blue-600",   border: "border-blue-200", bg: "bg-blue-50" },
}

type ComposerState = {
  itemId: string
  phone: string
  message: string
  variantIdx: number
}

const RULE_BADGE: Partial<Record<string, () => React.ReactNode>> = {
  message_needs_followup: () => (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
      Follow-up pendente
    </span>
  ),
  message_followup_urgent: () => (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
      Follow-up urgente
    </span>
  ),
  negotiation_stalled_14d: () => (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 shrink-0">
      Negociação parada 14d+
    </span>
  ),
  negotiation_stalled_7d: () => (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
      Negociação parada
    </span>
  ),
  ignored_change_approach: () => (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
      <Phone className="w-2.5 h-2.5" />
      {"{n}"} msgs ignoradas — ligue
    </span>
  ),
  silent_client_45d: () => (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
      45d+ sem contato
    </span>
  ),
}

function PatternBadge({ item }: { item: ExecutionItem }) {
  if (item.ruleId === "ignored_change_approach") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
        <Phone className="w-2.5 h-2.5" />
        {item.consecutiveUnanswered} msgs ignoradas — ligue
      </span>
    )
  }
  const render = RULE_BADGE[item.ruleId]
  return render ? <>{render()}</> : null
}

function ExecutionQueue() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const { data: items = [], isPending: isLoading, refetch } = useExecutionQueue(tenant.id)

  const filterAccountId = searchParams.get("account_id")

  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [sending, setSending] = useState(false)
  const [snoozingId, setSnoozingId] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [displayCount, setDisplayCount] = useState(20)
  const [completedToday, setCompletedToday] = useState(0)
  const [, startTransition] = useTransition()

  // Reset counter when switching between filtered and full view
  const prevFilterRef = useRef(filterAccountId)
  if (prevFilterRef.current !== filterAccountId) {
    prevFilterRef.current = filterAccountId
    setCompletedToday(0)
  }

  // When a deep link provides account_id, filter to just that account
  const allVisibleItems = filterAccountId
    ? items.filter((i) => i.accountId === filterAccountId)
    : items

  // Paginated view — show displayCount items, preserving sort order
  const visibleItems = allVisibleItems.slice(0, displayCount)
  const hasMore = allVisibleItems.length > displayCount

  const grouped = {
    urgent: visibleItems.filter((i) => i.urgency === "urgent"),
    high:   visibleItems.filter((i) => i.urgency === "high"),
    normal: visibleItems.filter((i) => i.urgency === "normal"),
  }

  const totalPending = allVisibleItems.length
  const totalToday = totalPending + completedToday
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
  const overdueCount = allVisibleItems.filter((i) => i.daysOverdue >= 7).length
  const waitingCount = allVisibleItems.filter((i) => i.consecutiveUnanswered > 0).length

  function openComposer(item: ExecutionItem) {
    setComposer({
      itemId: item.id,
      phone: item.phone ?? "",
      message: item.messageText,
      variantIdx: 0,
    })
  }

  async function handleSend(item: ExecutionItem) {
    if (!composer || !composer.phone.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: item.accountId,
          phone: composer.phone.trim(),
          message: composer.message.trim(),
          action_type: item.actionType,
        }),
      })
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
        qc.invalidateQueries({ queryKey: ["execution_queue", tenant.id] })
        setComposer(null)
      }
    } finally {
      setSending(false)
    }
  }

  function handleSnooze(item: ExecutionItem) {
    setSnoozingId(item.id)
    if (composer?.itemId === item.id) setComposer(null)
    setCompletedToday((n) => n + 1)
    startTransition(async () => {
      const { error } = await snoozeAccount(item.accountId, 3)
      if (error) setCompletedToday((n) => Math.max(0, n - 1))
      qc.invalidateQueries({ queryKey: ["execution_queue", tenant.id] })
      setSnoozingId(null)
    })
  }

  function handleMarkDone(item: ExecutionItem) {
    setDoneId(item.id)
    if (composer?.itemId === item.id) setComposer(null)
    setCompletedToday((n) => n + 1)
    startTransition(async () => {
      const { error } = await markActionDone(item.accountId)
      if (error) setCompletedToday((n) => Math.max(0, n - 1))
      qc.invalidateQueries({ queryKey: ["execution_queue", tenant.id] })
      setDoneId(null)
    })
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-16 w-full" />
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Minha Fila"
        description={
          totalPending > 0
            ? `${totalPending} ações pendentes · ordenadas por prioridade`
            : "Nenhuma ação pendente"
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
        }
      />

      {filterAccountId && (
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">
            Mostrando ação para {visibleItems[0]?.accountName ?? filterAccountId}
          </span>
          <Link href="/execution" className="text-xs text-blue-600 hover:underline">
            Ver todas →
          </Link>
        </div>
      )}

      {totalToday > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 border rounded-lg">
          <div className="flex-1 min-w-0">
            <Progress value={progressPct} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {completedToday}/{totalToday} hoje
          </span>
        </div>
      )}

      {(overdueCount > 0 || waitingCount > 0) && (
        <div className="flex gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          {overdueCount > 0 && (
            <span className="text-sm text-red-700 font-medium">
              ⚠️ {overdueCount} ação{overdueCount !== 1 ? "ões" : ""} atrasada{overdueCount !== 1 ? "s" : ""}
            </span>
          )}
          {waitingCount > 0 && (
            <span className="text-sm text-amber-700 font-medium">
              💬 {waitingCount} cliente{waitingCount !== 1 ? "s" : ""} aguardando resposta
            </span>
          )}
        </div>
      )}

      {totalPending === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 opacity-30 mb-4" />
          <p className="text-sm font-medium">Fila limpa!</p>
          <p className="text-xs mt-1 opacity-70">Todos os clientes estão sendo atendidos corretamente.</p>
        </div>
      )}

      <div className="space-y-6">
        {(["urgent", "high", "normal"] as const).map((urgency) => {
          const group = grouped[urgency]
          if (group.length === 0) return null
          const cfg = URGENCY_CONFIG[urgency]
          const Icon = cfg.icon
          const isCollapsed = collapsedGroups.has(urgency)

          return (
            <section key={urgency}>
              <button
                type="button"
                onClick={() => toggleGroup(urgency)}
                className="w-full flex items-center justify-between mb-3 group"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                  <span className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</span>
                  <span className="text-xs text-muted-foreground font-normal">({group.length})</span>
                </div>
                {isCollapsed
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground" />
                }
              </button>

              {!isCollapsed && (
                <AnimatePresence initial={false}>
                <motion.div layout className="space-y-2">
                  {group.map((item) => {
                    const actionCfg = ACTION_LABEL[item.actionType] ?? ACTION_LABEL.follow_up
                    const isComposing = composer?.itemId === item.id
                    const isIgnored = item.ruleId === "ignored_change_approach"
                    const lastActionDays = item.lastActionAt ? (daysSince(item.lastActionAt) ?? 0) : null

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60, transition: { duration: 0.18 } }}
                      >
                      <div
                        className={cn(
                          "border rounded-xl overflow-hidden transition-all",
                          isComposing && cn(cfg.border, cfg.bg)
                        )}
                      >
                        {/* Main row */}
                        <div className="flex items-start gap-3 px-4 py-3">
                          {/* Score badge */}
                          <div className="shrink-0 mt-0.5">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                              item.urgency === "urgent" ? "bg-red-100 text-red-700"
                                : item.urgency === "high" ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            )}>
                              {item.priorityScore}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={item.href}
                                className="text-sm font-semibold hover:text-primary transition-colors truncate"
                              >
                                {item.accountName}
                              </Link>
                              {item.contactName && (
                                <span className="text-xs text-muted-foreground shrink-0">— {item.contactName}</span>
                              )}
                              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0", actionCfg.color)}>
                                {actionCfg.label}
                              </span>
                              <PatternBadge item={item} />
                              {item.daysOverdue >= 7 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white shrink-0">
                                  Atrasado {item.daysOverdue}d
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.reason}</p>
                            {/* Escalation explanation — why the strategy changed */}
                            {item.escalationReason && item.escalationLevel >= 1 && (
                              <div className={cn(
                                "flex items-center gap-1 mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded w-fit",
                                item.escalationLevel === 3
                                  ? "bg-red-50 text-red-700"
                                  : item.escalationLevel === 2
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-50 text-slate-600"
                              )}>
                                <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                                {item.escalationReason}
                              </div>
                            )}
                            {/* Last action summary */}
                            {item.lastActionSummary && (
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic line-clamp-1">
                                Última: {item.lastActionSummary}
                                {lastActionDays !== null && ` · ${lastActionDays}d atrás`}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {item.ltv && (
                                <span suppressHydrationWarning className="text-[10px] text-emerald-700 font-medium">
                                  LTV {item.ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                                </span>
                              )}
                              {item.dealTitle && (
                                <Link
                                  href={`/deals/${item.dealId}`}
                                  className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                                >
                                  <Target className="w-2.5 h-2.5" />
                                  {item.dealTitle}
                                </Link>
                              )}
                              {item.phone && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <PhoneCall className="w-2.5 h-2.5" />
                                  {item.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => isComposing ? setComposer(null) : openComposer(item)}
                              className={cn(
                                "flex items-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-md transition-colors",
                                isComposing
                                  ? "bg-muted text-muted-foreground"
                                  : isIgnored
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                              )}
                            >
                              {isIgnored ? <Phone className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                              {isComposing ? "Fechar" : isIgnored ? "Ligar" : "WhatsApp"}
                            </button>
                            <Link
                              href={item.href}
                              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                            >
                              <Building2 className="w-3 h-3" />
                              Ver
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleMarkDone(item)}
                              disabled={doneId === item.id}
                              className="flex items-center gap-0.5 text-[10px] font-medium px-2 py-1.5 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              title="Marcar como feito"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Feito
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSnooze(item)}
                              disabled={snoozingId === item.id}
                              className="text-[10px] font-medium px-2 py-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                              title="Adiar por 3 dias"
                            >
                              <BellOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline WhatsApp Composer */}
                        {isComposing && (() => {
                          const variants = MESSAGE_VARIANTS[item.actionType as MessageTemplateType] ?? null
                          const variantCount = variants?.length ?? 0
                          const currentVariantIdx = composer?.variantIdx ?? 0

                          function cycleVariant(newIdx: number) {
                            if (!variants) return
                            const variant = variants[newIdx]
                            const interpolated = interpolateTemplate(variant.text, {
                              name: item.contactName ?? item.accountName,
                              service: item.accountName,
                            })
                            setComposer((c) => c && { ...c, message: interpolated, variantIdx: newIdx })
                          }

                          return (
                          <div className="border-t px-4 py-3 space-y-3 bg-background">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold flex items-center gap-1.5">
                                <Send className="w-3 h-3" />
                                {isIgnored ? "Registrar contato via ligação" : "Enviar via WhatsApp"}
                              </p>
                              <button type="button" onClick={() => setComposer(null)}>
                                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium block mb-1">
                                  Número
                                </label>
                                <Input
                                  value={composer?.phone ?? ""}
                                  onChange={(e) => setComposer((c) => c && { ...c, phone: e.target.value })}
                                  placeholder="+55 11 99999-0000"
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                {variantCount > 1 && (
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                                      Mensagem
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-muted-foreground">
                                        Variação {currentVariantIdx + 1}/{variantCount}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => cycleVariant((currentVariantIdx - 1 + variantCount) % variantCount)}
                                        className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground hover:bg-muted transition-colors"
                                        title="Variação anterior"
                                      >
                                        ←
                                      </button>
                                      {Array.from({ length: variantCount }, (_, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => cycleVariant(i)}
                                          className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                            currentVariantIdx === i
                                              ? "bg-primary text-primary-foreground border-primary"
                                              : "text-muted-foreground hover:bg-muted"
                                          )}
                                        >
                                          V{i + 1}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => cycleVariant((currentVariantIdx + 1) % variantCount)}
                                        className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground hover:bg-muted transition-colors"
                                        title="Próxima variação"
                                      >
                                        →
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {variantCount <= 1 && (
                                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium block mb-1">
                                    Mensagem
                                  </label>
                                )}
                                <Textarea
                                  value={composer?.message ?? ""}
                                  onChange={(e) => setComposer((c) => c && { ...c, message: e.target.value })}
                                  rows={3}
                                  className="text-xs resize-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setComposer(null)}>
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSend(item)}
                                disabled={sending || !composer?.phone.trim()}
                                className="gap-1.5"
                              >
                                <Send className="w-3 h-3" />
                                {sending ? "Enviando..." : "Enviar"}
                              </Button>
                            </div>
                          </div>
                          )
                        })()}
                      </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
                </AnimatePresence>
              )}
            </section>
          )
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Exibindo {visibleItems.length} de {allVisibleItems.length} ações
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayCount((c) => c + 20)}
            className="gap-1.5"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Carregar mais 20
          </Button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t">
        <p className="text-[11px] text-muted-foreground">
          {allVisibleItems.length > 0 && !hasMore
            ? `${allVisibleItems.length} ação${allVisibleItems.length !== 1 ? "ões" : ""} no total · `
            : ""}
          Itens adiados ficam ocultos por 3 dias e retornam automaticamente à fila.
        </p>
      </div>
    </div>
  )
}

function QueueSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-16 w-full" />
      {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
    </div>
  )
}

export default function ExecutionPage() {
  return (
    <Suspense fallback={<QueueSkeleton />}>
      <ExecutionQueue />
    </Suspense>
  )
}
