"use client"

import { useState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { useDashboardData } from "@/hooks/dashboard/useDashboardData"
import { useDashboardPeriod, type PeriodType } from "@/hooks/dashboard/useDashboardPeriod"
import { useDeals } from "@/hooks/deals/useDeals"
import { useExecutionQueue } from "@/hooks/dashboard/useExecutionQueue"
import { useOnboardingState, type OnboardingState } from "@/hooks/useOnboardingState"
import { useInsights } from "@/hooks/dashboard/useInsights"
import { InsightsCard } from "@/components/modules/dashboard/InsightsCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UrgentActionsCard } from "@/components/modules/dashboard/UrgentActionsCard"
import { ExpiringContractsCard } from "@/components/modules/dashboard/ExpiringContractsCard"
import { ExpiringDocsCard } from "@/components/modules/dashboard/ExpiringDocsCard"
import { RecentAlertsCard } from "@/components/modules/dashboard/RecentAlertsCard"
import { AccountsAtRiskCard } from "@/components/modules/dashboard/AccountsAtRiskCard"
import { PendingReportBanner } from "@/components/modules/dashboard/PendingReportBanner"
import { OperatorUsageCard } from "@/components/modules/dashboard/OperatorUsageCard"
import { OperatorPerformanceCard } from "@/components/modules/dashboard/OperatorPerformanceCard"
import { ConversionGaugeCard } from "@/components/modules/dashboard/ConversionGaugeCard"
import {
  Building2,
  FileText,
  Clock,
  Bell,
  FileX,
  Target,
  TrendingUp,
  Wallet,
  Trophy,
  Handshake,
  UserPlus,
  AlertTriangle,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  ListChecks,
  Zap,
  FilePlus,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { tenant } = useTenant()
  const { data, isPending: isLoading } = useDashboardData(tenant.id)
  const { data: dealsData, isPending: dealsLoading } = useDeals(tenant.id)
  const [period, setPeriod] = useState<PeriodType>("month")
  const { data: periodData, isPending: periodLoading } = useDashboardPeriod(tenant.id, period)
  const { data: queueItems = [] } = useExecutionQueue(tenant.id)
  const onboarding = useOnboardingState(tenant.id)
  const { data: insights = [], isPending: insightsLoading } = useInsights(tenant.id)

  const hasActivity = !isLoading && (data?.totalAccounts ?? 0) > 0
  const urgentCount = queueItems.filter((i) => i.urgency === "urgent").length
  const highCount = queueItems.filter((i) => i.urgency === "high").length

  return (
    <div className="bg-[#f8f9fa] min-h-screen -m-6 p-8">
      {/* ── Pending report banner ─────────────────────────────────────── */}
      <PendingReportBanner />

      {/* ── Operator daily activity ──────────────────────────────────── */}
      <div className="mb-6">
        <OperatorUsageCard />
      </div>

      {/* ── Entry point: O que fazer agora? (com clientes) ─────────────── */}
      {hasActivity && queueItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl bg-[#f0f2f5] p-5 border-l-8 border-[#F5A623]"
        >
          <div className="flex items-center justify-between gap-4 mb-0">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#022448]/10 flex items-center justify-center shrink-0">
                <ListChecks className="w-4 h-4 text-[#022448]" />
              </div>
              <div>
                <h2
                  className="text-sm font-extrabold text-[#022448]"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  O que fazer agora?
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {urgentCount > 0 && (
                    <span className="text-red-600 font-semibold">
                      {urgentCount} urgente{urgentCount !== 1 ? "s" : ""} ·{" "}
                    </span>
                  )}
                  {highCount > 0 && (
                    <span className="text-amber-600 font-semibold">
                      {highCount} alta prioridade ·{" "}
                    </span>
                  )}
                  {queueItems.length} ações aguardando
                </p>
              </div>
            </div>
            <Link
              href="/execution"
              className="shrink-0 flex items-center gap-1.5 text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:scale-[1.02] transition-all shadow-lg"
              style={{
                background: "linear-gradient(135deg, #F5A623 0%, #D48C1D 100%)",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              Ver minha fila
            </Link>
          </div>

          {/* Preview das top 3 ações urgentes */}
          {urgentCount > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {queueItems
                .filter((i) => i.urgency === "urgent")
                .slice(0, 3)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-700 shrink-0">
                      {item.priorityScore}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{item.accountName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.actionLabel}
                      </p>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Onboarding (sem clientes) ─────────────────────────────────────── */}
      {!onboarding.isLoading && !onboarding.allDone && (
        <OnboardingChecklist onboarding={onboarding} />
      )}

      {/* KPI Row — 7 cards including deals pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: "Clientes",
            value: isLoading ? null : (data?.totalAccounts ?? 0),
            sub: isLoading ? null : `${data?.activeAccounts ?? 0} ativos`,
            icon: Building2,
            href: "/accounts",
            highlight: undefined as "warning" | "critical" | undefined,
            sparkline: false,
          },
          {
            title: "Contratos ativos",
            value: isLoading ? null : (data?.activeContracts ?? 0),
            sub: isLoading
              ? null
              : `${(data?.expiringContracts ?? 0) + (data?.expiredContracts ?? 0)} com atenção`,
            icon: FileText,
            href: "/contracts",
            highlight: undefined as "warning" | "critical" | undefined,
            sparkline: true,
          },
          {
            title: "Vencendo em breve",
            value: isLoading ? null : (data?.expiringContracts ?? 0),
            sub: "próximos 30 dias",
            icon: Clock,
            href: "/contracts?status=expiring",
            highlight: (
              !isLoading && (data?.expiringContracts ?? 0) > 0 ? "warning" : undefined
            ) as "warning" | "critical" | undefined,
            sparkline: false,
          },
          {
            title: "Alertas abertos",
            value: isLoading ? null : (data?.openAlerts ?? 0),
            sub: "requerem ação",
            icon: Bell,
            href: "/alerts",
            highlight: (
              !isLoading && (data?.openAlerts ?? 0) > 0 ? "critical" : undefined
            ) as "warning" | "critical" | undefined,
            sparkline: false,
          },
          {
            title: "Docs vencidos",
            value: isLoading ? null : (data?.expiredDocuments ?? 0),
            sub: isLoading ? null : `${data?.expiringDocuments ?? 0} vencendo`,
            icon: FileX,
            href: "/documents",
            highlight: (
              !isLoading && (data?.expiredDocuments ?? 0) > 0 ? "critical" : undefined
            ) as "warning" | "critical" | undefined,
            sparkline: false,
          },
          {
            title: "Valor da carteira",
            value: isLoading ? null : formatCurrency(data?.totalCarteiraValue ?? 0, "BRL"),
            sub: "estimado total",
            icon: Wallet,
            href: "/accounts",
            highlight: undefined as "warning" | "critical" | undefined,
            sparkline: true,
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
          >
            <KpiCard {...kpi} isLoading={isLoading} />
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 5 * 0.07 }}
        >
          <DealsKpiCard
            isLoading={dealsLoading}
            total={dealsData?.stats.total ?? 0}
            totalValue={dealsData?.stats.totalValue ?? 0}
            conversionRate={dealsData?.stats.conversionRate ?? 0}
          />
        </motion.div>
      </div>

      {/* Operational Intelligence — full width */}
      <div className="mb-6">
        <InsightsCard insights={insights} isLoading={insightsLoading} />
      </div>

      {/* Period Activity — area chart */}
      <div className="mb-6">
        <Card className="shadow-[0_24px_40px_rgba(25,28,29,0.03)] border-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#022448]" />
                  <CardTitle
                    className="text-xl font-extrabold text-[#022448]"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    Atividade{periodData ? ` — ${periodData.periodLabel}` : " — Últimos 6 meses"}
                  </CardTitle>
                </div>
                {/* Legend */}
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#022448] inline-block" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Deals Ganhos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F5A623] inline-block" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Receita (R$)
                    </span>
                  </div>
                </div>
              </div>
              {/* Segmented period selector */}
              <div className="flex items-center rounded-xl border bg-[#edeeef] p-1.5 gap-0.5">
                {(["week", "month", "quarter"] as PeriodType[]).map((p) => {
                  const labels: Record<PeriodType, string> = {
                    week: "Semana",
                    month: "Mês",
                    quarter: "Trimestre",
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                        period === p
                          ? "bg-white shadow-sm text-[#022448]"
                          : "text-slate-500 hover:text-[#022448]"
                      }`}
                    >
                      {labels[p]}
                    </button>
                  )
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Inline SVG area chart */}
            <div className="h-[240px] w-full relative">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 1000 240"
                aria-label="Gráfico de atividade: Deals Ganhos e Receita"
                role="img"
              >
                {/* Grid lines */}
                <line
                  x1="0"
                  y1="200"
                  x2="1000"
                  y2="200"
                  stroke="rgba(2,36,72,0.05)"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="140"
                  x2="1000"
                  y2="140"
                  stroke="rgba(2,36,72,0.05)"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="80"
                  x2="1000"
                  y2="80"
                  stroke="rgba(2,36,72,0.05)"
                  strokeWidth="1"
                />
                {/* Area fill for Deals Ganhos */}
                <path
                  d="M0 180 Q 100 190, 200 160 T 400 140 T 600 120 T 800 100 T 1000 80 V 240 H 0 Z"
                  fill="rgba(2,36,72,0.05)"
                />
                {/* Line — Deals Ganhos (navy) */}
                <path
                  d="M0 180 Q 100 190, 200 160 T 400 140 T 600 120 T 800 100 T 1000 80"
                  fill="none"
                  stroke="#022448"
                  strokeWidth="2.5"
                />
                {/* Line — Receita (amber, dashed) */}
                <path
                  d="M0 210 Q 150 200, 300 150 T 500 100 T 750 60 T 1000 30"
                  fill="none"
                  stroke="#F5A623"
                  strokeWidth="2.5"
                  strokeDasharray="8 4"
                />
              </svg>
              {/* Month labels */}
              <div
                className="flex justify-between px-2 mt-2 uppercase tracking-widest"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#94a3b8",
                }}
              >
                <span>Jan</span>
                <span>Fev</span>
                <span>Mar</span>
                <span>Abr</span>
                <span>Mai</span>
                <span>Jun</span>
              </div>
            </div>

            {/* Period stat blocks — kept for data accuracy below the chart */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border/50">
              <PeriodStatBlock
                label="Deals criados"
                icon={Handshake}
                isLoading={periodLoading}
                primary={periodData?.dealsCreated ?? 0}
                secondary={periodData ? formatCurrency(periodData.dealsCreatedValue, "BRL") : "—"}
                secondaryLabel="em valor"
              />
              <PeriodStatBlock
                label="Deals ganhos"
                icon={Trophy}
                isLoading={periodLoading}
                primary={periodData?.dealsWon ?? 0}
                secondary={periodData ? formatCurrency(periodData.dealsWonValue, "BRL") : "—"}
                secondaryLabel="receita fechada"
                highlight="positive"
              />
              <PeriodStatBlock
                label="Taxa de conversão"
                icon={TrendingUp}
                isLoading={periodLoading}
                primary={`${periodData?.conversionRate ?? 0}%`}
                secondary={periodData ? `${periodData.dealsWon}G / ${periodData.dealsLost}P` : "—"}
                secondaryLabel="ganhos vs perdidos"
                highlight={
                  periodData && periodData.conversionRate >= 50
                    ? "positive"
                    : periodData && periodData.conversionRate > 0
                    ? "warning"
                    : undefined
                }
              />
              <PeriodStatBlock
                label="Novas contas"
                icon={UserPlus}
                isLoading={periodLoading}
                primary={periodData?.newAccounts ?? 0}
                secondary="cadastradas"
                secondaryLabel="no período"
              />
              <PeriodStatBlock
                label="Alertas gerados"
                icon={AlertTriangle}
                isLoading={periodLoading}
                primary={periodData?.alertsGenerated ?? 0}
                secondary="disparados"
                secondaryLabel="pelo sistema"
                highlight={
                  periodData && periodData.alertsGenerated > 0 ? "warning" : undefined
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operator Performance + Conversion Gauge — 3/5 + 2/5 */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        <div className="col-span-5 md:col-span-3">
          <OperatorPerformanceCard />
        </div>
        <div className="col-span-5 md:col-span-2">
          <ConversionGaugeCard
            conversionRate={periodData?.conversionRate ?? 0}
            isLoading={periodLoading}
          />
        </div>
      </div>

      {/* Urgent Actions — full width */}
      {isLoading ? (
        <Skeleton className="h-24 w-full mb-6" />
      ) : (
        <div className="mb-6">
          <UrgentActionsCard actions={data?.urgentActions ?? []} />
        </div>
      )}

      {/* Mid row: Expiring Contracts + Expiring Docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {isLoading ? (
          <>
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </>
        ) : (
          <>
            <ExpiringContractsCard contracts={data?.expiringContractsList ?? []} />
            <ExpiringDocsCard documents={data?.expiringDocsList ?? []} />
          </>
        )}
      </div>

      {/* Bottom row: Recent Alerts + Accounts at Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
        {isLoading ? (
          <>
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </>
        ) : (
          <>
            <RecentAlertsCard alerts={data?.recentAlerts ?? []} />
            <AccountsAtRiskCard accounts={data?.accountsAtRisk ?? []} />
          </>
        )}
      </div>

      {/* ── Floating HUD glassmorphic ──────────────────────────────────── */}
      <div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-2xl border border-white/20 p-2 shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <Link
          href="/accounts?action=new"
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-[#022448] hover:bg-slate-100 transition-all"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          Novo Cliente
        </Link>
        <div className="w-px h-6 bg-slate-200 mx-1" aria-hidden="true" />
        <Link
          href="/contracts?action=new"
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-[#022448] hover:bg-slate-100 transition-all"
        >
          <FilePlus className="w-4 h-4" aria-hidden="true" />
          Gerar Contrato
        </Link>
      </div>
    </div>
  )
}

// ── Deals KPI card ─────────────────────────────────────────────────────────────

function DealsKpiCard({
  isLoading,
  total,
  totalValue,
  conversionRate,
}: {
  isLoading: boolean
  total: number
  totalValue: number
  conversionRate: number
}) {
  return (
    <Link href="/deals">
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-transparent bg-[#022448] shadow-[0_24px_40px_rgba(25,28,29,0.03)]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle
            className="text-[10px] font-bold text-slate-300 uppercase tracking-widest"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Total Pipeline
          </CardTitle>
          <Target className="w-4 h-4 text-[#F5A623]" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-20 mb-1 bg-white/10" />
              <Skeleton className="h-3 w-24 bg-white/10" />
            </>
          ) : (
            <>
              <div
                className="text-2xl font-extrabold"
                style={{ color: "#ffddb4", fontFamily: "Manrope, sans-serif" }}
              >
                {formatCurrency(totalValue, "BRL")}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {total} negociação{total !== 1 ? "es" : ""}
                {conversionRate > 0 && ` · ${conversionRate}% conv.`}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Period Stat Block ──────────────────────────────────────────────────────────

function PeriodStatBlock({
  label,
  icon: Icon,
  isLoading,
  primary,
  secondary,
  secondaryLabel,
  highlight,
}: {
  label: string
  icon: React.ElementType
  isLoading: boolean
  primary: string | number
  secondary: string
  secondaryLabel: string
  highlight?: "positive" | "warning"
}) {
  const primaryClass =
    highlight === "positive"
      ? "text-green-600"
      : highlight === "warning"
      ? "text-amber-600"
      : "text-foreground"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      {isLoading ? (
        <>
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </>
      ) : (
        <>
          <div className={`text-2xl font-bold leading-none ${primaryClass}`}>{primary}</div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            <span className="font-medium">{secondary}</span> {secondaryLabel}
          </p>
        </>
      )}
    </div>
  )
}

// ── Onboarding Checklist ───────────────────────────────────────────────────────

function OnboardingChecklist({ onboarding }: { onboarding: OnboardingState }) {
  const { steps, completedCount, totalCount } = onboarding
  const progress = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="mb-6 rounded-xl border-2 border-dashed border-[#022448]/30 bg-[#022448]/5 p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-[#022448]/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#022448]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3
              className="text-sm font-extrabold text-[#022448]"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Comece aqui — configure o A7X
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#022448]/10 rounded-full h-1.5 mb-3">
            <div
              className="bg-[#022448] rounded-full h-1.5 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-center gap-2.5 text-sm rounded-lg px-2 py-1.5 -mx-2 transition-colors group",
                    step.done
                      ? "opacity-60 cursor-default pointer-events-none"
                      : "hover:bg-[#022448]/10 hover:text-[#022448]"
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-[#022448]" />
                  )}
                  <span
                    className={cn("flex-1", step.done && "line-through text-muted-foreground")}
                  >
                    {i + 1}. {step.label}
                  </span>
                  {!step.done && (
                    <span className="text-[11px] text-[#022448] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      {step.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

// ── Generic KPI Card ───────────────────────────────────────────────────────────

type KpiCardProps = {
  title: string
  value: string | number | null
  sub: string | null
  icon: React.ElementType
  href: string
  highlight?: "warning" | "critical"
  isLoading?: boolean
  sparkline?: boolean
}

/** Sparkline path data — decorative bezier curves */
const SPARKLINE_PATHS = [
  "M0 35 Q 25 32, 50 34 T 100 28 T 150 25 T 200 20",
  "M0 38 Q 40 35, 80 30 T 160 15 T 200 10",
]

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  href,
  highlight,
  isLoading,
  sparkline,
}: KpiCardProps) {
  const borderClass =
    highlight === "critical"
      ? "border-red-300"
      : highlight === "warning"
      ? "border-amber-300"
      : "border-transparent"

  const iconClass =
    highlight === "critical"
      ? "text-red-500"
      : highlight === "warning"
      ? "text-amber-500"
      : "text-muted-foreground"

  const valueClass =
    highlight === "critical"
      ? "text-red-600"
      : highlight === "warning"
      ? "text-amber-600"
      : "text-[#022448]"

  // Pick a sparkline path based on title hash (stable)
  const sparkPath = SPARKLINE_PATHS[title.length % SPARKLINE_PATHS.length]

  return (
    <Link href={href}>
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer h-full ${borderClass} shadow-[0_24px_40px_rgba(25,28,29,0.03)]`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {title}
          </CardTitle>
          <Icon className={`w-4 h-4 ${iconClass}`} />
        </CardHeader>
        <CardContent className="flex flex-col justify-between">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <div>
                <div
                  className={`text-3xl font-extrabold leading-none ${valueClass}`}
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {value ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </div>
              {sparkline && (
                <div className="h-10 w-full mt-2" aria-hidden="true">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40">
                    <path
                      d={sparkPath}
                      fill="none"
                      stroke="#022448"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
