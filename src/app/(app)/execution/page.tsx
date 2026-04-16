"use client"

import { useState, useRef, useTransition, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { useTenant } from "@/hooks/useTenant"
import { useExecutionQueue, type ExecutionItem } from "@/hooks/dashboard/useExecutionQueue"
import { snoozeAccount, markActionDone } from "./actions"
import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { daysSince } from "@/lib/commercial-intelligence"
import { MESSAGE_VARIANTS, interpolateTemplate, type MessageTemplateType } from "@/lib/message-templates"
import Link from "next/link"
import {
  Zap, AlertTriangle, ArrowRight, CheckCircle2, X,
  Building2, PhoneCall, Target, RefreshCw,
  ChevronDown, ChevronUp, BellOff, Check, Phone, TrendingUp, Send,
} from "lucide-react"

// ─── configs ────────────────────────────────────────────────────────────────

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
  urgent: {
    label:       "Urgente",
    icon:        AlertTriangle,
    color:       "text-red-600",
    border:      "border-red-200",
    bg:          "bg-red-50",
    cardBorder:  "border-l-4 border-[#EF4444]",
    cardBg:      "bg-gradient-to-br from-[#FFFBFB] to-white",
    cardShadow:  "shadow-xl shadow-red-500/5",
    avatarBg:    "bg-red-100 text-[#DC2626]",
    avatarSize:  "w-12 h-12 text-lg",
    pillBg:      "bg-red-500 text-white",
    scoreRing:   "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
  high: {
    label:       "Alta Prioridade",
    icon:        Zap,
    color:       "text-amber-600",
    border:      "border-amber-200",
    bg:          "bg-amber-50",
    cardBorder:  "border-l-4 border-amber-400",
    cardBg:      "bg-[#FFFBEB]",
    cardShadow:  "shadow-sm",
    avatarBg:    "bg-amber-200 text-amber-700",
    avatarSize:  "w-10 h-10 text-sm",
    pillBg:      "bg-amber-500 text-white",
    scoreRing:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  normal: {
    label:       "Normal",
    icon:        ArrowRight,
    color:       "text-blue-600",
    border:      "border-blue-200",
    bg:          "bg-blue-50",
    cardBorder:  "border-l-4 border-blue-400",
    cardBg:      "bg-[#EFF6FF]",
    cardShadow:  "shadow-sm",
    avatarBg:    "bg-blue-200 text-blue-700",
    avatarSize:  "w-10 h-10 text-sm",
    pillBg:      "bg-blue-500 text-white",
    scoreRing:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  },
}

type ComposerState = {
  itemId: string
  phone: string
  message: string
  variantIdx: number
}

// ─── rule badges ─────────────────────────────────────────────────────────────

function PatternBadge({ item }: { item: ExecutionItem }) {
  if (item.ruleId === "ignored_change_approach") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
        <Phone className="w-2.5 h-2.5" />
        {item.consecutiveUnanswered} msgs ignoradas — ligue
      </span>
    )
  }
  const MAP: Partial<Record<string, { label: string; cls: string }>> = {
    message_needs_followup:  { label: "Follow-up pendente",   cls: "bg-amber-100 text-amber-700" },
    message_followup_urgent: { label: "Follow-up urgente",    cls: "bg-red-100 text-red-700" },
    negotiation_stalled_14d: { label: "Negociação parada 14d+", cls: "bg-orange-100 text-orange-700" },
    negotiation_stalled_7d:  { label: "Negociação parada",    cls: "bg-amber-100 text-amber-700" },
    silent_client_45d:       { label: "45d+ sem contato",     cls: "bg-slate-100 text-slate-600" },
  }
  const cfg = MAP[item.ruleId]
  if (!cfg) return null
  return (
    <span className={cn("inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0", cfg.cls)}>
      {cfg.label}
    </span>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase()
}

// WhatsApp SVG icon (from Stitch design)
function WppIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("fill-current", className)} viewBox="0 0 24 24">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.432 2.56 1.234 3.559l-.801 2.923 2.991-.784c.965.528 2.056.805 3.167.806h.002c3.18 0 5.766-2.586 5.767-5.766.001-3.18-2.585-5.765-5.767-5.765zm3.374 8.163c-.146.411-.741.758-1.018.806-.277.048-.545.068-.863-.028-.204-.061-.469-.148-1.013-.374-2.12-.885-3.488-3.048-3.593-3.189-.106-.141-.842-1.121-.842-2.138 0-1.017.531-1.517.72-1.716.189-.199.412-.249.549-.249.136 0 .273.001.393.007.129.006.297-.049.464.351.171.411.583 1.42.634 1.52.051.101.085.218.017.353-.068.136-.102.217-.204.337-.102.12-.214.269-.307.362-.102.102-.209.213-.09.418.119.204.53.874 1.137 1.414.783.697 1.442.913 1.646 1.015.204.102.324.086.444-.053.12-.139.516-.599.654-.804.138-.205.276-.171.464-.101.188.07.576.27.823z" />
    </svg>
  )
}

