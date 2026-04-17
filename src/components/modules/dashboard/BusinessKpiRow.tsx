"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, Users, BarChart2, Wallet } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type BusinessKpiRowProps = {
  revenueMonth: number
  totalAccounts: number
  activeAccounts: number
  conversionRate: number
  totalCarteiraValue: number
  isLoading: boolean
}

// ── Sub-component ─────────────────────────────────────────────────────────────

type KpiCardProps = {
  title: string
  value: string
  sub: string
  icon: React.ElementType
  isLoading: boolean
}

function KpiCard({ title, value, sub, icon: Icon, isLoading }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-[0_24px_40px_rgba(25,28,29,0.03)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          {title}
        </p>
        <Icon className="w-4 h-4 text-slate-300" aria-hidden="true" />
      </div>
      {isLoading ? (
        <>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-3 w-24" />
        </>
      ) : (
        <>
          <p
            className="text-3xl font-extrabold text-[#022448] leading-none mb-2"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {value}
          </p>
          <p className="text-[12px] font-semibold text-slate-500 flex items-center gap-1">
            {sub}
          </p>
        </>
      )}
    </div>
  )
}

// ── Exported 4 individual KPI card components ─────────────────────────────────

export function KpiRevenueMonth({
  revenueMonth,
  isLoading,
}: Pick<BusinessKpiRowProps, "revenueMonth" | "isLoading">) {
  return (
    <KpiCard
      title="Receita do Mês"
      value={formatCurrency(revenueMonth, "BRL")}
      sub="este mês"
      icon={TrendingUp}
      isLoading={isLoading}
    />
  )
}

export function KpiClientsInPipeline({
  totalAccounts,
  activeAccounts,
  isLoading,
}: Pick<BusinessKpiRowProps, "totalAccounts" | "activeAccounts" | "isLoading">) {
  return (
    <KpiCard
      title="Clientes em Pipeline"
      value={String(totalAccounts)}
      sub={`${activeAccounts} ativos`}
      icon={Users}
      isLoading={isLoading}
    />
  )
}

export function KpiConversion({
  conversionRate,
  isLoading,
}: Pick<BusinessKpiRowProps, "conversionRate" | "isLoading">) {
  return (
    <KpiCard
      title="Conversão do Mês"
      value={`${conversionRate}%`}
      sub="contatos → vendas"
      icon={BarChart2}
      isLoading={isLoading}
    />
  )
}

export function KpiTicketMedio({
  totalCarteiraValue,
  totalAccounts,
  isLoading,
}: Pick<BusinessKpiRowProps, "totalCarteiraValue" | "totalAccounts" | "isLoading">) {
  const ticketMedio = totalCarteiraValue / Math.max(1, totalAccounts)

  return (
    <KpiCard
      title="Ticket Médio"
      value={formatCurrency(ticketMedio, "BRL")}
      sub="estimado médio"
      icon={Wallet}
      isLoading={isLoading}
    />
  )
}
