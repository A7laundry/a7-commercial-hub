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
} from "lucide-react"

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

const STATUS_CONFIG = {
  draft:     { label: "Rascunho", color: "bg-slate-100 text-slate-600" },
  active:    { label: "Enviada",  color: "bg-green-100 text-green-700" },
  completed: { label: "Concluída",color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelada",color: "bg-red-100 text-red-700" },
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

  const statusCfg = STATUS_CONFIG[campaign.status]
  const createdAt = formatDateBR(campaign.created_at)

  const sentCount = recipients.filter((r) => r.status === "sent").length
  const pendingCount = recipients.filter((r) => r.status === "pending").length
  const noPhoneCount = recipients.filter((r) => r.status === "no_phone").length

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{campaign.name}</span>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", statusCfg.color)}>
              {statusCfg.label}
            </span>
            <span className="text-[10px] text-muted-foreground border rounded-full px-1.5 py-0.5">
              {TYPE_LABELS[campaign.type] ?? campaign.type}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {campaign.recipient_count} destinatários
            </span>
            {campaign.sent_count > 0 && (
              <span className="flex items-center gap-1 text-green-600">
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
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => setConfirming(true)}
                disabled={isPending}
              >
                <Send className="w-3 h-3" />
                Executar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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
            className="h-7 w-7 p-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-4 bg-muted/20">
          {/* Message preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mensagem</p>
              <button
                type="button"
                onClick={copyMessage}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  copiedId === "msg" ? "text-green-600" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {copiedId === "msg" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedId === "msg" ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-sm bg-card border rounded-md px-3 py-2 leading-relaxed whitespace-pre-wrap">
              {campaign.message_template}
            </p>
          </div>

          {/* Recipients */}
          {recipients.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-2 text-xs">
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
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {recipients.map((r) => {
                  const acc = r.accounts as { name: string; contact_name: string | null } | null
                  const statusIcons: Record<string, React.ReactNode> = {
                    sent:     <CheckCircle className="w-3 h-3 text-green-600" />,
                    pending:  <Clock className="w-3 h-3 text-amber-500" />,
                    failed:   <CheckCircle className="w-3 h-3 text-red-500" />,
                    no_phone: <PhoneOff className="w-3 h-3 text-muted-foreground" />,
                  }
                  const statusIcon = statusIcons[r.status]

                  return (
                    <div key={r.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/40">
                      {statusIcon}
                      <span className="flex-1 truncate font-medium">{acc?.name ?? "—"}</span>
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
