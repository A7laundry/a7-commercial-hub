"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { computeCommercialScore, computeNextBestAction, computeLTV, SCORE_CONFIG, daysSince } from "@/lib/commercial-intelligence"
import type { Account } from "@/types"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { cn } from "@/lib/utils"
import { DollarSign, Clock, Zap, PlayCircle } from "lucide-react"

const POTENTIAL_LABEL: Record<string, string> = {
  hot:     "Alto",
  upsell:  "Alto",
  warm:    "Médio",
  cold:    "Baixo",
  at_risk: "Crítico",
}

const POTENTIAL_COLOR: Record<string, string> = {
  hot:     "text-green-700",
  upsell:  "text-emerald-700",
  warm:    "text-yellow-700",
  cold:    "text-blue-700",
  at_risk: "text-red-700",
}

type Props = {
  accounts: Account[]
  isLoading?: boolean
  onActivate?: (id: string) => Promise<void>
}

export function AccountCardGrid({ accounts, isLoading, onActivate }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} onActivate={onActivate} />
      ))}
    </div>
  )
}

const URGENCY_LEFT: Record<string, string> = {
  urgent: "bg-red-500",
  high:   "bg-amber-400",
  normal: "bg-transparent",
}

function AccountCard({
  account,
  onActivate,
}: {
  account: Account
  onActivate?: (id: string) => Promise<void>
}) {
  const router = useRouter()
  const [activating, startActivate] = useTransition()
  const score = computeCommercialScore(account, [])
  const nba = computeNextBestAction(account, [], score)
  const cfg = SCORE_CONFIG[score]
  const days = daysSince(account.last_contact_at)
  const ltv = computeLTV(account)
  const isDormant = account.in_pipeline === false

  return (
    <div className={cn(
      "crm-card bg-white border rounded-xl overflow-hidden shadow-[0_2px_16px_rgba(2,36,72,0.07)] flex flex-col",
      isDormant ? "border-slate-200 opacity-80" : "border-transparent"
    )}>
      {/* Urgency bar — only for active pipeline accounts */}
      {!isDormant && <div className={cn("h-1 w-full shrink-0", URGENCY_LEFT[nba.priority])} />}
      {isDormant  && <div className="h-1 w-full shrink-0 bg-slate-200" />}

      <Link href={`/accounts/${account.id}`} className="flex flex-col gap-3 p-4 flex-1 cursor-pointer">
        {/* Header: avatar + name + score badge */}
        <div className="flex items-start gap-3">
          <UserAvatar displayName={account.name} size={36} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#022448] leading-tight line-clamp-2">{account.name}</p>
            {account.segment && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{account.segment}</p>
            )}
          </div>
          {isDormant ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap mt-0.5 bg-slate-100 text-slate-500">
              INATIVO
            </span>
          ) : (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap mt-0.5",
              cfg.bg, cfg.color
            )}>
              {cfg.label.toUpperCase()}
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="space-y-1.5 flex-1">
          {ltv != null && (
            <div className="flex items-center gap-1.5 text-xs">
              <DollarSign className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">LTV:</span>
              <span className="font-semibold text-emerald-700" suppressHydrationWarning>
                {ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Último contato:</span>
            <span className={cn(
              "font-medium",
              days === null ? "text-muted-foreground" :
              days === 0 ? "text-green-600" :
              days > 30 ? "text-red-600" :
              days > 14 ? "text-amber-600" : "text-foreground"
            )} suppressHydrationWarning>
              {days === null ? "—" : days === 0 ? "hoje" : `${days}d`}
            </span>
          </div>
        </div>

        {/* NBA chip — only for pipeline accounts */}
        {!isDormant && (
          <div className={cn(
            "flex items-start gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium",
            nba.priority === "urgent" ? "bg-red-50 text-red-700 border border-red-100" :
            nba.priority === "high"   ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                        "bg-slate-50 text-slate-600 border border-slate-100"
          )}>
            <Zap className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="leading-tight">{nba.label}</span>
          </div>
        )}
      </Link>

      {/* Ativar button — only for dormant accounts */}
      {isDormant && onActivate && (
        <div className="px-4 pb-4">
          <button
            type="button"
            disabled={activating}
            onClick={() => {
              startActivate(async () => {
                await onActivate(account.id)
                router.push("/pipeline")
              })
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white bg-[#022448] hover:bg-[#022448]/90 transition-colors disabled:opacity-60"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            {activating ? "Ativando..." : "Ativar no pipeline"}
          </button>
        </div>
      )}
    </div>
  )
}
