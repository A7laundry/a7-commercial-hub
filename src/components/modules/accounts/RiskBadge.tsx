import type { RiskLevel } from "@/lib/account-summary"

const CONFIG = {
  high: {
    label: "Risco alto",
    className: "bg-red-100 text-red-800 border border-red-200",
    dot: "bg-red-500",
  },
  medium: {
    label: "Risco médio",
    className: "bg-amber-100 text-amber-800 border border-amber-200",
    dot: "bg-amber-400",
  },
  low: {
    label: "Risco baixo",
    className: "bg-green-100 text-green-800 border border-green-200",
    dot: "bg-green-500",
  },
} as const

type RiskBadgeProps = {
  level: RiskLevel
  size?: "sm" | "md" | "lg"
}

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const { label, className, dot } = CONFIG[level]

  const sizeClass =
    size === "sm"
      ? "text-xs px-2 py-0.5"
      : size === "lg"
      ? "text-sm px-3 py-1.5"
      : "text-xs px-2.5 py-1"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${className} ${sizeClass}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
