"use client"

import { use } from "react"
import Link from "next/link"
import { useTenant } from "@/hooks/useTenant"
import { useCampaigns, useCampaignRecipients } from "@/hooks/campaigns/useCampaigns"
import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, PhoneOff,
  Users, Send, Building2, MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<string, string> = {
  reactivation: "Reativação", follow_up: "Follow-up", upsell: "Upsell",
  renewal: "Renovação", custom: "Livre", birthday: "Aniversário",
  risk: "Retenção", acquisition: "Prospecção", recurrence: "Recorrência",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:           { label: "Rascunho",  color: "bg-slate-100 text-slate-600",  dot: "bg-slate-400" },
  active:          { label: "Enviada",   color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  partial_failure: { label: "Parcial",   color: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  failed:          { label: "Falhou",    color: "bg-red-100 text-red-700",      dot: "bg-red-500" },
  completed:       { label: "Concluída", color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  cancelled:       { label: "Cancelada", color: "bg-red-100 text-red-700",      dot: "bg-red-400" },
}

const RECIPIENT_STATUS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sent:     { label: "Aceito pela API", icon: CheckCircle2, color: "text-green-600" },
  pending:  { label: "Pendente",        icon: Clock,        color: "text-amber-600" },
  failed:   { label: "Falhou",          icon: XCircle,      color: "text-red-600" },
  no_phone: { label: "Sem telefone",    icon: PhoneOff,     color: "text-muted-foreground" },
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { tenant } = useTenant()

  const { data: campaigns = [], isPending: isLoading } = useCampaigns(tenant.id)
  const { data: recipients = [], isPending: recipientsLoading } = useCampaignRecipients(tenant.id, id)

  const campaign = campaigns.find((c) => c.id === id) ?? null
  const statusCfg = campaign ? (STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft) : null

  const sentCount = recipients.filter((r) => r.status === "sent").length
  const failedCount = recipients.filter((r) => r.status === "failed").length
  const pendingCount = recipients.filter((r) => r.status === "pending").length
  const noPhoneCount = recipients.filter((r) => r.status === "no_phone").length
  const deliverable = sentCount + failedCount
  const acceptRate = deliverable > 0 ? Math.round((sentCount / deliverable) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={isLoading ? "Campanha" : (campaign?.name ?? "Campanha")}
        description={campaign ? `${TYPE_LABELS[campaign.type] ?? campaign.type} · criada em ${new Date(campaign.created_at).toLocaleDateString("pt-BR")}` : ""}
        actions={
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Campanhas
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !campaign ? (
        <p className="text-sm text-muted-foreground">Campanha não encontrada.</p>
      ) : (
        <div className="space-y-6">

          {/* Status + métricas */}
          <div className="border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {statusCfg && (
                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium", statusCfg.color)}>
                  <span className={cn("w-2 h-2 rounded-full", statusCfg.dot)} />
                  {statusCfg.label}
                </span>
              )}
              {campaign.executed_at && (
                <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                  Executada em {new Date(campaign.executed_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat icon={Users} label="Destinatários" value={recipients.length} />
              <Stat icon={Send} label="Aceitos pela API" value={sentCount} highlight="positive" />
              <Stat icon={XCircle} label="Falhas" value={failedCount} highlight={failedCount > 0 ? "negative" : undefined} />
              <Stat icon={CheckCircle2} label="Taxa de aceite" value={`${acceptRate}%`}
                highlight={acceptRate >= 80 ? "positive" : acceptRate >= 50 ? "warning" : acceptRate > 0 ? "negative" : undefined}
              />
            </div>

            {pendingCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
                {pendingCount} mensagen{pendingCount !== 1 ? "s" : ""} ainda {pendingCount !== 1 ? "estão" : "está"} pendente{pendingCount !== 1 ? "s" : ""} — podem ter ficado presas se o servidor reiniciou durante o envio.
              </p>
            )}
          </div>

          {/* Mensagem template */}
          <div className="border rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Mensagem enviada
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/40 rounded-lg px-4 py-3">
              {campaign.message_template}
            </p>
          </div>

          {/* Lista de destinatários */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              Destinatários ({recipients.length})
            </div>
            <Separator className="mb-3" />

            {recipientsLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum destinatário.</p>
            ) : (
              <div className="border rounded-lg divide-y overflow-hidden">
                {recipients.map((r) => {
                  const acc = r.accounts as { name?: string } | null
                  const rs = RECIPIENT_STATUS[r.status] ?? RECIPIENT_STATUS.pending
                  const Icon = rs.icon
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <Icon className={cn("w-4 h-4 shrink-0", rs.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {r.account_id ? (
                            <Link
                              href={`/accounts/${r.account_id}`}
                              className="text-sm font-medium hover:text-primary transition-colors truncate"
                            >
                              {acc?.name ?? "Conta"}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">{r.phone ?? "—"}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                          {r.phone && <span>{r.phone}</span>}
                          {r.sent_at && (
                            <span suppressHydrationWarning>
                              {new Date(r.sent_at).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn("text-xs font-medium shrink-0", rs.color)}>
                        {rs.label}
                      </span>
                      {r.account_id && (
                        <Link
                          href={`/accounts/${r.account_id}`}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          title="Ver conta"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Nota sobre delivered */}
          {sentCount > 0 && (
            <p className="text-[11px] text-muted-foreground border rounded-md px-3 py-2">
              <strong>Nota:</strong> "Aceito pela API" significa que o Meta recebeu a mensagem.
              Confirmação de entrega no dispositivo ("Entregue") e leitura ("Lido") são atualizadas
              automaticamente via webhook quando o WhatsApp retorna o status.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  highlight?: "positive" | "negative" | "warning"
}) {
  const valueClass =
    highlight === "positive" ? "text-green-600" :
    highlight === "negative" ? "text-red-600" :
    highlight === "warning"  ? "text-amber-600" :
    "text-foreground"

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={cn("text-2xl font-bold", valueClass)}>{value}</div>
    </div>
  )
}
