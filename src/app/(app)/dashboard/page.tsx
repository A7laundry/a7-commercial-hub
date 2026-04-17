"use client"

import { useTenant } from "@/hooks/useTenant"
import { useDashboardData } from "@/hooks/dashboard/useDashboardData"
import { useDashboardMonth } from "@/hooks/dashboard/useDashboardMonth"
import { usePipeline } from "@/hooks/pipeline/usePipeline"
import { useDeals } from "@/hooks/deals/useDeals"
import { useExecutionQueue } from "@/hooks/dashboard/useExecutionQueue"
import { useOnboardingState, type OnboardingState } from "@/hooks/useOnboardingState"
import { useInsights } from "@/hooks/dashboard/useInsights"
import { InsightsCard } from "@/components/modules/dashboard/InsightsCard"
import { Skeleton } from "@/components/ui/skeleton"
import { ExpiringContractsCard } from "@/components/modules/dashboard/ExpiringContractsCard"
import { ExpiringDocsCard } from "@/components/modules/dashboard/ExpiringDocsCard"
import { RecentAlertsCard } from "@/components/modules/dashboard/RecentAlertsCard"
import { AccountsAtRiskCard } from "@/components/modules/dashboard/AccountsAtRiskCard"
import { RecentAccountsCard } from "@/components/modules/dashboard/RecentAccountsCard"
import { PendingReportBanner } from "@/components/modules/dashboard/PendingReportBanner"
import { OperatorUsageCard } from "@/components/modules/dashboard/OperatorUsageCard"
import { TodayLaunchesWidget } from "@/components/modules/dashboard/TodayLaunchesWidget"
import {
  KpiRevenueMonth,
  KpiClientsInPipeline,
  KpiConversion,
  KpiTicketMedio,
} from "@/components/modules/dashboard/BusinessKpiRow"
import { PipelineStageBar } from "@/components/modules/dashboard/PipelineStageBar"
import { StagePieDistribution } from "@/components/modules/dashboard/StagePieDistribution"
import { ActivityFeed } from "@/components/modules/dashboard/ActivityFeed"
import { MonthGoalsCard } from "@/components/modules/dashboard/MonthGoalsCard"
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  ListChecks,
  Zap,
  FilePlus,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { tenant } = useTenant()
  const { data, isPending: isLoading } = useDashboardData(tenant.id)
  const { data: monthData, isPending: monthLoading } = useDashboardMonth(tenant.id)
  const { data: pipelineData, isPending: pipelineLoading } = usePipeline(tenant.id)
  const { data: dealsData, isPending: dealsLoading } = useDeals(tenant.id)
  const { data: queueItems = [] } = useExecutionQueue(tenant.id)
  const onboarding = useOnboardingState(tenant.id)
  const { data: insights = [], isPending: insightsLoading } = useInsights(tenant.id)

  void dealsData
  void dealsLoading

  const hasActivity = !isLoading && (data?.totalAccounts ?? 0) > 0
  const urgentCount = queueItems.filter((i) => i.urgency === "urgent").length
  const highCount = queueItems.filter((i) => i.urgency === "high").length

  return (
    <div className="bg-[#f8f9fa] min-h-screen -m-6 p-8">
      {/* ── Pending report banner ─────────────────────────────────────── */}
      <PendingReportBanner />

      {/* ── Today launches widget ────────────────────────────────────── */}
      <div className="mb-4">
        <TodayLaunchesWidget tenantId={tenant.id} />
      </div>

      {/* ── Operator daily activity ──────────────────────────────────── */}
      <div className="mb-6">
        <OperatorUsageCard />
      </div>

      {/* ── Onboarding (sem clientes) ─────────────────────────────────── */}
      {!onboarding.isLoading && !onboarding.allDone && (
        <OnboardingChecklist onboarding={onboarding} />
      )}

      {/* ══ NOVA SEÇÃO: Business KPIs ════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0 }}
        >
          <KpiRevenueMonth
            revenueMonth={monthData?.revenueMonth ?? 0}
            isLoading={monthLoading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.07 }}
        >
          <KpiClientsInPipeline
            totalAccounts={data?.totalAccounts ?? 0}
            activeAccounts={data?.activeAccounts ?? 0}
            isLoading={isLoading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
        >
          <KpiConversion
            conversionRate={monthData?.conversionRate ?? 0}
            isLoading={monthLoading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.21 }}
        >
          <KpiTicketMedio
            totalCarteiraValue={data?.totalCarteiraValue ?? 0}
            totalAccounts={data?.totalAccounts ?? 0}
            isLoading={isLoading}
          />
        </motion.div>
      </div>

      {/* ══ NOVA SEÇÃO: Visão de Pipeline ════════════════════════════════ */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="col-span-5 lg:col-span-3 bg-white rounded-xl p-6 shadow-[0_24px_40px_rgba(25,28,29,0.03)]">
          <PipelineStageBar stats={pipelineData?.stats} isLoading={pipelineLoading} />
        </div>
        <div className="col-span-5 lg:col-span-2 bg-white rounded-xl p-6 shadow-[0_24px_40px_rgba(25,28,29,0.03)]">
          <StagePieDistribution stats={pipelineData?.stats} isLoading={pipelineLoading} />
        </div>
      </div>

      {/* ══ NOVA SEÇÃO: Atividade + Metas ════════════════════════════════ */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="col-span-5 lg:col-span-3 bg-white rounded-xl p-6 shadow-[0_24px_40px_rgba(25,28,29,0.03)]">
          <ActivityFeed
            activities={monthData?.recentActivity ?? []}
            isLoading={monthLoading}
          />
        </div>
        <div className="col-span-5 lg:col-span-2">
          <MonthGoalsCard
            goals={monthData?.goals}
            salesMonth={monthData?.salesMonth ?? 0}
            contactsMonth={monthData?.contactsMonth ?? 0}
            revenueMonth={monthData?.revenueMonth ?? 0}
            isLoading={monthLoading}
          />
        </div>
      </div>

      {/* ── Execution queue ───────────────────────────────────────────── */}
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

      {/* ── Insights ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <InsightsCard insights={insights} isLoading={insightsLoading} />
      </div>

      {/* ── Operacional ───────────────────────────────────────────────── */}
      {isLoading ? (
        <>
          <Skeleton className="h-52 w-full mb-4" />
          <Skeleton className="h-52 w-full mb-4" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ExpiringContractsCard contracts={data?.expiringContractsList ?? []} />
            <ExpiringDocsCard documents={data?.expiringDocsList ?? []} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <RecentAlertsCard alerts={data?.recentAlerts ?? []} />
            <AccountsAtRiskCard accounts={data?.accountsAtRisk ?? []} />
          </div>
        </>
      )}

      {/* ── Últimos clientes cadastrados ─────────────────────────────── */}
      <div className="pb-24">
        <RecentAccountsCard tenantId={tenant.id} />
      </div>

      {/* ── Floating HUD ─────────────────────────────────────────────── */}
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
