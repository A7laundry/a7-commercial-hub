"use client"

import { useState, useEffect, useTransition } from "react"
import { Bell } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useAlerts } from "@/hooks/alerts/useAlerts"
import { useQueryClient } from "@tanstack/react-query"
import { generateAlerts } from "./actions"
import { AlertsTable } from "@/components/modules/alerts/AlertsTable"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AlertStatus } from "@/types"

export default function AlertsPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("all")
  const [generating, startGenerate] = useTransition()

  const { data: alerts = [], isPending: isLoading, error } = useAlerts(tenant.id, {
    status: statusFilter,
  })

  // Auto-generate alerts on mount
  useEffect(() => {
    startGenerate(async () => {
      await generateAlerts()
      qc.invalidateQueries({ queryKey: ["alerts", tenant.id] })
      qc.invalidateQueries({ queryKey: ["alerts:open-count", tenant.id] })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id])

  function handleRefresh() {
    startGenerate(async () => {
      await generateAlerts()
      qc.invalidateQueries({ queryKey: ["alerts", tenant.id] })
      qc.invalidateQueries({ queryKey: ["alerts:open-count", tenant.id] })
    })
  }

  return (
    <div>
      <PageHeader
        title="Alertas"
        description="Monitoramento de contratos e documentos"
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={generating}>
            {generating ? "Atualizando..." : "Atualizar alertas"}
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as AlertStatus | "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="acknowledged">Reconhecidos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {alerts.length} alerta{alerts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Erro ao carregar alertas.</p>
      ) : !isLoading && alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhum alerta"
          description={
            statusFilter !== "all"
              ? "Nenhum alerta com esse status."
              : "Tudo em ordem! Nenhum alerta ativo no momento."
          }
        />
      ) : (
        <AlertsTable
          alerts={alerts}
          isLoading={isLoading}
          onChanged={() => qc.invalidateQueries({ queryKey: ["alerts", tenant.id] })}
        />
      )}
    </div>
  )
}
