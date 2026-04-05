"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAccountTimeline } from "@/hooks/accounts/useAccountTimeline"
import { logAccountEvent } from "@/app/(app)/accounts/timeline-actions"
import type { TimelineEvent, TimelineEventType } from "@/app/(app)/accounts/timeline-actions"
import { cn } from "@/lib/utils"
import {
  MessageSquare,
  TrendingUp,
  Target,
  Trophy,
  XCircle,
  Bell,
  Clock,
  StickyNote,
  Zap,
  Plus,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

const EVENT_CONFIG: Record<TimelineEventType, { icon: React.ElementType; color: string; bg: string }> = {
  message_sent:   { icon: MessageSquare, color: "text-blue-600",   bg: "bg-blue-100" },
  stage_changed:  { icon: TrendingUp,    color: "text-purple-600", bg: "bg-purple-100" },
  deal_created:   { icon: Target,        color: "text-primary",    bg: "bg-primary/10" },
  deal_won:       { icon: Trophy,        color: "text-green-600",  bg: "bg-green-100" },
  deal_lost:      { icon: XCircle,       color: "text-red-600",    bg: "bg-red-100" },
  alert:          { icon: Bell,          color: "text-amber-600",  bg: "bg-amber-100" },
  snooze:         { icon: Clock,         color: "text-slate-500",  bg: "bg-slate-100" },
  note:           { icon: StickyNote,    color: "text-teal-600",   bg: "bg-teal-100" },
  action_taken:   { icon: Zap,           color: "text-orange-600", bg: "bg-orange-100" },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "agora"
  if (m < 60) return `${m}min`
  if (h < 24) return `${h}h`
  if (d < 7) return `${d}d`
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

type Props = {
  tenantId: string
  accountId: string
}

export function AccountTimeline({ tenantId, accountId }: Props) {
  const qc = useQueryClient()
  const { data: events = [], isPending } = useAccountTimeline(tenantId, accountId)
  const [adding, setAdding] = useState(false)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleAddNote() {
    if (!note.trim()) return
    setSaving(true)
    await logAccountEvent(accountId, "note", note.trim())
    await qc.invalidateQueries({ queryKey: ["account_timeline", tenantId, accountId] })
    setNote("")
    setAdding(false)
    setSaving(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Histórico ({events.length})
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" />
            Adicionar nota
          </button>
        )}
      </div>

      {/* Add note */}
      {adding && (
        <div className="mb-4 space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Reunião agendada para 15/05 com o gerente..."
            rows={2}
            className="text-sm resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddNote} disabled={!note.trim() || saving} className="h-7 text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar nota"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNote("") }} className="h-7 text-xs">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-7 h-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {events.map((event) => {
              const cfg = EVENT_CONFIG[event.event_type as TimelineEventType] ?? EVENT_CONFIG.action_taken
              const Icon = cfg.icon
              return (
                <div key={event.id} className="flex gap-3 relative">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background",
                    cfg.bg
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm leading-snug">{event.summary}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {timeAgo(event.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
