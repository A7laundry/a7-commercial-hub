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

// Static maps — outside component
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

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:           { label: "Rascunho", color: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",  dot: "bg-slate-400" },
  active:          { label: "Enviada",  color: "bg-green-100 text-green-700 ring-1 ring-green-200",  dot: "bg-green-500" },
  partial_failure: { label: "Parcial",  color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",  dot: "bg-amber-400" },
  failed:          { label: "Falhou",   color: "bg-red-100 text-red-700 ring-1 ring-red-200",        dot: "bg-red-500"   },
  completed:       { label: "Concluída",color: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",     dot: "bg-blue-500"  },
  cancelled:       { label: "Cancelada",color: "bg-red-100 text-red-700 ring-1 ring-red-200",        dot: "bg-red-400"   },
}

export function CampaignDashboard() {
  const { tenant } = useTenant()
  const { data, isPending: isLoading } = useCampaignDashboard(tenant.id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  const { stats, recentCampaigns } = data

  const kpis = [
    {
      label: "Total",
      value: stats.totalCampaigns,
      icon: Megaphone,
      sub: `${stats.activeCampaigns} ativas · ${stats.draftCampaigns} rascunhos`,
      color: "text-[#022448]",
      iconBg: "bg-[#022448]/8",
    },
    {
      label: "Mensagens enviadas",
      value: stats.totalSent.toLocaleString("pt-BR"),
      icon: Send,
      sub: `de ${stats.totalRecipients} destinatários`,
      color: "text-emerald-700",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Taxa de entrega",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      sub: stats.successRate === 0 && stats.totalSent === 0 ? "nenhum enviado ainda" : `${stats.noPhoneRecipients} sem telefone`,
      color: stats.successRate >= 80 ? "text-green-600" : stats.successRate >= 50 ? "text-amber-600" : "text-red-600",
      iconBg: stats.successRate >= 80 ? "bg-green-100" : stats.successRate >= 50 ? "bg-amber-100" : "bg-red-100",
    },
    {
      label: "Sem telefone",
      value: stats.noPhoneRecipients.toLocaleString("pt-BR"),
      icon: PhoneOff,
      sub: "destinatários sem número",
      color: "text-muted-foreground",
      iconBg: "bg-slate-100",
    },
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 rounded-lg", kpi.iconBg)}>
                  <Icon className={cn("w-3.5 h-3.5", kpi.color)} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{kpi.label}</p>
              </div>
              <p className={cn("text-2xl font-extrabold", kpi.color)} suppressHydrationWarning>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Campaigns table */}
      {recentCampaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-[#f8f9fa]">
            <div className="p-1.5 rounded-lg bg-[#022448]/8">
              <BarChart2 className="w-3.5 h-3.5 text-[#022448]" />
            </div>
            <h3 className="text-sm font-extrabold font-headline text-[#022448]">Campanhas recentes</h3>
          </div>
          <div className="divide-y divide-[#022448]/6">
            {recentCampaigns.map((c) => {
              const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft
              const rate = c.totalCount > 0 ? Math.round((c.sentCount / c.totalCount) * 100) : 0
              const createdAt = formatDateBR(c.created_at)
              return (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="px-4 py-3.5 flex items-center gap-3 hover:bg-[#f8f9fa] transition-colors"
                >
                  <span className="text-base shrink-0">{TYPE_EMOJI[c.type] ?? "📢"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#022448] truncate">{c.name}</p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1", statusCfg.color)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                        {statusCfg.label}
                      </span>
                      <span className="text-[10px] font-semibold text-[#022448]/60 bg-[#022448]/8 ring-1 ring-[#022448]/10 rounded-full px-2 py-0.5 shrink-0">
                        {TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />{c.totalCount} destinatários
                      </span>
                      {c.sentCount > 0 && (
                        <span className="flex items-center gap-1 text-green-600 font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />{c.sentCount} enviados
                        </span>
                      )}
                      {c.pendingCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <Clock className="w-2.5 h-2.5" />{c.pendingCount} pendentes
                        </span>
                      )}
                      <span>{createdAt}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {c.totalCount > 0 && (
                    <div className="shrink-0 w-24 text-right">
                      <p className="text-xs font-extrabold text-emerald-700">{rate}%</p>
                      <div className="mt-1 h-1.5 bg-[#022448]/8 rounded-full overflow-hidden w-24">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[#022448]/8 flex items-center justify-center mb-3">
            <Megaphone className="w-7 h-7 text-[#022448]/30" />
          </div>
          <p className="text-sm font-medium text-[#022448]/60">Nenhuma campanha executada ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Os dados aparecem após a primeira campanha.</p>
        </div>
      )}
    </div>
  )
}
