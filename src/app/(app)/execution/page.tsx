"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTenant } from "@/hooks/useTenant"
import { useExecutionQueue, type ExecutionItem } from "@/hooks/dashboard/useExecutionQueue"
import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Zap, AlertTriangle, ArrowRight, Send, CheckCircle2, X,
  Building2, PhoneCall, MessageSquare, Target, RefreshCw,
  ChevronDown, ChevronUp,
} from "lucide-react"

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  follow_up:    { label: "Follow-up",   color: "bg-amber-100 text-amber-700" },
  reactivation: { label: "Reativar",    color: "bg-red-100 text-red-700" },
  renewal:      { label: "Renovação",   color: "bg-blue-100 text-blue-700" },
  upsell:       { label: "Upsell",      color: "bg-emerald-100 text-emerald-700" },
  qualify:      { label: "Qualificar",  color: "bg-purple-100 text-purple-700" },
  proposal:     { label: "Proposta",    color: "bg-orange-100 text-orange-700" },
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
}

export default function ExecutionPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const { data: items = [], isPending: isLoading, refetch } = useExecutionQueue(tenant.id)

  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [sending, setSending] = useState(false)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const grouped = {
    urgent: items.filter((i) => i.urgency === "urgent" && !doneIds.has(i.id)),
    high:   items.filter((i) => i.urgency === "high"   && !doneIds.has(i.id)),
    normal: items.filter((i) => i.urgency === "normal"  && !doneIds.has(i.id)),
  }

  const totalPending = grouped.urgent.length + grouped.high.length + grouped.normal.length

  function openComposer(item: ExecutionItem) {
    setComposer({
      itemId: item.id,
      phone: item.phone ?? "",
      message: item.messageText,
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
        setDoneIds((prev) => new Set([...prev, item.id]))
        qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
        setComposer(null)
      }
    } finally {
      setSending(false)
    }
  }

  function markDone(id: string) {
    setDoneIds((prev) => new Set([...prev, id]))
    if (composer?.itemId === id) setComposer(null)
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
                <div className="space-y-2">
                  {group.map((item) => {
                    const actionCfg = ACTION_LABEL[item.actionType] ?? ACTION_LABEL.follow_up
                    const isComposing = composer?.itemId === item.id

                    return (
                      <div
                        key={item.id}
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
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.reason}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {item.ltv && (
                                <span className="text-[10px] text-emerald-700 font-medium">
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
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                              )}
                            >
                              <MessageSquare className="w-3 h-3" />
                              {isComposing ? "Fechar" : "WhatsApp"}
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
                              onClick={() => markDone(item.id)}
                              className="text-[10px] font-medium px-2 py-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                              title="Marcar como resolvido"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline WhatsApp Composer */}
                        {isComposing && (
                          <div className="border-t px-4 py-3 space-y-3 bg-background">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold flex items-center gap-1.5">
                                <Send className="w-3 h-3" />
                                Enviar via WhatsApp
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
                                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium block mb-1">
                                  Mensagem
                                </label>
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
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {doneIds.size > 0 && (
        <div className="mt-8 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {doneIds.size} ação{doneIds.size !== 1 ? "ões" : ""} resolvida{doneIds.size !== 1 ? "s" : ""} nesta sessão.{" "}
            <button
              type="button"
              onClick={() => setDoneIds(new Set())}
              className="text-primary hover:underline"
            >
              Restaurar
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
