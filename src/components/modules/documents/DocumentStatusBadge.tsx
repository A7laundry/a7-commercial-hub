import { deriveDocumentStatus } from "@/lib/utils"

const config = {
  valid: { label: "Válido", className: "bg-green-100 text-green-800" },
  expiring: { label: "Vencendo", className: "bg-amber-100 text-amber-800" },
  expired: { label: "Vencido", className: "bg-red-100 text-red-800" },
  no_expiry: { label: "Sem vencimento", className: "bg-slate-100 text-slate-600" },
} as const

export function DocumentStatusBadge({ expires_at }: { expires_at: string | null }) {
  const status = deriveDocumentStatus(expires_at)
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
