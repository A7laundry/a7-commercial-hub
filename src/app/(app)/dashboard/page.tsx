"use client"

import { useTenant } from "@/hooks/useTenant"
import { useDashboardData } from "@/hooks/dashboard/useDashboardData"
import { useDeals } from "@/hooks/deals/useDeals"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UrgentActionsCard } from "@/components/modules/dashboard/UrgentActionsCard"
import { ExpiringContractsCard } from "@/components/modules/dashboard/ExpiringContractsCard"
import { ExpiringDocsCard } from "@/components/modules/dashboard/ExpiringDocsCard"
import { RecentAlertsCard } from "@/components/modules/dashboard/RecentAlertsCard"
import { AccountsAtRiskCard } from "@/components/modules/dashboard/AccountsAtRiskCard"
import { OpportunitiesFeedCard } from "@/components/modules/dashboard/OpportunitiesFeedCard"
import { ActionCenterCard } from "@/components/modules/dashboard/ActionCenterCard"
import {
  Building2,
  FileText,
  Clock,
  Bell,
  FileX,
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { motion } from "framer-motion"

export default function DashboardPage() {
  const { tenant } = useTenant()
  const { data, isPending: isLoading } = useDashboardData(tenant.id)
  const { data: dealsData, isPending: dealsLoading } = useDeals(tenant.id)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Bem-vindo, ${tenant.name}`}
      />

      {/* KPI Row — 7 cards including deals pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
        {[
          { title: "Clientes", value: isLoading ? null : data!.totalAccounts, sub: isLoading ? null : `${data!.activeAccounts} ativos`, icon: Building2, href: "/accounts", highlight: undefined as "warning" | "critical" | undefined },
          { title: "Contratos ativos", value: isLoading ? null : data!.activeContracts, sub: isLoading ? null : `${(data!.expiringContracts + data!.expiredContracts)} com atenção`, icon: FileText, href: "/contracts", highlight: undefined as "warning" | "critical" | undefined },
          { title: "Vencendo em breve", value: isLoading ? null : data!.expiringContracts, sub: "próximos 30 dias", icon: Clock, href: "/contracts?status=expiring", highlight: (!isLoading && data!.expiringContracts > 0 ? "warning" : undefined) as "warning" | "critical" | undefined },
          { title: "Alertas abertos", value: isLoading ? null : data!.openAlerts, sub: "requerem ação", icon: Bell, href: "/alerts", highlight: (!isLoading && data!.openAlerts > 0 ? "critical" : undefined) as "warning" | "critical" | undefined },
          { title: "Docs vencidos", value: isLoading ? null : data!.expiredDocuments, sub: isLoading ? null : `${data!.expiringDocuments} vencendo`, icon: FileX, href: "/documents", highlight: (!isLoading && data!.expiredDocuments > 0 ? "critical" : undefined) as "warning" | "critical" | undefined },
          { title: "Valor da carteira", value: isLoading ? null : formatCurrency(data!.totalCarteiraValue, "BRL"), sub: "estimado total", icon: Wallet, href: "/accounts", highlight: undefined as "warning" | "critical" | undefined },
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

      {/* Urgent Actions — full width */}
      {isLoading ? (
        <Skeleton className="h-24 w-full mb-6" />
      ) : (
        <div className="mb-6">
          <UrgentActionsCard actions={data!.urgentActions} />
        </div>
      )}

      {/* Action Center — full width */}
      <div className="mb-6">
        <ActionCenterCard />
      </div>

      {/* Opportunities feed — full width */}
      <div className="mb-6">
        <OpportunitiesFeedCard tenantId={tenant.id} />
      </div>

      {/* Mid row: Expiring Contracts + Expiring Docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {isLoading ? (
          <>
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </>
        ) : (
          <>
            <ExpiringContractsCard contracts={data!.expiringContractsList} />
            <ExpiringDocsCard documents={data!.expiringDocsList} />
          </>
        )}
      </div>

      {/* Bottom row: Recent Alerts + Accounts at Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </>
        ) : (
          <>
            <RecentAlertsCard alerts={data!.recentAlerts} />
            <AccountsAtRiskCard accounts={data!.accountsAtRisk} />
          </>
        )}
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
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline</CardTitle>
          <Target className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totalValue, "BRL")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {total} deal{total !== 1 ? "s" : ""}
                {conversionRate > 0 && ` · ${conversionRate}% conv.`}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
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
}

function KpiCard({ title, value, sub, icon: Icon, href, highlight, isLoading }: KpiCardProps) {
  const borderClass =
    highlight === "critical"
      ? "border-red-300"
      : highlight === "warning"
      ? "border-amber-300"
      : ""

  const iconClass =
    highlight === "critical"
      ? "text-red-500"
      : highlight === "warning"
      ? "text-amber-500"
      : "text-muted-foreground"

  return (
    <Link href={href}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${borderClass}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className={`w-4 h-4 ${iconClass}`} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <div
                className={`text-2xl font-bold ${
                  highlight === "critical"
                    ? "text-red-600"
                    : highlight === "warning"
                    ? "text-amber-600"
                    : ""
                }`}
              >
                {value ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
