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
import { Send, CheckCircle2, AlertCircle } from "lucide-react"
import type { Account } from "@/types"

type Props = {
  account: Account
}

type SendState = "idle" | "sending" | "success" | "error"

const QUICK_ACTIONS: MessageTemplateType[] = ["reactivation", "follow_up", "upsell"]

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

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_ACTIONS.map((type) => {
          const tpl = MESSAGE_TEMPLATES[type]
          return (
            <button
              key={type}
              type="button"
              onClick={() => loadTemplate(type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                activeType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              <span>{tpl.emoji}</span>
              {tpl.label}
            </button>
          )
        })}
      </div>

      {/* Message composer */}
      {activeType && (
        <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Número WhatsApp</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="text-sm h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mensagem (editável)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sendState === "sending" || sendState === "success" || !phone.trim() || !message.trim()}
              className="gap-1.5"
            >
              {sendState === "sending" ? (
                <>Enviando...</>
              ) : sendState === "success" ? (
                <><CheckCircle2 className="w-4 h-4" />Enviado!</>
              ) : (
                <><Send className="w-4 h-4" />Enviar mensagem</>
              )}
            </Button>
            <button
              type="button"
              onClick={() => { setActiveType(null); setMessage(""); setSendState("idle") }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>

          {sendState === "error" && errorMsg && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
