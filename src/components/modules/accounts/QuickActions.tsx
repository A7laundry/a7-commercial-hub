"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTenant } from "@/hooks/useTenant"
import { useAccountPhone } from "@/hooks/accounts/useAccountPhone"
import { MESSAGE_TEMPLATES, interpolateTemplate, type MessageTemplateType } from "@/lib/message-templates"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import type { Account } from "@/types"

type Props = {
  account: Account
}

type SendState = "idle" | "sending" | "success" | "error"

const QUICK_ACTIONS: MessageTemplateType[] = ["reactivation", "follow_up", "upsell"]

// Action type → visual config (static, defined outside component per rerender-no-inline-components)
// Partial — only the 3 types surfaced in QUICK_ACTIONS need full styles
const ACTION_STYLE: Partial<Record<MessageTemplateType, { pill: string; activePill: string }>> = {
  reactivation: {
    pill: "border-[#25D366]/30 text-[#0A7251] hover:bg-[#25D366]/8 hover:border-[#25D366]/50",
    activePill: "btn-wpp border-transparent text-white shadow-sm",
  },
  follow_up: {
    pill: "border-[#F5A623]/30 text-[#B45309] hover:bg-[#F5A623]/8 hover:border-[#F5A623]/50",
    activePill: "btn-nova-lead border-transparent shadow-sm",
  },
  upsell: {
    pill: "border-[#022448]/20 text-[#022448] hover:bg-[#022448]/5 hover:border-[#022448]/30",
    activePill: "bg-[#022448] text-white border-transparent shadow-sm",
  },
}

const DEFAULT_ACTION_STYLE = {
  pill: "border-border text-foreground hover:bg-muted",
  activePill: "bg-primary text-primary-foreground border-transparent",
}

export function QuickActions({ account }: Props) {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const { data: mappedPhone } = useAccountPhone(tenant.id, account.id)

  const [activeType, setActiveType] = useState<MessageTemplateType | null>(null)
  const [message, setMessage] = useState("")
  const [phone, setPhone] = useState("")
  const [sendState, setSendState] = useState<SendState>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function loadTemplate(type: MessageTemplateType) {
    const tpl = MESSAGE_TEMPLATES[type]
    const text = interpolateTemplate(tpl.text, {
      name: account.contact_name ?? account.name,
      service: account.segment ?? account.name,
    })
    setActiveType(type)
    setMessage(text)
    setPhone(mappedPhone ?? "")
    setSendState("idle")
    setErrorMsg(null)
  }

  async function handleSend() {
    if (!message.trim() || !phone.trim()) return
    setSendState("sending")
    setErrorMsg(null)

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: account.id,
          phone: phone.trim(),
          message: message.trim(),
          action_type: activeType,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Erro ao enviar")
      }

      setSendState("success")
      qc.invalidateQueries({ queryKey: ["whatsapp", tenant.id, account.id] })
      qc.invalidateQueries({ queryKey: ["accounts", tenant.id, account.id] })

      setTimeout(() => {
        setSendState("idle")
        setActiveType(null)
        setMessage("")
      }, 2500)
    } catch (err) {
      setSendState("error")
      setErrorMsg(err instanceof Error ? err.message : "Erro ao enviar")
    }
  }

  const isSending = sendState === "sending"
  const isSuccess = sendState === "success"
  const canSend   = !!phone.trim() && !!message.trim() && !isSending && !isSuccess

  return (
    <div className="space-y-4">
      {/* Action pill buttons */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_ACTIONS.map((type) => {
          const tpl = MESSAGE_TEMPLATES[type]
          const style = ACTION_STYLE[type] ?? DEFAULT_ACTION_STYLE
          const isActive = activeType === type

          return (
            <button
              key={type}
              type="button"
              onClick={() => loadTemplate(type)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                isActive ? style.activePill : style.pill
              )}
            >
              <span aria-hidden="true">{tpl.emoji}</span>
              {tpl.label}
            </button>
          )
        })}
      </div>

      {/* Message composer — shown when an action is selected */}
      {activeType !== null && (
        <div className="space-y-3 p-4 border border-[#022448]/10 rounded-xl bg-[#f8f9fa]">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Número WhatsApp
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="text-sm h-8 border-[#022448]/15 focus:border-[#022448]/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Mensagem (editável)
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="text-sm resize-none border-[#022448]/15 focus:border-[#022448]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "btn-wpp flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed",
                isSuccess && "opacity-90"
              )}
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
              ) : isSuccess ? (
                <><CheckCircle2 className="w-4 h-4 crm-check-pop" />Enviado!</>
              ) : (
                <><Send className="w-4 h-4" />Enviar via WhatsApp</>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveType(null); setMessage(""); setSendState("idle") }}
              className="text-xs text-muted-foreground hover:text-[#022448] transition-colors"
            >
              Cancelar
            </button>
          </div>

          {sendState === "error" && errorMsg !== null && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
