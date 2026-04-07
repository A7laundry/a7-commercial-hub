"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTenant } from "@/hooks/useTenant"
import { useOperatorDailyActivity } from "@/hooks/dashboard/useOperatorDailyActivity"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrencyBR } from "@/lib/format"

export function OperatorPerformanceCard() {
  const { tenant } = useTenant()
  const { data, isPending } = useOperatorDailyActivity(tenant.id)

  // Compute max revenue for proportional bar widths
  const maxRevenue = data.length > 0 ? Math.max(...data.map((op) => op.revenue)) : 1

  return (
    <Card className="shadow-[0_24px_40px_rgba(25,28,29,0.03)] border-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-extrabold font-headline text-[#022448]">
          Performance por Operador
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum dado de operador disponível
          </p>
        ) : (
          <div className="space-y-6">
            {data.map((operator) => {
              const pct = maxRevenue > 0 ? (operator.revenue / maxRevenue) * 100 : 0
              return (
                <div key={operator.operator_name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[13px] font-semibold text-slate-700"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {operator.operator_name}
                    </span>
                    <span
                      className="text-[13px] font-semibold text-slate-700 tabular-nums"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatCurrencyBR(operator.revenue)}
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: "12px", backgroundColor: "#f3f4f5" }}
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${operator.operator_name}: ${formatCurrencyBR(operator.revenue)}`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: "#F5A623",
                      }}
                    />
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
