"use client"

import { Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { useTenant } from "@/hooks/useTenant"
import { useOperatorDailyActivity } from "@/hooks/dashboard/useOperatorDailyActivity"
import { formatCurrencyBR } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { OperatorActivity } from "@/hooks/dashboard/useOperatorDailyActivity"

// Static status config — outside component
const STATUS_CONFIG: Record<OperatorActivity["status"], { label: string; className: string; dot: string }> = {
  active:    { label: "Ativo",    className: "bg-green-100 text-green-700 ring-1 ring-green-200",   dot: "bg-green-500" },
  attention: { label: "Atenção",  className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",   dot: "bg-amber-400" },
  inactive:  { label: "Inativo",  className: "bg-red-100 text-red-600 ring-1 ring-red-200",         dot: "bg-red-400" },
}

export function OperatorUsageCard() {
  const { tenant } = useTenant()
  const { data, isPending, activeCount, inactiveCount } = useOperatorDailyActivity(tenant.id)

  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#022448]/8">
            <Users className="h-3.5 w-3.5 text-[#022448]" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">Operadores hoje</h3>
        </div>
        {!isPending && data.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-green-700">{activeCount} ativos</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-bold text-red-600">{inactiveCount} inativos</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
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
                  className="flex items-center gap-3 rounded-xl border border-[#022448]/8 px-3 py-2.5 bg-[#f8f9fa]/50 hover:bg-[#f8f9fa] transition-colors"
                >
                  {/* Avatar */}
                  <UserAvatar displayName={operator.operator_name} size={32} />

                  {/* Name + status badge */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#022448]">
                      {operator.operator_name}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                      statusCfg.className
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex shrink-0 items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interações</p>
                      <p className="text-sm font-extrabold text-[#022448]">{operator.total_interactions}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendas</p>
                      <p className="text-sm font-extrabold text-[#022448]">{operator.total_sales}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receita</p>
                      <p className="text-sm font-extrabold text-emerald-700 tabular-nums">
                        {formatCurrencyBR(operator.revenue)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Extracted skeleton — outside parent component (rendering-no-inline-components pattern)
function OperatorUsageSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Carregando operadores">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-[#022448]/8 px-3 py-2.5">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
