"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useTenant } from "@/hooks/useTenant"
import {
  computeCommercialScore,
  computeNextBestAction,
  computeLTV,
} from "@/lib/commercial-intelligence"
import { MESSAGE_TEMPLATES, interpolateTemplate, type MessageTemplateType } from "@/lib/message-templates"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Flame, Zap, TrendingUp, Send, CheckCircle2, X, ChevronRight } from "lucide-react"
import type { Account } from "@/types"
import Link from "next/link"

type ActionItem = {
  account: Account
  reason: string
  templateType: MessageTemplateType
  ltv: number | null
}

type ComposerState = {
  accountId: string
  phone: string
  message: string
  templateType: MessageTemplateType
}

export function ActionCenterCard() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const { data: accounts = [], isPending: isLoading } = useAccounts(tenant.id, {})

  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [sending, setSending] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const now = Date.now()

  const reactivate: ActionItem[] = []
  const followUp: ActionItem[] = []
  const upsell: ActionItem[] = []

  for (const acc of accounts) {
    const score = computeCommercialScore(acc, [])
    const ltv = computeLTV(acc)
    const daysSince = acc.last_contact_at
      ? Math.floor((now - new Date(acc.last_contact_at).getTime()) / 86400000)
      : 999

    if (daysSince > 30 && acc.status !== "inactive") {
      reactivate.push({ account: acc, reason: `Sem contato há ${daysSince}d`, templateType: "reactivation", ltv })
    } else if (score === "at_risk" || (acc.pipeline_stage === "negotiating" && daysSince > 7)) {
      followUp.push({ account: acc, reason: acc.pipeline_stage === "negotiating" ? "Negociação parada" : "Em risco", templateType: "follow_up", ltv })
    } else if (score === "upsell") {
      upsell.push({ account: acc, reason: "Alto potencial de crescimento", templateType: "upsell", ltv })
    }
  }

  // Cap each section at 5
  const sections = [
    { key: "reactivate", icon: Flame, label: "Reativar", color: "text-red-600", items: reactivate.slice(0, 5) },
    { key: "followup",   icon: Zap,   label: "Follow-up", color: "text-amber-600", items: followUp.slice(0, 5) },
    { key: "upsell",     icon: TrendingUp, label: "Upsell", color: "text-emerald-600", items: upsell.slice(0, 5) },
  ] as const

  const totalItems = reactivate.length + followUp.length + upsell.length

  function openComposer(item: ActionItem) {
    const tpl = MESSAGE_TEMPLATES[item.templateType]
    setComposer({
      accountId: item.account.id,
      phone: "",
      message: interpolateTemplate(tpl.text, {
        name: item.account.contact_name ?? item.account.name,
        service: item.account.segment ?? item.account.name,
      }),
      templateType: item.templateType,
    })
  }

  async function handleSend() {
    if (!composer || !composer.phone.trim() || !composer.message.trim()) return
    setSending(true)
    try {
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: composer.accountId,
          phone: composer.phone.trim(),
          message: composer.message.trim(),
          action_type: composer.templateType,
        }),
      })
      setSentIds((prev) => new Set([...prev, composer.accountId]))
      qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
      setComposer(null)
    } finally {
      setSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (totalItems === 0) return null

  return (
    <div className="rounded-xl border bg-card col-span-full">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold">Central de Ações</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{totalItems} clientes aguardando ação</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
        {sections.map(({ key, icon: Icon, label, color, items }) => {
          if (items.length === 0) return null
          return (
            <div key={key} className="p-4 space-y-2">
              <div className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-3", color)}>
                <Icon className="w-3.5 h-3.5" />
                {label} ({items.length})
              </div>
              {items.map((item) => (
                <div
                  key={item.account.id}
                  className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <Link href={`/accounts/${item.account.id}`} className="font-medium hover:underline truncate block text-xs">
                      {item.account.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground">{item.reason}</p>
                    {item.ltv && (
                      <p className="text-[10px] text-green-700 font-medium" suppressHydrationWarning>
                        LTV {item.ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>
                  {sentIds.has(item.account.id) ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => openComposer(item)}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Enviar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Inline composer */}
      {composer && (
        <div className="border-t p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold">Enviar mensagem WhatsApp</p>
            <button type="button" onClick={() => setComposer(null)}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide block mb-1">Número</label>
              <Input
                value={composer.phone}
                onChange={(e) => setComposer((c) => c && { ...c, phone: e.target.value })}
                placeholder="+55 11 99999-0000"
                className="h-8 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide block mb-1">Mensagem</label>
              <Textarea
                value={composer.message}
                onChange={(e) => setComposer((c) => c && { ...c, message: e.target.value })}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setComposer(null)}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !composer.phone.trim()}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
