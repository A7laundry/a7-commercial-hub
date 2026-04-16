"use client"

import { useState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { useDashboardPeriod, type PeriodType } from "@/hooks/dashboard/useDashboardPeriod"
import { useContracts } from "@/hooks/contracts/useContracts"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useDeals, DEAL_STAGE_CONFIG } from "@/hooks/deals/useDeals"
import type { DealStage } from "@/types"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Static period label map — outside component
const PERIOD_LABEL: Record<PeriodType, string> = {
  week:    "Semana",
  month:   "Mês",
  quarter: "Trimestre",
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export default function RelatoriosPage() {
  const { tenant } = useTenant()
  const [period, setPeriod] = useState<PeriodType>("month")

  const { data: periodData, isPending: periodLoading } = useDashboardPeriod(tenant.id, period)
  const { data: contracts = [] } = useContracts(tenant.id)
  const { data: accounts = [] } = useAccounts(tenant.id)
  const { data: dealsData } = useDeals(tenant.id)

  // Derived stats
  const activeContracts   = contracts.filter((c) => c.status === "active")
  const expiringContracts = contracts.filter((c) => c.status === "expiring")
  const totalContractValue = activeContracts.reduce((sum, c) => sum + (c.total_value ?? 0), 0)
  const atRisk = accounts.filter((a) => a.commercial_status === "at_risk").length

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold font-headline text-[#022448]">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Desempenho comercial consolidado</p>
          </div>

          {/* Period selector — premium pill */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-[#022448]/10 shadow-sm p-1">
            {(["week", "month", "quarter"] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg font-semibold transition-all",
                  period === p
                    ? "bg-[#022448] text-white shadow-sm"
                    : "text-muted-foreground hover:text-[#022448] hover:bg-[#022448]/5"
                )}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
        {periodData && (
          <p className="text-xs text-muted-foreground mt-1">{periodData.periodLabel}</p>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto">

        {/* Section 1 — KPIs do período */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            KPIs do Período
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            {/* Deals criados */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deals Criados</p>
              {periodLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <>
                  <p className="text-2xl font-extrabold font-headline mt-1 text-[#022448]" suppressHydrationWarning>
                    {periodData?.dealsCreated ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
                    {formatBRL(periodData?.dealsCreatedValue ?? 0)}
                  </p>
                </>
              )}
            </div>

            {/* Deals ganhos */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deals Ganhos</p>
              {periodLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <>
                  <p className="text-2xl font-extrabold font-headline mt-1 text-green-600" suppressHydrationWarning>
                    {periodData?.dealsWon ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
                    {formatBRL(periodData?.dealsWonValue ?? 0)}
                  </p>
                </>
              )}
            </div>

            {/* Deals perdidos */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deals Perdidos</p>
              {periodLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-extrabold font-headline mt-1 text-red-500" suppressHydrationWarning>
                  {periodData?.dealsLost ?? 0}
                </p>
              )}
            </div>

            {/* Taxa de conversão */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taxa de Conversão</p>
              {periodLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-extrabold font-headline mt-1 text-[#F5A623]" suppressHydrationWarning>
                  {(periodData?.conversionRate ?? 0).toFixed(1)}%
                </p>
              )}
            </div>

            {/* Novos clientes */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novos Clientes</p>
              {periodLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-extrabold font-headline mt-1 text-[#022448]" suppressHydrationWarning>
                  {periodData?.newAccounts ?? 0}
                </p>
              )}
            </div>

            {/* Alertas gerados */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alertas Gerados</p>
              {periodLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-extrabold font-headline mt-1 text-[#022448]" suppressHydrationWarning>
                  {periodData?.alertsGenerated ?? 0}
                </p>
              )}
            </div>

          </div>
        </section>

        {/* Section 2 — Resumo de Contratos */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Resumo de Contratos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Total ativos */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Ativos</p>
              <p className="text-2xl font-extrabold font-headline mt-1 text-[#022448]">
                {activeContracts.length}
              </p>
              <p className="text-xs font-medium text-[#F5A623] mt-0.5" suppressHydrationWarning>
                {formatBRL(totalContractValue)}
              </p>
            </div>

            {/* Vencendo */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencendo</p>
              <p className="text-2xl font-extrabold font-headline mt-1 text-[#F5A623]">
                {expiringContracts.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">atenção necessária</p>
            </div>

            {/* Valor total ativo */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Total Ativo</p>
              <p className="text-2xl font-extrabold font-headline mt-1 text-[#F5A623]" suppressHydrationWarning>
                {formatBRL(totalContractValue)}
              </p>
            </div>

            {/* Clientes em risco */}
            <div className="crm-card bg-white border border-transparent rounded-xl p-4 shadow-[0_2px_16px_rgba(2,36,72,0.07)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clientes em Risco</p>
              <p className="text-2xl font-extrabold font-headline mt-1 text-red-500">
                {atRisk}
              </p>
            </div>

          </div>
        </section>

        {/* Section 3 — Funil de Oportunidades */}
        <section>
          <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b bg-[#f8f9fa]">
              <h2 className="text-sm font-extrabold font-headline text-[#022448]">Funil de Oportunidades</h2>
            </div>
            <div className="p-5 space-y-3">
              {Object.entries(dealsData?.stats?.byStage ?? {}).map(([stage, s]) => {
                const maxCount = Math.max(
                  ...Object.values(dealsData?.stats?.byStage ?? {}).map((x) => x.count),
                  1
                )
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[#022448]/70 w-28 shrink-0 truncate">
                      {DEAL_STAGE_CONFIG[stage as DealStage]?.label ?? stage}
                    </span>
                    <div className="flex-1 bg-[#022448]/8 rounded-full h-2">
                      <div
                        className="bg-[#022448] h-2 rounded-full transition-all"
                        style={{ width: `${(s.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-extrabold text-[#022448] w-6 text-right tabular-nums">
                      {s.count}
                    </span>
                  </div>
                )
              })}
              {!dealsData && (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
