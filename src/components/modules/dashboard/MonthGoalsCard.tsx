"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import type { DashboardMonthData } from "@/hooks/dashboard/useDashboardMonth"

// ── Types ─────────────────────────────────────────────────────────────────────

type MonthGoalsCardProps = {
  goals: DashboardMonthData["goals"] | undefined
  salesMonth: number
  contactsMonth: number
  revenueMonth: number
  isLoading: boolean
}

// ── Sub-component: Progress bar row ──────────────────────────────────────────

type GoalBarProps = {
  label: string
  current: number
  target: number
  color: string
  formatValue?: (v: number) => string
}

function GoalBar({ label, current, target, color, formatValue }: GoalBarProps) {
  const fmt = formatValue ?? ((v: number) => String(v))
  const hasGoal = target > 0
  const pct = hasGoal ? Math.round((current / target) * 100) : 0
  const clampedPct = Math.min(100, pct)

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <p className="text-[12px] text-slate-300 font-medium">{label}</p>
        {hasGoal ? (
          <span
            className="text-[18px] font-extrabold text-white leading-none"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {pct}%
          </span>
        ) : (
          <span className="text-[14px] font-bold text-slate-400">—</span>
        )}
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.10)" }}
        role="progressbar"
        aria-valuenow={hasGoal ? pct : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct}% da meta`}
      >
        {hasGoal && (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${clampedPct}%`, background: color }}
          />
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        {hasGoal
          ? `${fmt(current)} / ${fmt(target)}`
          : "Sem meta definida"}
      </p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonthGoalsCard({
  goals,
  salesMonth,
  contactsMonth,
  revenueMonth,
  isLoading,
}: MonthGoalsCardProps) {
  const noGoals = !goals || goals.daysWithGoal === 0

  return (
    <div
      className="rounded-xl p-6 flex flex-col h-full"
      style={{ background: "linear-gradient(160deg, #022448 0%, #0a3060 100%)" }}
    >
      {/* Header */}
      <h3
        className="text-[13px] font-bold text-white mb-5"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        Metas do Mês
      </h3>

      {isLoading ? (
        <div className="space-y-5 flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3 w-20 bg-white/10" />
                <Skeleton className="h-5 w-10 bg-white/10" />
              </div>
              <Skeleton className="h-2 w-full bg-white/10" />
              <Skeleton className="h-3 w-28 mt-1 bg-white/10" />
            </div>
          ))}
        </div>
      ) : noGoals ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-4">
          <p className="text-[13px] text-slate-400">
            Nenhuma meta definida este mês
          </p>
          <Link
            href="/dashboard/daily"
            className="text-[12px] font-semibold text-[#F5A623] hover:underline"
          >
            Definir metas diárias →
          </Link>
        </div>
      ) : (
        <div className="space-y-5 flex-1">
          <GoalBar
            label="Receita"
            current={revenueMonth}
            target={goals.totalGoalRevenue}
            color="#F5A623"
            formatValue={(v) => formatCurrency(v, "BRL")}
          />
          <GoalBar
            label="Vendas"
            current={salesMonth}
            target={goals.totalGoalSales}
            color="#22c55e"
          />
          <GoalBar
            label="Contatos"
            current={contactsMonth}
            target={goals.totalGoalContacts}
            color="#3b82f6"
          />
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-5 pt-4 border-t border-white/10">
        <Link
          href="/dashboard/daily"
          className="flex items-center justify-center w-full text-[12px] font-semibold text-white/70 hover:text-white transition-colors"
        >
          Ver Desempenho Diário →
        </Link>
      </div>
    </div>
  )
}
