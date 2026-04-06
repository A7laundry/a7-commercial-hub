"use client"

import { useEffect, useRef } from "react"
import { useAccountWhatsApp } from "@/hooks/accounts/useAccountWhatsApp"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  tenantId: string
  accountId: string
}

export function WhatsAppTimeline({ tenantId, accountId }: Props) {
  const { data: messages = [], isPending: isLoading } = useAccountWhatsApp(tenantId, accountId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  if (isLoading) {
    return (
      <div className="space-y-2 px-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("h-12 bg-muted/50 rounded-2xl animate-pulse", i % 2 === 0 ? "ml-12" : "mr-12")} />
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">Nenhuma mensagem registrada.</p>
        <p className="text-xs mt-1 opacity-70">As mensagens aparecem após o primeiro envio.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto px-2 py-2">
      {messages.map((msg, i) => {
        const isOutbound = msg.direction === "outbound"
        const isLast = i === messages.length - 1
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
            className={cn("flex flex-col gap-0.5", isOutbound ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                isOutbound
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
                isLast && "ring-2 ring-offset-1",
                isLast && isOutbound ? "ring-primary/30" : isLast ? "ring-muted-foreground/20" : ""
              )}
            >
              {msg.message_text}
            </div>
            <span className="text-[10px] text-muted-foreground px-1" suppressHydrationWarning>
              {isOutbound ? "Você" : "Cliente"} · {timeStr}
            </span>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
