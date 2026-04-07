"use client"

import { useCampaignDashboard } from "@/hooks/campaigns/useCampaignDashboard"
import { useTenant } from "@/hooks/useTenant"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Megaphone, Send, Users, CheckCircle2, TrendingUp,
  Clock, PhoneOff, BarChart2,
} from "lucide-react"
import { formatDateBR } from "@/lib/format"

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

const TYPE_EMOJI: Record<string, string> = {
  reactivation: "🔴",
  follow_up:    "📞",
  upsell:       "💰",
  renewal:      "🔄",
  custom:       "✏️",
  birthday:     "🎂",
  risk:         "🚨",
  acquisition:  "🌱",
  recurrence:   "⭐",
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:           { label: "Rascunho",       color: "bg-slate-100 text-slate-600" },
  active:          { label: "Enviada",         color: "bg-green-100 text-green-700" },
  partial_failure: { label: "Parcial",         color: "bg-amber-100 text-amber-700" },
  failed:          { label: "Falhou",          color: "bg-red-100 text-red-700" },
  completed:       { label: "Concluída",       color: "bg-blue-100 text-blue-700" },
  cancelled:       { label: "Cancelada",       color: "bg-red-100 text-red-700" },
}

export function CampaignDashboard() {
  const { tenant } = useTenant()
  const { data, isPending: isLoading } = useCampaignDashboard(tenant.id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  const { stats, recentCampaigns } = data

  const kpis = [
    {
      label: "Total de campanhas",
      value: stats.totalCampaigns,
      icon: Megaphone,
      sub: `${stats.activeCampaigns} ativas · ${stats.draftCampaigns} rascunhos`,
      color: "text-primary",
    },
    {
      label: "Mensagens enviadas",
      value: stats.totalSent.toLocaleString("pt-BR"),
      icon: Send,
      sub: `de ${stats.totalRecipients} destinatários`,
      color: "text-green-600",
    },
    {
      label: "Aceitos pela API",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      sub: stats.successRate === 0 && stats.totalSent === 0 ? "nenhum enviado ainda" : `${stats.noPhoneRecipients} sem telefone`,
      color: stats.successRate >= 80 ? "text-green-600" : stats.successRate >= 50 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Sem telefone",
      value: stats.noPhoneRecipients.toLocaleString("pt-BR"),
      icon: PhoneOff,
      sub: "destinatários sem número",
      color: "text-muted-foreground",
    },
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("w-4 h-4", kpi.color)} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
              </div>
              <p className={cn("text-2xl font-bold", kpi.color)} suppressHydrationWarning>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Campaigns table */}
      {recentCampaigns.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Campanhas recentes</h3>
            </div>
          </div>
          <div className="divide-y">
            {recentCampaigns.map((c) => {
              const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft
              const rate = c.totalCount > 0 ? Math.round((c.sentCount / c.totalCount) * 100) : 0
              const createdAt = formatDateBR(c.created_at)
              return (
                <Link key={c.id} href={`/campaigns/${c.id}`} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <span className="text-base shrink-0">{TYPE_EMOJI[c.type] ?? "📢"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0", statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground border rounded-full px-1.5 py-0.5 shrink-0">
                        {TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />{c.totalCount} destinatários
                      </span>
                      {c.sentCount > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-2.5 h-2.5" />{c.sentCount} enviados
                        </span>
                      )}
                      {c.pendingCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-2.5 h-2.5" />{c.pendingCount} pendentes
                        </span>
                      )}
                      <span>{createdAt}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {c.totalCount > 0 && (
                    <div className="shrink-0 w-24 text-right">
                      <p className="text-xs font-bold text-green-600">{rate}%</p>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-24">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {recentCampaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <Megaphone className="w-10 h-10 opacity-30 mb-3" />
          <p className="text-sm">Nenhuma campanha executada ainda</p>
          <p className="text-xs mt-1 opacity-70">Os dados aparecem após a primeira campanha.</p>
        </div>
      )}
    </div>
  )
}
