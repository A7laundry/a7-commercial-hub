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
  CheckCircle2,
} from "lucide-react"

// Static severity config — outside component
const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    rowHover: "hover:border-red-200 hover:bg-red-50/50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    rowHover: "hover:border-amber-200 hover:bg-amber-50/50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  info: {
    icon: Info,
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    rowHover: "hover:border-blue-200 hover:bg-blue-50/50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
}

type Props = {
  insights: Insight[]
  isLoading?: boolean
}

export function InsightsCard({ insights, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-[#f8f9fa]">
          <div className="w-7 h-7 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-[#f8f9fa] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-[#f8f9fa]">
          <div className="p-1.5 rounded-lg bg-amber-100">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">Inteligência Operacional</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center p-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm font-bold text-green-700">Tudo em ordem</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum padrão crítico detectado no momento.</p>
        </div>
      </div>
    )
  }

  const criticalCount = insights.filter((i) => i.severity === "critical").length

  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">Inteligência Operacional</h3>
        </div>
        {criticalCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 ring-1 ring-red-200">
            {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Insight rows */}
      <div className="p-4 space-y-1.5">
        {insights.map((insight) => {
          const cfg = SEVERITY_CONFIG[insight.severity]
          const Icon = cfg.icon
          return (
            <Link
              key={insight.id}
              href={insight.href}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border border-transparent transition-all group",
                cfg.rowHover
              )}
            >
              {/* Severity icon */}
              <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", cfg.iconBg)}>
                <Icon className={cn("w-3.5 h-3.5", cfg.iconColor)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#022448] leading-tight">{insight.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{insight.description}</p>
                {insight.value && (
                  <span className={cn("inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.badge)}>
                    {insight.value}
                  </span>
                )}
              </div>

              {/* Action — appears on hover */}
              <div className="shrink-0 flex items-center gap-1 text-[11px] text-[#F5A623] font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
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
