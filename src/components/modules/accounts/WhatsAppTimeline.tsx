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
          <div
            key={i}
            className={cn(
              "h-12 rounded-2xl animate-pulse",
              i % 2 === 0 ? "ml-12 bg-[#25D366]/10" : "mr-12 bg-slate-100"
            )}
          />
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-[#25D366] opacity-60" />
        </div>
        <p className="text-sm font-medium text-[#022448]">Nenhuma mensagem registrada.</p>
        <p className="text-xs mt-1 text-muted-foreground">As mensagens aparecem após o primeiro envio.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto px-2 py-2 scroll-smooth">
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
                "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                isOutbound
                  ? "bg-[#25D366] text-white rounded-br-sm"
                  : "bg-white text-[#022448] rounded-bl-sm ring-1 ring-[#022448]/8",
                isLast && "ring-2 ring-offset-1",
                isLast && isOutbound
                  ? "ring-[#25D366]/40"
                  : isLast
                  ? "ring-[#022448]/15"
                  : ""
              )}
            >
              {msg.message_text}
            </div>
            <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1" suppressHydrationWarning>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full inline-block",
                isOutbound ? "bg-[#25D366]" : "bg-slate-300"
              )} />
              {isOutbound ? "Você" : "Cliente"} · {timeStr}
            </span>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
