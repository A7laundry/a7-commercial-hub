"use client"

import {
  computeNextBestAction,
  computeCommercialScore,
} from "@/lib/commercial-intelligence"
import type { Account, Contract } from "@/types"
import { cn } from "@/lib/utils"
import { ArrowRight, Zap, AlertCircle } from "lucide-react"

type Props = {
  account: Account
  contracts: Contract[]
}

// Static priority config — outside component (rerender-no-inline-components pattern)
const PRIORITY_STYLE = {
  urgent: {
    border: "border-red-200",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    icon: AlertCircle,
    iconColor: "text-red-600",
    badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
    accentBar: "bg-red-500",
    label: "Urgente",
  },
  high: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    icon: Zap,
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    accentBar: "bg-amber-400",
    label: "Alta prioridade",
  },
  normal: {
    border: "border-border",
    bg: "bg-[#f8f9fa]",
    iconBg: "bg-white",
    icon: ArrowRight,
    iconColor: "text-[#022448]/60",
    badge: "bg-white text-slate-500 ring-1 ring-slate-200",
    accentBar: "bg-slate-200",
    label: "Recomendado",
  },
} as const

export function NextBestAction({ account, contracts }: Props) {
  const score = computeCommercialScore(account, contracts)
  const nba = computeNextBestAction(account, contracts, score)

  const style = PRIORITY_STYLE[nba.priority]
  const Icon = style.icon

  return (
    <div className={cn(
      "rounded-xl border shadow-[0_2px_16px_rgba(2,36,72,0.06)] overflow-hidden",
      style.border, style.bg
    )}>
      {/* top accent */}
      <div className={cn("h-1 w-full", style.accentBar)} />

      <div className="flex items-start gap-3 p-4">
        <div className={cn("p-2.5 rounded-lg shrink-0 shadow-sm", style.iconBg)}>
          <Icon className={cn("w-4 h-4", style.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Próxima Melhor Ação
            </span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", style.badge)}>
              {style.label}
            </span>
          </div>
          <p className="text-sm font-bold text-[#022448] mb-0.5">{nba.label}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{nba.description}</p>
        </div>
      </div>
    </div>
  )
}