// Progress ring (SVG) — matches Stitch: cx=20 cy=20 r=18 stroke-dasharray=113
const RING_R = 18
const RING_C = 2 * Math.PI * RING_R // ≈ 113.1

function ProgressRing({ pct, completed, total }: { pct: number; completed: number; total: number }) {
  const offset = RING_C - (RING_C * pct) / 100
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl shadow-[0_2px_8px_rgba(2,36,72,0.04)]">
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={RING_R} fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
          <circle
            cx="20" cy="20" r={RING_R}
            fill="transparent" stroke="#022448" strokeWidth="3"
            strokeDasharray={RING_C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-extrabold font-headline text-[#022448]">{pct}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-[#022448] font-headline uppercase tracking-tight">Progresso</p>
        <p className="text-[10px] text-slate-500 font-bold">{completed} de {total} concluídas</p>
      </div>
    </div>
  )
}

// ─── main queue ──────────────────────────────────────────────────────────────

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
  const [filterUrgency, setFilterUrgency] = useState<"urgent" | "high" | "normal" | null>(null)
  const [, startTransition] = useTransition()

  const prevFilterRef = useRef(filterAccountId)
  if (prevFilterRef.current !== filterAccountId) {
    prevFilterRef.current = filterAccountId
    setCompletedToday(0)
  }

  const allVisibleItems = filterAccountId
    ? items.filter((i) => i.accountId === filterAccountId)
    : items

  const visibleItems = allVisibleItems.slice(0, displayCount)
  const hasMore = allVisibleItems.length > displayCount

  const grouped = {
    urgent: visibleItems.filter((i) => i.urgency === "urgent"),
    high:   visibleItems.filter((i) => i.urgency === "high"),
    normal: visibleItems.filter((i) => i.urgency === "normal"),
  }

  const totalPending  = allVisibleItems.length
  const totalToday    = totalPending + completedToday
  const progressPct   = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
  const overdueCount  = allVisibleItems.filter((i) => i.daysOverdue >= 7).length
  const waitingCount  = allVisibleItems.filter((i) => i.consecutiveUnanswered > 0).length

  function openComposer(item: ExecutionItem) {
    setComposer({ itemId: item.id, phone: item.phone ?? "", message: item.messageText, variantIdx: 0 })
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

  const urgentCount = grouped.urgent.length
  const highCount   = grouped.high.length
  const normalCount = grouped.normal.length

  return (
    <div className="max-w-3xl mx-auto pb-20">
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
          <Link href="/execution" className="text-xs text-blue-600 hover:underline">Ver todas →</Link>
        </div>
      )}

      {/* Stats strip */}
      {totalToday > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <ProgressRing pct={progressPct} completed={completedToday} total={totalToday} />
          {overdueCount > 0 && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
              ⚠️ {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
            </div>
          )}
          {waitingCount > 0 && (
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
              💬 {waitingCount} aguardando
            </div>
          )}
        </div>
      )}

      {/* Filter pill switcher — matches Stitch header tabs */}
      {(urgentCount + highCount + normalCount) > 0 && (
        <div className="flex items-center gap-1 mb-6 bg-slate-100 rounded-full p-1 w-fit">
          {([
            { key: null,     label: `Todas (${urgentCount + highCount + normalCount})` },
            { key: "urgent", label: `Urgente (${urgentCount})`,    hide: urgentCount === 0 },
            { key: "high",   label: `Alta (${highCount})`,         hide: highCount === 0 },
            { key: "normal", label: `Normal (${normalCount})`,     hide: normalCount === 0 },
          ] as const).filter((t) => !("hide" in t && t.hide)).map((tab) => (
            <button
              key={String(tab.key)}
              type="button"
              onClick={() => setFilterUrgency(tab.key)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150",
                filterUrgency === tab.key
                  ? "bg-[#022448] text-white shadow-sm"
                  : "text-slate-500 hover:text-[#022448]"
              )}
            >
              {tab.label}
            </button>
          ))}
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
          if (filterUrgency !== null && filterUrgency !== urgency) return null
          const group = grouped[urgency]
          if (group.length === 0) return null
          const cfg = URGENCY_CONFIG[urgency]
          const Icon = cfg.icon
          const isCollapsed = collapsedGroups.has(urgency)

          return (
            <section key={urgency}>
              {/* Section header */}
              <button
                type="button"
                onClick={() => toggleGroup(urgency)}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                  <span className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</span>
                  <span className={cn(
                    "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                    cfg.pillBg
                  )}>
                    {group.length}
                    {urgency === "urgent" && (
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-pulse" />
                    )}
                  </span>
                </div>
                {isCollapsed
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground" />
                }
              </button>

              {!isCollapsed && (
                <AnimatePresence initial={false}>
                  <motion.div layout className="space-y-3">
                    {group.map((item) => {
                      const actionCfg  = ACTION_LABEL[item.actionType] ?? ACTION_LABEL.follow_up
                      const isComposing = composer?.itemId === item.id
                      const isIgnored  = item.ruleId === "ignored_change_approach"
                      const lastActionDays = item.lastActionAt ? (daysSince(item.lastActionAt) ?? 0) : null
                      const initials   = getInitials(item.accountName)
                      const isUrgent   = urgency === "urgent"

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 60, transition: { duration: 0.18 } }}
                        >
                          <div className={cn(
                            "group rounded-xl overflow-hidden border border-transparent relative",
                            cfg.cardBg,
                            cfg.cardBorder,
                            cfg.cardShadow,
                            isUrgent ? "p-6" : "p-5",
                          )}>

                            {/* ── card header row ── */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                {/* Avatar initials — size from urgency */}
                                <div className={cn(
                                  "rounded-full flex items-center justify-center font-headline font-bold shrink-0",
                                  cfg.avatarBg,
                                  cfg.avatarSize,
                                )}>
                                  {initials}
                                </div>

                                <div className="min-w-0">
                                  {/* Name + inline badges */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Link
                                      href={item.href}
                                      className={cn(
                                        "font-extrabold font-headline text-[#022448] hover:text-primary transition-colors truncate",
                                        isUrgent ? "text-lg" : "text-base"
                                      )}
                                    >
                                      {item.accountName}
                                    </Link>
                                    {/* Urgente inline badge with pulse dot */}
                                    {isUrgent && (
                                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-full tracking-wider uppercase shrink-0">
                                        <Zap className="w-3 h-3" />
                                        Urgente
                                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                                      </span>
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

                                  {/* Sub-info row */}
                                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                                    {item.contactName && (
                                      <span className="text-slate-500 text-xs font-medium">{item.contactName}</span>
                                    )}
                                    {item.phone && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                        <PhoneCall className="w-3 h-3" /> {item.phone}
                                      </span>
                                    )}
                                    {/* Risk gradient bar — urgent items */}
                                    {isUrgent && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-1 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" />
                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Alto Risco</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Reason + escalation */}
                                  {item.reason && (
                                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{item.reason}</p>
                                  )}
                                  {item.escalationReason && item.escalationLevel >= 1 && (
                                    <div className={cn(
                                      "flex items-center gap-1 mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded w-fit",
                                      item.escalationLevel === 3 ? "bg-red-50 text-red-700"
                                        : item.escalationLevel === 2 ? "bg-amber-50 text-amber-700"
                                        : "bg-slate-50 text-slate-600"
                                    )}>
                                      <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                                      {item.escalationReason}
                                    </div>
                                  )}
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
                                  </div>
                                </div>
                              </div>

                              {/* Action buttons — circular, hover-reveal on desktop */}
                              <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                  type="button"
                                  onClick={() => isComposing ? setComposer(null) : openComposer(item)}
                                  title={isComposing ? "Fechar" : isIgnored ? "Ligar" : "WhatsApp"}
                                  className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                                    isComposing
                                      ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                      : isIgnored
                                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                                      : "bg-white text-slate-400 hover:text-green-600 hover:bg-green-50 border border-slate-200"
                                  )}
                                >
                                  {isIgnored ? <Phone className="w-4 h-4" /> : (
                                    isComposing ? <X className="w-4 h-4" /> : <WppIcon className="w-4 h-4 text-[#25D366]" />
                                  )}
                                </button>
                                <Link
                                  href={item.href}
                                  title="Ver conta"
                                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                                >
                                  <Building2 className="w-4 h-4" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleMarkDone(item)}
                                  disabled={doneId === item.id}
                                  title="Marcar como feito"
                                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-slate-400 hover:text-green-600 hover:bg-green-50 border border-slate-200 transition-colors disabled:opacity-40"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSnooze(item)}
                                  disabled={snoozingId === item.id}
                                  title="Adiar por 3 dias"
                                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-40"
                                >
                                  <BellOff className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* ── WhatsApp Composer — Stitch style ── */}
                            {isComposing && (() => {
                              const variants       = MESSAGE_VARIANTS[item.actionType as MessageTemplateType] ?? null
                              const variantCount   = variants?.length ?? 0
                              const currentVariantIdx = composer?.variantIdx ?? 0

                              function cycleVariant(newIdx: number) {
                                if (!variants) return
                                const interpolated = interpolateTemplate(variants[newIdx].text, {
                                  name: item.contactName ?? item.accountName,
                                  service: item.accountName,
                                })
                                setComposer((c) => c && { ...c, message: interpolated, variantIdx: newIdx })
                              }

                              return (
                                <div className="mt-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4">
                                  {/* Composer header */}
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                                      <WppIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-headline font-bold text-[#166534] text-sm">WhatsApp</span>

                                    {/* Template variant pills */}
                                    {variantCount > 1 && (
                                      <div className="ml-auto flex gap-1.5 flex-wrap">
                                        {(variants ?? []).map((v, i) => (
                                          <button
                                            key={i}
                                            type="button"
                                            onClick={() => cycleVariant(i)}
                                            className={cn(
                                              "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors",
                                              currentVariantIdx === i
                                                ? "bg-[#022448] text-white"
                                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                            )}
                                          >
                                            <Zap className="w-2.5 h-2.5" />
                                            {v.label ?? `V${i + 1}`}
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    <button type="button" onClick={() => setComposer(null)} className="ml-auto shrink-0">
                                      <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                    </button>
                                  </div>

                                  {/* Phone input */}
                                  <div className="mb-3">
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

                                  {/* Textarea + absolute send button — matches Stitch layout */}
                                  <div className="relative">
                                    <textarea
                                      value={composer?.message ?? ""}
                                      onChange={(e) => setComposer((c) => c && { ...c, message: e.target.value })}
                                      rows={4}
                                      placeholder="Escreva sua mensagem aqui..."
                                      className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none pb-12 font-body"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSend(item)}
                                      disabled={sending || !composer?.phone.trim()}
                                      className="absolute bottom-3 right-3 flex items-center gap-2 bg-gradient-to-r from-[#25D366] to-[#16A34A] text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg shadow-green-900/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {sending ? "Enviando..." : "Enviar no WhatsApp"}
                                      <Send className="w-3.5 h-3.5" />
                                    </button>
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
          <Button variant="outline" size="sm" onClick={() => setDisplayCount((c) => c + 20)} className="gap-1.5">
            <ChevronDown className="w-3.5 h-3.5" />
            Carregar mais 20
          </Button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t">
        <p className="text-[11px] text-muted-foreground">
          {allVisibleItems.length > 0 && !hasMore
            ? `${allVisibleItems.length} ação${allVisibleItems.length !== 1 ? "ões" : ""} no total · `
            : ""}
          Itens adiados ficam ocultos por 3 dias e retornam automaticamente à fila.
        </p>
      </div>

      {/* Footer bar — matches Stitch: gradient bg, trophy + amber text, navy pill */}
      {totalToday > 0 && (
        <div className="fixed bottom-0 left-64 right-0 h-12 bg-gradient-to-r from-white to-slate-50 flex justify-between items-center px-8 border-t border-slate-200 z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold">
              🏆 {completedToday} de {totalToday} concluídas
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-[#022448] text-white px-6 py-1.5 rounded-full font-headline text-[11px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95"
          >
            Encerrar Turno
          </button>
        </div>
      )}
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
