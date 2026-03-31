"use client"

import { computeCommercialScore, SCORE_CONFIG } from "@/lib/commercial-intelligence"
import type { Account, Contract } from "@/types"
import { cn } from "@/lib/utils"
import { Flame, Thermometer, Snowflake, AlertTriangle, TrendingUp } from "lucide-react"

const SCORE_ICON = {
  hot:     Flame,
  warm:    Thermometer,
  cold:    Snowflake,
  at_risk: AlertTriangle,
  upsell:  TrendingUp,
}

type Props = {
  account: Account
  contracts: Contract[]
  size?: "sm" | "md"
}

export function CommercialScore({ account, contracts, size = "md" }: Props) {
  const score = computeCommercialScore(account, contracts)
  const cfg = SCORE_CONFIG[score]
  const Icon = SCORE_ICON[score]

  if (size === "sm") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-4 py-3 border", cfg.bg)}>
      <div className={cn("p-2 rounded-md bg-white/60")}>
        <Icon className={cn("w-5 h-5", cfg.color)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Score Comercial</p>
        <p className={cn("text-base font-bold", cfg.color)}>{cfg.label}</p>
      </div>
    </div>
  )
}
