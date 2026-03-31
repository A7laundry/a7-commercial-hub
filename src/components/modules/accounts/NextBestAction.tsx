"use client"

import {
  computeNextBestAction,
  computeCommercialScore,
} from "@/lib/commercial-intelligence"
import type { Account, Contract } from "@/types"
import { cn } from "@/lib/utils"
import { ArrowRight, Zap, AlertCircle, TrendingUp } from "lucide-react"

type Props = {
  account: Account
  contracts: Contract[]
}

export function NextBestAction({ account, contracts }: Props) {
  const score = computeCommercialScore(account, contracts)
  const nba = computeNextBestAction(account, contracts, score)

  const priorityStyle = {
    urgent: {
      border: "border-red-200",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      icon: AlertCircle,
      iconColor: "text-red-600",
      badge: "bg-red-100 text-red-700",
    },
    high: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      icon: Zap,
      iconColor: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    },
    normal: {
      border: "border-border",
      bg: "bg-muted/30",
      iconBg: "bg-muted",
      icon: ArrowRight,
      iconColor: "text-muted-foreground",
      badge: "bg-muted text-muted-foreground",
    },
  }[nba.priority]

  const priorityLabel = {
    urgent: "Urgente",
    high: "Alta prioridade",
    normal: "Recomendado",
  }[nba.priority]

  const Icon = priorityStyle.icon

  return (
    <div className={cn("rounded-lg border p-4", priorityStyle.border, priorityStyle.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-md shrink-0", priorityStyle.iconBg)}>
          <Icon className={cn("w-4 h-4", priorityStyle.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Próxima Melhor Ação
            </span>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", priorityStyle.badge)}>
              {priorityLabel}
            </span>
          </div>
          <p className="text-sm font-semibold mb-0.5">{nba.label}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{nba.description}</p>
        </div>
      </div>
    </div>
  )
}
