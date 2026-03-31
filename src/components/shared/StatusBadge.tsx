import { Badge } from "@/components/ui/badge"
import type { AccountStatus, ContractStatus } from "@/types"

type AnyStatus = AccountStatus | ContractStatus

const CONFIG: Record<AnyStatus, { label: string; className: string }> = {
  // account
  active:     { label: "Ativo",      className: "bg-green-100 text-green-800 border-green-200" },
  inactive:   { label: "Inativo",    className: "bg-gray-100 text-gray-600 border-gray-200" },
  prospect:   { label: "Prospect",   className: "bg-blue-100 text-blue-800 border-blue-200" },
  // contract
  draft:      { label: "Rascunho",   className: "bg-gray-100 text-gray-600 border-gray-200" },
  expiring:   { label: "Vencendo",   className: "bg-amber-100 text-amber-800 border-amber-200" },
  expired:    { label: "Vencido",    className: "bg-red-100 text-red-800 border-red-200" },
  cancelled:  { label: "Cancelado",  className: "bg-gray-100 text-gray-500 border-gray-200" },
}

export function StatusBadge({ status }: { status: AnyStatus }) {
  const cfg = CONFIG[status] ?? { label: status, className: "" }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  )
}
