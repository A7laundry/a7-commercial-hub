import { MessageSquare, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { RiskBadge } from "./RiskBadge"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/lib/account-summary"

type SmartSummaryBlockProps = {
  summary: string
  riskLevel: RiskLevel
  riskFactorLabels: string[]
}

// Static theme map — outside component to avoid re-creation on each render
const RISK_THEME = {
  high: {
    border: "border-red-200",
    bg: "bg-red-50",
    accentBar: "bg-red-500",
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconClass: "text-red-600",
    textClass: "text-red-900",
    factorClass: "bg-red-100 text-red-700 ring-1 ring-red-200",
  },
  medium: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    accentBar: "bg-amber-400",
    icon: Info,
    iconBg: "bg-amber-100",
    iconClass: "text-amber-600",
    textClass: "text-amber-900",
    factorClass: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  },
  low: {
    border: "border-green-200",
    bg: "bg-green-50",
    accentBar: "bg-emerald-500",
    icon: CheckCircle,
    iconBg: "bg-green-100",
    iconClass: "text-green-600",
    textClass: "text-green-900",
    factorClass: "bg-green-100 text-green-700 ring-1 ring-green-200",
  },
} as const

export function SmartSummaryBlock({
  summary,
  riskLevel,
  riskFactorLabels,
}: SmartSummaryBlockProps) {
  const theme = RISK_THEME[riskLevel]
  const Icon = theme.icon

  return (
    <div className={cn(
      "rounded-xl border shadow-[0_2px_16px_rgba(2,36,72,0.06)] overflow-hidden",
      theme.border, theme.bg
    )}>
      {/* top accent bar */}
      <div className={cn("h-1 w-full", theme.accentBar)} />

      <div className="flex items-start gap-4 p-5">
        <div className={cn("mt-0.5 shrink-0 p-2 rounded-lg shadow-sm", theme.iconBg)}>
          <Icon className={cn("h-5 w-5", theme.iconClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Análise executiva
            </p>
            <RiskBadge level={riskLevel} size="sm" />
          </div>

          <p className={cn("text-sm leading-relaxed font-medium", theme.textClass)}>
            {summary}
          </p>

          {riskFactorLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {riskFactorLabels.map((label) => (
                <span
                  key={label}
                  className={cn(
                    "inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full",
                    theme.factorClass
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
