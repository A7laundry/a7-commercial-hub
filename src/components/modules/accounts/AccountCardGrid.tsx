"use client"

import Link from "next/link"
import { computeCommercialScore, computeNextBestAction, computeLTV, SCORE_CONFIG, daysSince } from "@/lib/commercial-intelligence"
import type { Account } from "@/types"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { DollarSign, Clock, Zap } from "lucide-react"

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
}

export function AccountCardGrid({ accounts, isLoading }: Props) {
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
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  )
}

function AccountCard({ account }: { account: Account }) {
  const score = computeCommercialScore(account, [])
  const nba = computeNextBestAction(account, [], score)
  const cfg = SCORE_CONFIG[score]
  const days = daysSince(account.last_contact_at)
  const ltv = computeLTV(account)

  const priorityBorder = {
    urgent: "border-l-red-500",
    high:   "border-l-amber-500",
    normal: "border-l-border",
  }[nba.priority]

  return (
    <Link href={`/accounts/${account.id}`}>
      <div className={cn(
        "bg-card border border-l-4 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer h-full flex flex-col gap-3",
        priorityBorder
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight line-clamp-2 flex-1">{account.name}</p>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap",
            cfg.bg, cfg.color
          )}>
            {cfg.label.toUpperCase()}
          </span>
        </div>

        {/* Metrics */}
        <div className="space-y-1.5">
          {ltv != null && (
            <div className="flex items-center gap-1.5 text-xs">
              <DollarSign className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">LTV:</span>
              <span className="font-semibold text-green-700">
                {ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Potencial:</span>
            <span className={cn("font-semibold", POTENTIAL_COLOR[score])}>
              {POTENTIAL_LABEL[score]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Último contato:</span>
            <span className={cn(
              "font-medium",
              days === null ? "text-muted-foreground" :
              days === 0 ? "text-green-600" :
              days > 30 ? "text-red-600" :
              days > 14 ? "text-amber-600" : "text-foreground"
            )}>
              {days === null ? "—" : days === 0 ? "hoje" : `${days}d`}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className={cn(
          "mt-auto flex items-start gap-1.5 text-xs px-2 py-1.5 rounded-md",
          nba.priority === "urgent" ? "bg-red-50 text-red-700" :
          nba.priority === "high"   ? "bg-amber-50 text-amber-700" :
                                      "bg-muted/60 text-muted-foreground"
        )}>
          <Zap className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="font-medium leading-tight">{nba.label}</span>
        </div>
      </div>
    </Link>
  )
}
