"use client"

import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Contract } from "@/types"

// Status config — static, outside component
const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  active:    { label: "Ativo",      className: "bg-green-50 text-green-700 ring-1 ring-green-200",   dot: "bg-green-500" },
  draft:     { label: "Rascunho",   className: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",   dot: "bg-slate-400" },
  expiring:  { label: "Vencendo",   className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",   dot: "bg-amber-400" },
  expired:   { label: "Vencido",    className: "bg-red-50 text-red-700 ring-1 ring-red-200",         dot: "bg-red-500" },
  cancelled: { label: "Cancelado",  className: "bg-gray-50 text-gray-500 ring-1 ring-gray-200",     dot: "bg-gray-400" },
}

// Left bar accent per status
const STATUS_BAR: Record<string, string> = {
  active:    "bg-green-500",
  draft:     "bg-slate-300",
  expiring:  "bg-amber-400",
  expired:   "bg-red-500",
  cancelled: "bg-gray-300",
}

type ContractsTableProps = {
  contracts: Contract[]
  isLoading?: boolean
}

export function ContractsTable({ contracts, isLoading }: ContractsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-[0_2px_16px_rgba(2,36,72,0.06)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[#f8f9fa]">
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Título</th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conta</th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => {
            const sta = STATUS_CONFIG[contract.status] ?? { label: contract.status, className: "", dot: "bg-slate-400" }
            const bar = STATUS_BAR[contract.status] ?? "bg-slate-200"

            return (
              <tr key={contract.id} className="border-b last:border-0 hover:bg-[#f8f9fa] transition-colors group">
                <td className="py-3 px-4">
                  {/* left accent bar on hover */}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-0.5 h-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0", bar)} />
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-semibold text-[#022448] hover:text-[#F5A623] hover:underline transition-colors"
                    >
                      {contract.title}
                    </Link>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted-foreground font-medium">
                    {contract.account_name ?? "—"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-semibold text-[#022448]" suppressHydrationWarning>
                    {formatCurrency(contract.total_value, contract.currency)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={cn(
                    "text-sm font-medium",
                    contract.status === "expired"  ? "text-red-600" :
                    contract.status === "expiring" ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {formatDate(contract.ends_at)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
                    sta.className
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", sta.dot)} />
                    {sta.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
