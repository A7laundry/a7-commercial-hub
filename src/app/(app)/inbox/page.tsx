"use client"

import { useState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { useInbox, type Conversation } from "@/hooks/inbox/useInbox"
import { useQueryClient } from "@tanstack/react-query"
import { MessageSquare, Send, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function InboxPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const { data: conversations = [], isPending: isLoading } = useInbox(tenant.id)

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.accountName?.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.lastMessage.message_text.toLowerCase().includes(q)
    )
  })

  const selected = conversations.find((c) => c.key === selectedKey) ?? null

  async function handleSend() {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selected.accountId,
          phone: selected.phone,
          message: reply.trim(),
          action_type: "follow_up",
        }),
      })
      setReply("")
      qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
      if (selected.accountId) {
        qc.invalidateQueries({ queryKey: ["whatsapp", tenant.id, selected.accountId] })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* LEFT — conversation list */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <h1 className="text-base font-semibold mb-2">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
              <MessageSquare className="w-6 h-6 mb-2 opacity-30" />
              Nenhuma conversa
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = conv.key === selectedKey
              const time = new Date(conv.lastMessage.received_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <button
                  key={conv.key}
                  type="button"
                  onClick={() => setSelectedKey(conv.key)}
                  className={cn(
                    "w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition-colors",
                    isSelected && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {conv.accountName ?? conv.phone}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {conv.lastMessage.direction === "outbound" && (
                        <span className="text-primary font-medium">Você: </span>
                      )}
                      {conv.lastMessage.message_text}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT — chat window */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-12 border-b px-4 flex items-center gap-3 shrink-0">
              <div>
                <p className="text-sm font-semibold">{selected.accountName ?? selected.phone}</p>
                <p className="text-xs text-muted-foreground">{selected.phone}</p>
              </div>
              {selected.accountId && (
                <a
                  href={`/accounts/${selected.accountId}`}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Ver cliente →
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selected.messages.map((msg, i) => {
                const isOutbound = msg.direction === "outbound"
                const time = new Date(msg.received_at).toLocaleString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                return (
                  <div key={msg.id} className={cn("flex flex-col gap-0.5", isOutbound ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isOutbound
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      {msg.message_text}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">{time}</span>
                  </div>
                )
              })}
            </div>

            {/* Input */}
            <div className="border-t p-3 flex gap-2 shrink-0">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={2}
                className="flex-1 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                className="self-end h-9 px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
