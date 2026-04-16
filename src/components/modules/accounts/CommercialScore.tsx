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

// Urgency bar color per score (static, outside component)
const SCORE_BAR: Record<string, string> = {
  at_risk: "bg-red-500",
  hot:     "bg-amber-400",
  upsell:  "bg-emerald-500",
  warm:    "bg-yellow-400",
  cold:    "bg-blue-300",
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
      <span className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1",
        cfg.bg, cfg.color,
        score === "at_risk" ? "ring-red-200" :
        score === "hot"     ? "ring-amber-200" :
        score === "upsell"  ? "ring-emerald-200" :
        score === "warm"    ? "ring-yellow-200" : "ring-blue-200"
      )}>
        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className={cn(
      "crm-card flex items-center gap-3 rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden",
      cfg.bg
    )}>
      {/* left accent bar */}
      <div className={cn("w-1 self-stretch shrink-0", SCORE_BAR[score])} />
      <div className="flex items-center gap-3 py-3 pr-4">
        <div className="p-2 rounded-lg bg-white/60 shadow-sm">
          <Icon className={cn("w-5 h-5", cfg.color)} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score Comercial</p>
          <p className={cn("text-base font-extrabold", cfg.color)}>{cfg.label}</p>
        </div>
      </div>
    </div>
  )
}
