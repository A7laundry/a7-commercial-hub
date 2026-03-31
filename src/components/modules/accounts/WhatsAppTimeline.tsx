"use client"

import { useAccountWhatsApp } from "@/hooks/accounts/useAccountWhatsApp"
import { MessageSquare, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  tenantId: string
  accountId: string
}

export function WhatsAppTimeline({ tenantId, accountId }: Props) {
  const { data: messages = [], isLoading } = useAccountWhatsApp(tenantId, accountId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">Nenhuma mensagem WhatsApp registrada.</p>
        <p className="text-xs mt-1 opacity-70">As mensagens aparecem após integração do webhook.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => {
        const isInbound = msg.direction === "inbound"
        const date = new Date(msg.received_at)
        const timeStr = date.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })

        return (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 p-3 rounded-md border text-sm",
              isInbound
                ? "bg-muted/30 border-border"
                : "bg-primary/5 border-primary/20"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {isInbound ? (
                <ArrowDownLeft className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {isInbound ? "Recebida" : "Enviada"}
                </span>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="text-xs text-muted-foreground/60">{msg.phone}</span>
                <span className="text-xs text-muted-foreground/60 ml-auto">{timeStr}</span>
              </div>
              <p className="text-sm leading-snug line-clamp-2">{msg.message_text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
