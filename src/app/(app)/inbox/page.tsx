"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useTenant } from "@/hooks/useTenant"
import { useInbox, type Conversation, type InboxFilter, type ConversationStatus } from "@/hooks/inbox/useInbox"
import { useConversationThread } from "@/hooks/inbox/useConversationThread"
import { useTenantMembers } from "@/hooks/inbox/useTenantMembers"
import { useQueryClient } from "@tanstack/react-query"
import { LinkAccountModal } from "@/components/modules/inbox/LinkAccountModal"
import {
  markConversationRead,
  assignConversation,
  updateConversationStatus,
} from "./actions"
import {
  MessageSquare, Send, Search, AlertCircle, Link2,
  Clock, ChevronDown, User, CheckCheck, RotateCcw,
  AlertOctagon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<ConversationStatus, { label: string; dot: string; badge: string }> = {
  open:             { label: "Aberta",          dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
  pending_customer: { label: "Ag. cliente",     dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700" },
  pending_internal: { label: "Pendência int.",  dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  resolved:         { label: "Resolvida",        dot: "bg-green-500",  badge: "bg-green-100 text-green-700" },
  spam:             { label: "Spam",             dot: "bg-red-400",    badge: "bg-red-100 text-red-600" },
  archived:         { label: "Arquivada",        dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-500" },
}

function StatusDot({ status }: { status: ConversationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", cfg.dot)} />
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", cfg.badge)}>
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// 24h window indicator
// ---------------------------------------------------------------------------

function WindowBadge({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => { setNow(Date.now()) }, [])

  if (!expiresAt || now === null) return null
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
        <Clock className="w-3 h-3" />
        Janela encerrada
      </span>
    )
  }
  const hours = Math.floor(ms / 3_600_000)
  const mins  = Math.floor((ms % 3_600_000) / 60_000)
  if (hours >= 20) return null
  return (
    <span className={cn(
      "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
      hours < 4 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
    )}>
      <Clock className="w-3 h-3" />
      {hours > 0 ? `${hours}h ${mins}min` : `${mins}min`}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

const FILTER_TABS: { id: InboxFilter; label: string }[] = [
  { id: "all",        label: "Todas" },
  { id: "open",       label: "Abertas" },
  { id: "mine",       label: "Minhas" },
  { id: "unassigned", label: "Não atribuídas" },
  { id: "resolved",   label: "Resolvidas" },
  { id: "spam",       label: "Spam" },
]

// ---------------------------------------------------------------------------
// Assign dropdown
// ---------------------------------------------------------------------------

function AssignButton({
  conversation,
  currentUserId,
  members,
  onAssign,
  loading,
}: {
  conversation: Conversation
  currentUserId: string
  members: { userId: string; email: string; name: string | null }[]
  onAssign: (userId: string | null) => void
  loading: boolean
}) {
  const assignedMember = members.find((m) => m.userId === conversation.assignedTo)
  const displayName = assignedMember
    ? (assignedMember.name ?? assignedMember.email.split("@")[0])
    : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      >
        <User className="w-3 h-3" />
        {displayName ?? "Atribuir"}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {conversation.assignedTo && (
          <>
            <DropdownMenuItem
              className="text-muted-foreground text-xs"
              onClick={() => onAssign(null)}
            >
              Remover atribuição
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {members.map((m) => (
          <DropdownMenuItem
            key={m.userId}
            onClick={() => onAssign(m.userId)}
            className={cn(
              "text-sm",
              m.userId === conversation.assignedTo && "font-semibold"
            )}
          >
            <span className="truncate">
              {m.name ?? m.email.split("@")[0]}
              {m.userId === currentUserId && (
                <span className="ml-1 text-muted-foreground text-xs">(você)</span>
              )}
            </span>
          </DropdownMenuItem>
        ))}
        {members.length === 0 && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Nenhum membro
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Status dropdown
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: ConversationStatus[] = [
  "open", "pending_customer", "pending_internal", "resolved", "spam",
]

function StatusDropdown({
  current,
  onSelect,
  loading,
}: {
  current: ConversationStatus
  onSelect: (s: ConversationStatus) => void
  loading: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      >
        <StatusDot status={current} />
        {STATUS_CONFIG[current]?.label ?? current}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {STATUS_OPTIONS.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onSelect(s)}
            className={cn("gap-2 text-sm", s === current && "font-semibold")}
          >
            <StatusDot status={s} />
            {STATUS_CONFIG[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InboxPage() {
  const { tenant, currentUser } = useTenant()
  const qc = useQueryClient()

  const [filter, setFilter] = useState<InboxFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [linkPhone, setLinkPhone] = useState<string | null>(null)

  const [assignPending, startAssignTransition] = useTransition()
  const [statusPending, startStatusTransition] = useTransition()
  const [clientNow, setClientNow] = useState<number | null>(null)
  useEffect(() => { setClientNow(Date.now()) }, [])

  const { data: conversations = [], isPending: isLoading } = useInbox(
    tenant.id,
    filter,
    currentUser.user_id
  )
  const { data: threadMessages = [], isPending: threadLoading } =
    useConversationThread(selectedId)
  const { data: members = [] } = useTenantMembers()

  // Search filter (client-side on already-fetched data)
  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.accountName?.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.lastMessagePreview ?? "").toLowerCase().includes(q)
    )
  })

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  // Badge counts
  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length
  const unmappedCount = conversations.filter((c) => !c.accountId).length

  // ---------------------------------------------------------------------------
  // Conversation selection
  // ---------------------------------------------------------------------------

  async function selectConversation(conv: Conversation) {
    setSelectedId(conv.id)
    if (conv.unreadCount > 0) {
      await markConversationRead(conv.id)
      qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
      qc.invalidateQueries({ queryKey: ["inbox:unread-count", tenant.id] })
    }
  }

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  async function handleSend() {
    if (!selected || !reply.trim()) return
    if (!selected.accountId) {
      toast.error("Vincule esta conversa a uma conta antes de enviar mensagens")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selected.accountId,
          phone: selected.phone,
          message: reply.trim(),
          action_type: "follow_up",
          conversation_id: selected.id,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        toast.error(body.error ?? "Falha ao enviar mensagem")
        return
      }
      setReply("")
      qc.invalidateQueries({ queryKey: ["thread", selected.id] })
      qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
      if (selected.accountId) {
        qc.invalidateQueries({ queryKey: ["whatsapp", tenant.id, selected.accountId] })
      }
    } catch {
      toast.error("Erro de rede ao enviar mensagem")
    } finally {
      setSending(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Assign
  // ---------------------------------------------------------------------------

  function handleAssign(userId: string | null) {
    if (!selected) return
    startAssignTransition(async () => {
      const { error } = await assignConversation(selected.id, userId)
      if (error) {
        toast.error(error)
        return
      }
      toast.success(userId ? "Conversa atribuída" : "Atribuição removida")
      qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
    })
  }

  // ---------------------------------------------------------------------------
  // Status change
  // ---------------------------------------------------------------------------

  function handleUpdateStatus(status: ConversationStatus) {
    if (!selected) return
    startStatusTransition(async () => {
      const { error } = await updateConversationStatus(selected.id, status)
      if (error) {
        toast.error(error)
        return
      }
      toast.success(`Status: ${STATUS_CONFIG[status].label}`)
      qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
      // If resolved/spam, deselect so list refreshes cleanly
      if (status === "resolved" || status === "spam") {
        setSelectedId(null)
      }
    })
  }

  function handleLinked(_accountId: string, _accountName: string) {
    qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
    qc.invalidateQueries({ queryKey: ["alerts:open-count", tenant.id] })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ── LEFT: conversation list ────────────────────────────────────── */}
        <div className="w-72 border-r flex flex-col shrink-0">

          {/* Header */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold">Inbox</h1>
              <div className="flex items-center gap-1.5">
                {unmappedCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {unmappedCount} sem vínculo
                  </span>
                )}
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {unreadCount} não lidas
                  </span>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setFilter(tab.id); setSelectedId(null) }}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors",
                    filter === tab.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
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

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <MessageSquare className="w-6 h-6 mb-2 opacity-30" />
                Nenhuma conversa
              </div>
            ) : (
              filtered.map((conv) => {
                const isSelected = conv.id === selectedId
                const isUnmapped = !conv.accountId
                const time = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : ""
                const assignee = members.find((m) => m.userId === conv.assignedTo)
                const assigneeInitial = assignee
                  ? (assignee.name ?? assignee.email)[0].toUpperCase()
                  : null

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => selectConversation(conv)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors",
                      isSelected && "bg-primary/5 border-l-2 border-l-primary",
                      isUnmapped && !isSelected && "border-l-2 border-l-amber-400"
                    )}
                  >
                    {/* Row 1: Name + time */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn(
                        "text-sm font-medium truncate max-w-[130px]",
                        isUnmapped && "text-muted-foreground italic"
                      )}>
                        {conv.accountName ?? conv.phone}
                      </span>
                      <span suppressHydrationWarning className="text-[10px] text-muted-foreground shrink-0">
                        {time}
                      </span>
                    </div>

                    {/* Row 2: Preview + badges */}
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={conv.status} />
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {conv.lastMessageDirection === "outbound" && (
                          <span className="text-primary font-medium">Você: </span>
                        )}
                        {conv.lastMessagePreview ?? ""}
                      </p>
                      {assigneeInitial && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-muted border text-[9px] font-bold flex items-center justify-center text-foreground/70">
                          {assigneeInitial}
                        </span>
                      )}
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

        {/* ── RIGHT: chat window ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="border-b px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {selected.accountName ?? selected.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.phone}</p>
                </div>

                {/* Status dropdown */}
                <StatusDropdown
                  current={selected.status}
                  onSelect={handleUpdateStatus}
                  loading={statusPending}
                />

                {/* Assign dropdown */}
                <AssignButton
                  conversation={selected}
                  currentUserId={currentUser.user_id}
                  members={members}
                  onAssign={handleAssign}
                  loading={assignPending}
                />

                {/* 24h window */}
                <WindowBadge expiresAt={selected.windowExpiresAt} />

                {/* Quick actions: resolve / reopen */}
                {selected.status !== "resolved" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50 shrink-0"
                    onClick={() => handleUpdateStatus("resolved")}
                    disabled={statusPending}
                  >
                    <CheckCheck className="w-3 h-3" />
                    Resolver
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={() => handleUpdateStatus("open")}
                    disabled={statusPending}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reabrir
                  </Button>
                )}

                {/* CRM link */}
                {selected.accountId ? (
                  <Link
                    href={`/accounts/${selected.accountId}`}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Ver conta →
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5 text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => setLinkPhone(selected.phone)}
                  >
                    <Link2 className="w-3 h-3" />
                    Vincular
                  </Button>
                )}
              </div>

              {/* Banners */}
              {!selected.accountId && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 flex-1">
                    Conversa não vinculada a nenhuma conta.
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0"
                    onClick={() => setLinkPhone(selected.phone)}
                  >
                    Vincular agora
                  </button>
                </div>
              )}

              {selected.windowExpiresAt && clientNow !== null &&
                new Date(selected.windowExpiresAt).getTime() < clientNow && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-xs text-red-800">
                    Janela de 24h encerrada. Envio requer template aprovado pela Meta.
                  </p>
                </div>
              )}

              {selected.status === "spam" && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-xs text-red-800 flex-1">
                    Conversa marcada como spam.
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-700 hover:text-red-900 shrink-0"
                    onClick={() => handleUpdateStatus("open")}
                  >
                    Reabrir
                  </button>
                </div>
              )}

              {/* Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {threadLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-3/4 rounded-2xl" />
                    ))}
                  </div>
                ) : threadMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                    Nenhuma mensagem ainda
                  </div>
                ) : (
                  threadMessages.map((msg) => {
                    const isOutbound = msg.direction === "outbound"
                    const time = new Date(msg.received_at).toLocaleString("pt-BR", {
                      hour: "2-digit", minute: "2-digit",
                    })
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex flex-col gap-0.5", isOutbound ? "items-end" : "items-start")}
                      >
                        <div className={cn(
                          "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                          isOutbound
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}>
                          {msg.message_text}
                        </div>
                        <span suppressHydrationWarning className="text-[10px] text-muted-foreground px-1">
                          {time}
                          {isOutbound && msg.send_status !== "sent" && msg.send_status !== "pending" && (
                            <span className="ml-1 opacity-60">· {msg.send_status}</span>
                          )}
                        </span>
                      </div>
                    )
                  })
                )}
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

      {/* Link account modal */}
      {linkPhone && (
        <LinkAccountModal
          phone={linkPhone}
          open={!!linkPhone}
          onOpenChange={(open) => { if (!open) setLinkPhone(null) }}
          onLinked={handleLinked}
        />
      )}
    </>
  )
}
