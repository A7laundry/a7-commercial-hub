"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, X, ArrowLeft, Send, Users } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import {
  useChatMembers,
  useChatUnreadCount,
  useChatThread,
  useSendMessage,
  useMarkRead,
  type ChatMember,
} from "@/hooks/useInternalChat"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function memberInitials(member: ChatMember) {
  const name = member.display_name ?? member.email
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

function memberName(member: ChatMember) {
  return member.display_name ?? member.email.split("@")[0]
}

// ── Unread badge ──────────────────────────────────────────────────────────────

export function ChatUnreadBadge() {
  const { tenant, currentUser } = useTenant()
  const { data: count = 0 } = useChatUnreadCount(tenant.id, currentUser.user_id)
  if (count === 0) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
      {count > 99 ? "99+" : count}
    </span>
  )
}

// ── Conversation list ─────────────────────────────────────────────────────────

function ConversationList({
  tenantId,
  currentUserId,
  onSelect,
}: {
  tenantId: string
  currentUserId: string
  onSelect: (member: ChatMember) => void
}) {
  const { data: members = [], isPending } = useChatMembers(tenantId, currentUserId)

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-2.5 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6 text-center">
        <Users className="w-10 h-10 opacity-30" />
        <p className="text-sm">Nenhum outro membro na organização ainda.</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto flex-1">
      {members.map((member) => (
        <button
          key={member.user_id}
          type="button"
          onClick={() => onSelect(member)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/40 last:border-0"
        >
          <div className="relative shrink-0">
            <UserAvatar
              avatarUrl={member.avatar_url}
              displayName={member.display_name}
              email={member.email}
              size={40}
            />
            {member.unread_count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                {member.unread_count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{memberName(member)}</span>
              {member.last_message_at && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTime(member.last_message_at)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {member.last_message ?? "Iniciar conversa"}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Chat thread ───────────────────────────────────────────────────────────────

function ChatThread({
  tenantId,
  currentUserId,
  member,
  onBack,
}: {
  tenantId: string
  currentUserId: string
  member: ChatMember
  onBack: () => void
}) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: messages = [] } = useChatThread(tenantId, currentUserId, member.user_id)
  const sendMsg = useSendMessage(tenantId, currentUserId)
  const markRead = useMarkRead(tenantId, currentUserId)

  // Mark messages as read when thread opens
  useEffect(() => {
    markRead.mutate(member.user_id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.user_id])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    sendMsg.mutate({ receiverId: member.user_id, content: text })
    setInput("")
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b bg-muted/30 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <UserAvatar
          avatarUrl={member.avatar_url}
          displayName={member.display_name}
          email={member.email}
          size={32}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{memberName(member)}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">Nenhuma mensagem ainda.<br />Diga olá!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === currentUserId
          const prevMsg = messages[idx - 1]
          const showTime =
            !prevMsg ||
            new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60_000

          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-center text-[10px] text-muted-foreground my-2">
                  {formatTime(msg.created_at)}
                </p>
              )}
              <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] px-3 py-1.5 rounded-2xl text-sm leading-relaxed break-words",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t bg-background shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem..."
            rows={1}
            className="flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-24 overflow-y-auto"
            style={{ minHeight: "36px" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sendMsg.isPending}
            className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 pl-1">Enter para enviar · Shift+Enter nova linha</p>
      </div>
    </div>
  )
}

// ── Main InternalChat panel ───────────────────────────────────────────────────

export function InternalChat() {
  const { tenant, currentUser } = useTenant()
  const [open, setOpen] = useState(false)
  const [activeMember, setActiveMember] = useState<ChatMember | null>(null)
  const { data: unreadCount = 0 } = useChatUnreadCount(tenant.id, currentUser.user_id)

  function handleSelectMember(member: ChatMember) {
    setActiveMember(member)
  }

  function handleBack() {
    setActiveMember(null)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat interno"
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="fixed right-4 top-14 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[calc(100vh-5rem)] max-h-[560px] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Chat Interno</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait" initial={false}>
                  {activeMember ? (
                    <motion.div
                      key={activeMember.user_id}
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 30, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full flex flex-col"
                    >
                      <ChatThread
                        tenantId={tenant.id}
                        currentUserId={currentUser.user_id}
                        member={activeMember}
                        onBack={handleBack}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -30, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full flex flex-col"
                    >
                      <ConversationList
                        tenantId={tenant.id}
                        currentUserId={currentUser.user_id}
                        onSelect={handleSelectMember}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
