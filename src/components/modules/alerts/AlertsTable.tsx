"use client"

import { useTransition } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import { acknowledgeAlert, resolveAlert } from "@/app/(app)/alerts/actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import type { Alert } from "@/types"

const SEVERITY_CONFIG = {
  info:     { className: "bg-blue-50  text-blue-700  ring-1 ring-blue-200",   label: "Info",    dot: "bg-blue-400" },
  warning:  { className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",  label: "Atenção", dot: "bg-amber-400" },
  critical: { className: "bg-red-50   text-red-700   ring-1 ring-red-200",    label: "Crítico", dot: "bg-red-500" },
} as const

const STATUS_CONFIG = {
  open:         { className: "bg-red-50   text-red-700   ring-1 ring-red-200",   label: "Aberto" },
  acknowledged: { className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", label: "Reconhecido" },
  resolved:     { className: "bg-green-50 text-green-700 ring-1 ring-green-200", label: "Resolvido" },
} as const

type AlertsTableProps = {
  alerts: Alert[]
  isLoading?: boolean
  onChanged?: () => void
}

export function AlertsTable({ alerts, isLoading, onChanged }: AlertsTableProps) {
  const [isPending, startTransition] = useTransition()

  function handleAcknowledge(id: string) {
    startTransition(async () => {
      await acknowledgeAlert(id)
      onChanged?.()
    })
  }

  function handleResolve(id: string) {
    startTransition(async () => {
      await resolveAlert(id)
      onChanged?.()
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    )
  }

  if (alerts.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-white shadow-[0_2px_16px_rgba(2,36,72,0.06)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[#f8f9fa]">
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alerta</th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conta</th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gravidade</th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity]
            const sta = STATUS_CONFIG[alert.status]
            return (
              <tr key={alert.id} className="border-b last:border-0 hover:bg-[#f8f9fa] transition-colors">
                <td className="py-3 px-4 font-medium max-w-[280px]">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 w-2 h-2 rounded-full ${sev.dot}`} />
                    <span className="line-clamp-2 text-[#022448]">{alert.title}</span>
                  </div>
                  {alert.contract_id && (
                    <Link
                      href={`/contracts/${alert.contract_id}`}
                      className="text-xs text-primary hover:underline ml-4"
                    >
                      Ver contrato →
                    </Link>
                  )}
                </td>
                <td className="py-3 px-4">
                  {alert.account_id ? (
                    <Link href={`/accounts/${alert.account_id}`} className="text-sm text-[#022448] hover:underline font-medium">
                      {alert.account_name ?? "—"}
                    </Link>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sev.className}`}>
                    {sev.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sta.className}`}>
                    {sta.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 justify-end">
                    {alert.status === "open" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-amber-50 hover:text-amber-600"
                        title="Reconhecer"
                        disabled={isPending}
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-amber-500" />
                      </Button>
                    )}
                    {alert.status !== "resolved" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-green-50 hover:text-green-600"
                        title="Resolver"
                        disabled={isPending}
                        onClick={() => handleResolve(alert.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
