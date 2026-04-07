"use client"

import { Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useTenant } from "@/hooks/useTenant"
import { useOperatorDailyActivity } from "@/hooks/dashboard/useOperatorDailyActivity"
import { formatCurrencyBR } from "@/lib/format"
import type { OperatorActivity } from "@/hooks/dashboard/useOperatorDailyActivity"

const STATUS_CONFIG: Record<
  OperatorActivity["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Ativo",
    className: "bg-green-100 text-green-700 border-transparent",
  },
  attention: {
    label: "Atenção",
    className: "bg-amber-100 text-amber-700 border-transparent",
  },
  inactive: {
    label: "Inativo",
    className: "bg-red-100 text-red-600 border-transparent",
  },
}

export function OperatorUsageCard() {
  const { tenant } = useTenant()
  const { data, isPending, activeCount, inactiveCount } = useOperatorDailyActivity(tenant.id)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Operadores hoje
        </CardTitle>
        {!isPending && data.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-green-700">{activeCount}</span> operadores ativos
            hoje ·{" "}
            <span className="font-semibold text-red-600">{inactiveCount}</span> sem atividade
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isPending ? (
          <OperatorUsageSkeleton />
        ) : data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum lançamento registrado hoje
          </p>
        ) : (
          <div className="space-y-2" role="list" aria-label="Lista de operadores">
            {data.map((operator) => {
              const statusCfg = STATUS_CONFIG[operator.status]
              return (
                <div
                  key={operator.operator_name}
                  role="listitem"
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  {/* Name + badge */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {operator.operator_name}
                    </span>
                    <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                  </div>

                  {/* Stats */}
                  <div className="flex shrink-0 items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">Interações</p>
                      <p className="text-sm font-semibold">{operator.total_interactions}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">Vendas</p>
                      <p className="text-sm font-semibold">{operator.total_sales}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrencyBR(operator.revenue)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OperatorUsageSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Carregando operadores">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
