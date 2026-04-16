"use client"

import React, { useState, useTransition } from "react"
import type { Campaign } from "@/types"
import { executeCampaign, deleteCampaign } from "@/app/(app)/campaigns/actions"
import { useCampaignRecipients } from "@/hooks/campaigns/useCampaigns"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { formatDateBR } from "@/lib/format"
import {
  Send,
  Users,
  CheckCircle,
  Clock,
  PhoneOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
} from "lucide-react"

// Static label/config maps — outside component
const TYPE_LABELS: Record<string, string> = {
  reactivation: "Reativação",
  follow_up:    "Follow-up",
  upsell:       "Upsell",
  renewal:      "Renovação",
  custom:       "Livre",
  birthday:     "Aniversário",
  risk:         "Retenção",
  acquisition:  "Prospecção",
  recurrence:   "Recorrência",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; accentBar: string }> = {
  draft:     { label: "Rascunho", color: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",  dot: "bg-slate-400",  accentBar: "bg-slate-300" },
  active:    { label: "Enviada",  color: "bg-green-100 text-green-700 ring-1 ring-green-200",  dot: "bg-green-500",  accentBar: "bg-green-500" },
  completed: { label: "Concluída",color: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",     dot: "bg-blue-500",   accentBar: "bg-blue-500"  },
  cancelled: { label: "Cancelada",color: "bg-red-100 text-red-700 ring-1 ring-red-200",        dot: "bg-red-500",    accentBar: "bg-red-400"   },
}

// Recipient status icons — static map outside render
const RECIPIENT_STATUS_ICONS: Record<string, React.ReactNode> = {
  sent:     <CheckCircle className="w-3 h-3 text-green-600" />,
  pending:  <Clock className="w-3 h-3 text-amber-500" />,
  failed:   <CheckCircle className="w-3 h-3 text-red-500" />,
  no_phone: <PhoneOff className="w-3 h-3 text-muted-foreground" />,
}

type Props = {
  campaign: Campaign
  onToast: (msg: string, ok: boolean) => void
}

export function CampaignCard({ campaign, onToast }: Props) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: recipients = [] } = useCampaignRecipients(
    campaign.tenant_id,
    expanded ? campaign.id : null
  )

  function handleExecute() {
    startTransition(async () => {
      const result = await executeCampaign(campaign.id)
      if (result.error) {
        onToast(result.error, false)
      } else {
        qc.invalidateQueries({ queryKey: ["campaigns", campaign.tenant_id] })
        onToast(`Campanha executada — ${result.sent} mensagens registradas!`, true)
      }
      setConfirming(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id)
      if (result.error) onToast(result.error, false)
      else {
        qc.invalidateQueries({ queryKey: ["campaigns", campaign.tenant_id] })
        onToast("Campanha removida.", true)
      }
      setDeleting(false)
    })
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(campaign.message_template)
    setCopiedId("msg")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const statusCfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft
  const createdAt = formatDateBR(campaign.created_at)

  const sentCount    = recipients.filter((r) => r.status === "sent").length
  const pendingCount = recipients.filter((r) => r.status === "pending").length
  const noPhoneCount = recipients.filter((r) => r.status === "no_phone").length

  return (
    <div className="crm-card bg-white border border-transparent rounded-xl shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
      {/* top accent bar by status */}
      <div className={cn("h-1 w-full", statusCfg.accentBar)} />

      {/* Header */}
      <div className="px-4 py-3.5 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#022448]">{campaign.name}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1", statusCfg.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
              {statusCfg.label}
            </span>
            <span className="text-[10px] font-semibold text-[#022448]/60 bg-[#022448]/8 ring-1 ring-[#022448]/10 rounded-full px-2 py-0.5">
              {TYPE_LABELS[campaign.type] ?? campaign.type}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {campaign.recipient_count} destinatários
            </span>
            {campaign.sent_count > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <CheckCircle className="w-3 h-3" />
                {campaign.sent_count} enviadas
              </span>
            )}
            <span>{createdAt}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {campaign.status === "draft" && (
            <>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={isPending}
                className="btn-wpp flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Executar
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-red-50"
                onClick={() => setDeleting(true)}
                disabled={isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-[#022448]/8"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 bg-[#f8f9fa]">
          {/* Message preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mensagem</p>
              <button
                type="button"
                onClick={copyMessage}
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold transition-colors",
                  copiedId === "msg" ? "text-green-600 crm-check-pop" : "text-muted-foreground hover:text-[#022448]"
                )}
              >
                {copiedId === "msg" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedId === "msg" ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-sm bg-white border border-[#022448]/8 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap shadow-sm">
              {campaign.message_template}
            </p>
          </div>

          {/* Recipients */}
          {recipients.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-2 text-xs font-semibold">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />{sentCount} enviados
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="w-3 h-3" />{pendingCount} pendentes
                </span>
                {noPhoneCount > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <PhoneOff className="w-3 h-3" />{noPhoneCount} sem telefone
                  </span>
                )}
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto rounded-xl border border-[#022448]/8 bg-white p-2">
                {recipients.map((r) => {
                  const acc = r.accounts as { name: string; contact_name: string | null } | null
                  const statusIcon = RECIPIENT_STATUS_ICONS[r.status]

                  return (
                    <div key={r.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-[#f8f9fa] transition-colors">
                      {statusIcon}
                      <span className="flex-1 truncate font-semibold text-[#022448]">{acc?.name ?? "—"}</span>
                      <span className="text-muted-foreground">{r.phone ?? "sem telefone"}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm execute */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Isso registrará mensagens outbound no histórico de WhatsApp para todos os destinatários
              com telefone cadastrado. A ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute} disabled={isPending}>
              {isPending ? "Executando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha e seus destinatários serão removidos. Somente rascunhos podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
