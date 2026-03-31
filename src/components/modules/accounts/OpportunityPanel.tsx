"use client"

import { computeOpportunitySignals } from "@/lib/commercial-intelligence"
import type { Account, Contract } from "@/types"
import { cn } from "@/lib/utils"
import { AlertTriangle, Info, XCircle } from "lucide-react"

type Props = {
  account: Account
  contracts: Contract[]
}

export function OpportunityPanel({ account, contracts }: Props) {
  const signals = computeOpportunitySignals(account, contracts)

  if (signals.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Info className="w-4 h-4 opacity-50" />
        Nenhum sinal de oportunidade detectado no momento.
      </div>
    )
  }

  const sevConfig = {
    critical: {
      icon: XCircle,
      iconColor: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700",
      label: "Crítico",
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      label: "Atenção",
    },
    info: {
      icon: Info,
      iconColor: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      label: "Info",
    },
  }

  return (
    <div className="space-y-2">
      {signals.map((signal) => {
        const cfg = sevConfig[signal.severity]
        const Icon = cfg.icon
        return (
          <div
            key={signal.id}
            className={cn("flex gap-3 p-3 rounded-md border", cfg.bg, cfg.border)}
          >
            <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", cfg.iconColor)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{signal.label}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cfg.badge)}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{signal.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
