import { MessageSquare, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { RiskBadge } from "./RiskBadge"
import type { RiskLevel } from "@/lib/account-summary"

type SmartSummaryBlockProps = {
  summary: string
  riskLevel: RiskLevel
  riskFactorLabels: string[]
}

const RISK_THEME = {
  high: {
    border: "border-red-200",
    bg: "bg-red-50",
    icon: AlertTriangle,
    iconClass: "text-red-500",
    textClass: "text-red-900",
    factorClass: "bg-red-100 text-red-700 border-red-200",
  },
  medium: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    icon: Info,
    iconClass: "text-amber-500",
    textClass: "text-amber-900",
    factorClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  low: {
    border: "border-green-200",
    bg: "bg-green-50",
    icon: CheckCircle,
    iconClass: "text-green-500",
    textClass: "text-green-900",
    factorClass: "bg-green-100 text-green-700 border-green-200",
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
    <div className={`rounded-xl border-2 ${theme.border} ${theme.bg} p-5`}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5 shrink-0">
          <Icon className={`h-6 w-6 ${theme.iconClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Análise executiva
            </p>
            <RiskBadge level={riskLevel} size="sm" />
          </div>
          <p className={`text-sm leading-relaxed font-medium ${theme.textClass}`}>{summary}</p>

          {riskFactorLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {riskFactorLabels.map((label) => (
                <span
                  key={label}
                  className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-medium ${theme.factorClass}`}
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
