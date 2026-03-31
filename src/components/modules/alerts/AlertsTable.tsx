"use client"

import { useTransition } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import { acknowledgeAlert, resolveAlert } from "@/app/(app)/alerts/actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import type { Alert } from "@/types"

const SEVERITY_CONFIG = {
  info: { className: "bg-blue-100 text-blue-800", label: "Info" },
  warning: { className: "bg-amber-100 text-amber-800", label: "Atenção" },
  critical: { className: "bg-red-100 text-red-800", label: "Crítico" },
} as const

const STATUS_CONFIG = {
  open: { className: "bg-red-50 text-red-700", label: "Aberto" },
  acknowledged: { className: "bg-amber-50 text-amber-700", label: "Reconhecido" },
  resolved: { className: "bg-green-50 text-green-700", label: "Resolvido" },
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
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Alerta</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Conta</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Gravidade</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity]
            const sta = STATUS_CONFIG[alert.status]
            return (
              <tr key={alert.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium max-w-[280px]">
                  <span className="line-clamp-2">{alert.title}</span>
                  {alert.contract_id && (
                    <Link
                      href={`/contracts/${alert.contract_id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver contrato
                    </Link>
                  )}
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {alert.account_id ? (
                    <Link href={`/accounts/${alert.account_id}`} className="hover:underline">
                      {alert.account_name ?? "—"}
                    </Link>
                  ) : "—"}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sev.className}`}>
                    {sev.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sta.className}`}>
                    {sta.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 justify-end">
                    {alert.status === "open" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
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
                        className="h-7 w-7"
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
