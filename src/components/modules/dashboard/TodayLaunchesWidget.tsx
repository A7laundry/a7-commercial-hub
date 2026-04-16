"use client"

import Link from "next/link"
import { TrendingUp, ArrowRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useOperatorDailyActivity } from "@/hooks/dashboard/useOperatorDailyActivity"
import { formatCurrencyBR } from "@/lib/format"

export function TodayLaunchesWidget({ tenantId }: { tenantId: string }) {
  const { data, isPending } = useOperatorDailyActivity(tenantId)

  const totalSales = data.reduce((sum, op) => sum + op.total_sales, 0)
  const totalRevenue = data.reduce((sum, op) => sum + op.revenue, 0)
  const totalInteractions = data.reduce((sum, op) => sum + op.total_interactions, 0)

  if (isPending) return (
    <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl border border-[#022448]/10 shadow-sm">
      <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
      <Skeleton className="h-3 w-52" />
      <Skeleton className="h-3 w-24 ml-auto" />
    </div>
  )
  if (totalInteractions === 0) {
    return (
      <Link
        href="/dashboard/daily"
        className="flex items-center justify-between gap-4 px-5 py-3 bg-white rounded-xl border border-[#022448]/10 shadow-sm hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#022448]/6">
            <TrendingUp className="w-4 h-4 text-[#022448]" />
          </div>
          <div>
            <p className="text-sm font-extrabold font-headline text-[#022448]">Lançamentos de hoje</p>
            <p className="text-xs text-muted-foreground">Nenhum lançamento registrado ainda</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-[#F5A623] transition-colors shrink-0">
          Abrir fechamento <ArrowRight className="w-3 h-3" />
        </span>
      </Link>
    )
  }

  return (
    <Link
      href="/dashboard/daily"
      className="flex items-center justify-between gap-4 px-5 py-3 bg-white rounded-xl border border-[#022448]/10 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-emerald-50">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-extrabold font-headline text-[#022448]">Lançamentos de hoje</p>
          <p className="text-xs text-muted-foreground">
            {totalInteractions} interaç{totalInteractions === 1 ? "ão" : "ões"} ·{" "}
            {totalSales} venda{totalSales !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receita hoje</p>
          <p className="text-base font-extrabold text-emerald-700 tabular-nums leading-tight">
            {formatCurrencyBR(totalRevenue)}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-[#F5A623] transition-colors shrink-0">
          Ver fechamento <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  )
}
