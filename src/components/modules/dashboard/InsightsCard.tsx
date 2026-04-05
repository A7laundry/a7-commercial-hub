"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Insight } from "@/lib/insights"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Lightbulb,
} from "lucide-react"

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    ring: "hover:border-red-300",
  },
  warning: {
    icon: AlertTriangle,
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    ring: "hover:border-amber-300",
  },
  info: {
    icon: Info,
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    ring: "hover:border-blue-300",
  },
}

type Props = {
  insights: Insight[]
  isLoading?: boolean
}

export function InsightsCard({ insights, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Inteligência Operacional</p>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <span className="text-lg">✓</span>
          </div>
          <p className="text-sm font-medium text-green-700">Tudo em ordem</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum padrão crítico detectado no momento.</p>
        </div>
      </div>
    )
  }

  const criticalCount = insights.filter((i) => i.severity === "critical").length

  return (
    <div className="rounded-xl border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Inteligência Operacional</p>
        </div>
        {criticalCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Insight rows */}
      <div className="space-y-2">
        {insights.map((insight) => {
          const cfg = SEVERITY_CONFIG[insight.severity]
          const Icon = cfg.icon
          return (
            <Link
              key={insight.id}
              href={insight.href}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border border-transparent transition-all",
                cfg.ring,
                "hover:bg-muted/40 group"
              )}
            >
              {/* Severity dot */}
              <div className="mt-1.5 shrink-0">
                <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{insight.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{insight.description}</p>
                {insight.value && (
                  <span className={cn("inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border", cfg.badge)}>
                    {insight.value}
                  </span>
                )}
              </div>

              {/* Action */}
              <div className="shrink-0 flex items-center gap-1 text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                {insight.actionLabel}
                <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
