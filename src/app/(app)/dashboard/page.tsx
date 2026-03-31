"use client"

import { useTenant } from "@/hooks/useTenant"
import { useDashboardData } from "@/hooks/dashboard/useDashboardData"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UrgentActionsCard } from "@/components/modules/dashboard/UrgentActionsCard"
import { ExpiringContractsCard } from "@/components/modules/dashboard/ExpiringContractsCard"
import { ExpiringDocsCard } from "@/components/modules/dashboard/ExpiringDocsCard"
import { RecentAlertsCard } from "@/components/modules/dashboard/RecentAlertsCard"
import { AccountsAtRiskCard } from "@/components/modules/dashboard/AccountsAtRiskCard"
import {
  Building2,
  FileText,
  Clock,
  Bell,
  FileX,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

export default function DashboardPage() {
  const { tenant } = useTenant()
  const { data, isLoading } = useDashboardData(tenant.id)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Bem-vindo, ${tenant.name}`}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          title="Contas"
          value={isLoading ? null : data!.totalAccounts}
          sub={isLoading ? null : `${data!.activeAccounts} ativas`}
          icon={Building2}
          href="/accounts"
          isLoading={isLoading}
        />
        <KpiCard
          title="Contratos ativos"
          value={isLoading ? null : data!.activeContracts}
          sub={isLoading ? null : `${(data!.expiringContracts + data!.expiredContracts)} com atenção`}
          icon={FileText}
          href="/contracts"
          isLoading={isLoading}
        />
        <KpiCard
          title="Vencendo em breve"
          value={isLoading ? null : data!.expiringContracts}
          sub="próximos 30 dias"
          icon={Clock}
          href="/contracts?status=expiring"
          highlight={!isLoading && data!.expiringContracts > 0 ? "warning" : undefined}
          isLoading={isLoading}
        />
        <KpiCard
          title="Alertas abertos"
          value={isLoading ? null : data!.openAlerts}
          sub="requerem ação"
          icon={Bell}
          href="/alerts"
          highlight={!isLoading && data!.openAlerts > 0 ? "critical" : undefined}
          isLoading={isLoading}
        />
        <KpiCard
          title="Docs vencidos"
          value={isLoading ? null : data!.expiredDocuments}
          sub={isLoading ? null : `${data!.expiringDocuments} vencendo`}
          icon={FileX}
          href="/documents"
          highlight={!isLoading && data!.expiredDocuments > 0 ? "critical" : undefined}
          isLoading={isLoading}
        />
      </div>

      {/* Urgent Actions — full width */}
      {isLoading ? (
        <Skeleton className="h-24 w-full mb-6" />
      ) : (
        <div className="mb-6">
          <UrgentActionsCard actions={data!.urgentActions} />
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

// ── KPI Card ──────────────────────────────────────────────────────────────────

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
