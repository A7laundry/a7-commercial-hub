"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileText, FileX, Bell, TrendingUp, Building2, ExternalLink } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useAccountSummary } from "@/hooks/accounts/useAccountSummary"
import { SmartSummaryBlock } from "@/components/modules/accounts/SmartSummaryBlock"
import { RecommendationsBlock } from "@/components/modules/accounts/RecommendationsBlock"
import { RiskBadge } from "@/components/modules/accounts/RiskBadge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DocumentStatusBadge } from "@/components/modules/documents/DocumentStatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function AccountSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { tenant } = useTenant()
  const router = useRouter()

  const { data, isPending: isLoading } = useAccountSummary(tenant.id, id)

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
  }

  const {
    account,
    contracts,
    totalContracts,
    activeContracts,
    totalContractValue,
    expiringContracts,
    expiredContracts,
    documents,
    totalDocuments,
    expiringDocuments,
    expiredDocuments,
    openAlerts,
    riskLevel,
    riskFactorLabels,
    summary,
    recommendations,
  } = data

  return (
    <div className="max-w-4xl">
      {/* Back nav */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/accounts/${id}`)}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {account.name}
        </Button>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <RiskBadge level={riskLevel} size="lg" />
          </div>
          <p className="text-sm text-muted-foreground">
            Resumo executivo · {account.segment ?? "Sem segmento"} ·{" "}
            <StatusBadge status={account.status} />
          </p>
        </div>
        <Link href={`/accounts/${id}`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-1" />
            Ver cliente completo
          </Button>
        </Link>
      </div>

      {/* Smart Summary */}
      <div className="mb-4">
        <SmartSummaryBlock
          summary={summary}
          riskLevel={riskLevel}
          riskFactorLabels={riskFactorLabels}
        />
      </div>

      {/* Recommendations */}
      <div className="mb-6">
        <RecommendationsBlock recommendations={recommendations} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryKpi
          icon={FileText}
          title="Contratos"
          value={totalContracts}
          sub={`${activeContracts} ativo${activeContracts !== 1 ? "s" : ""}`}
          highlight={expiredContracts.length > 0 ? "critical" : expiringContracts.length > 0 ? "warning" : undefined}
        />
        <SummaryKpi
          icon={TrendingUp}
          title="Valor em vigência"
          value={formatCurrency(totalContractValue, account ? "BRL" : undefined)}
          sub="contratos ativos/vencendo"
        />
        <SummaryKpi
          icon={FileX}
          title="Documentos"
          value={totalDocuments}
          sub={`${expiredDocuments.length + expiringDocuments.length} com atenção`}
          highlight={expiredDocuments.length > 0 ? "critical" : expiringDocuments.length > 0 ? "warning" : undefined}
        />
        <SummaryKpi
          icon={Bell}
          title="Alertas abertos"
          value={openAlerts.length}
          sub={openAlerts.filter((a) => a.severity === "critical").length > 0 ? "inclui críticos" : "sem críticos"}
          highlight={openAlerts.some((a) => a.severity === "critical") ? "critical" : openAlerts.length > 0 ? "warning" : undefined}
        />
      </div>

      {/* Contracts section */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Contratos ({totalContracts})
            </span>
            <Link
              href={`/accounts/${id}`}
              className="text-xs font-normal text-primary hover:underline"
            >
              Ver detalhes
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum contrato cadastrado para esta conta.
            </p>
          ) : (
            <div className="space-y-2">
              {contracts.map((c) => {
                const now = new Date()
                const end = new Date(c.ends_at)
                const diffDays = Math.round(
                  (end.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) /
                    (1000 * 60 * 60 * 24)
                )
                const isUrgent =
                  c.derivedStatus === "expired" || c.derivedStatus === "expiring"

                return (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:opacity-80 ${
                      isUrgent ? "bg-amber-50 border border-amber-100" : "bg-muted/40"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(c.total_value, c.currency)} · vence {formatDate(c.ends_at)}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2 shrink-0">
                      <StatusBadge status={c.derivedStatus} />
                      {c.derivedStatus === "expiring" && (
                        <span className="text-xs font-medium text-amber-600 whitespace-nowrap">
                          {diffDays <= 0 ? "hoje" : `em ${diffDays}d`}
                        </span>
                      )}
                      {c.derivedStatus === "expired" && (
                        <span className="text-xs font-medium text-red-600 whitespace-nowrap">
                          há {Math.abs(diffDays)}d
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents section */}
      {documents.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileX className="h-4 w-4 text-muted-foreground" />
              Documentos com vencimento ({expiredDocuments.length + expiringDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {expiredDocuments.length === 0 && expiringDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">
                Todos os documentos estão dentro do prazo.
              </p>
            ) : (
              <div className="space-y-2">
                {[...expiredDocuments, ...expiringDocuments].map((d) => {
                  const now = new Date()
                  const exp = new Date(d.expires_at!)
                  const diffDays = Math.round(
                    (exp.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) /
                      (1000 * 60 * 60 * 24)
                  )
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                        d.derivedStatus === "expired"
                          ? "bg-red-50 border border-red-100"
                          : "bg-amber-50 border border-amber-100"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.doc_type} · vence {formatDate(d.expires_at!)}
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2 shrink-0">
                        <DocumentStatusBadge expires_at={d.expires_at} />
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${
                            d.derivedStatus === "expired" ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {diffDays >= 0 ? `em ${diffDays}d` : `há ${Math.abs(diffDays)}d`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts section */}
      {openAlerts.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Alertas abertos ({openAlerts.length})
              </span>
              <Link
                href="/alerts"
                className="text-xs font-normal text-primary hover:underline"
              >
                Gerenciar alertas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {openAlerts.map((a) => {
              const sevClass =
                a.severity === "critical"
                  ? "bg-red-50 border-red-100 text-red-900"
                  : a.severity === "warning"
                  ? "bg-amber-50 border-amber-100 text-amber-900"
                  : "bg-blue-50 border-blue-100 text-blue-900"
              const dot =
                a.severity === "critical"
                  ? "bg-red-500"
                  : a.severity === "warning"
                  ? "bg-amber-400"
                  : "bg-blue-400"
              return (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${sevClass}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <p className="text-sm font-medium leading-tight">{a.title}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Footer: contact info */}
      {(account.contact_name || account.contact_email) && (
        <>
          <Separator className="my-4" />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <p className="font-medium">Contato:</p>
            {account.contact_name && <span>{account.contact_name}</span>}
            {account.contact_email && (
              <a
                href={`mailto:${account.contact_email}`}
                className="text-primary hover:underline"
              >
                {account.contact_email}
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── KPI component (local, summary-specific) ───────────────────────────────────

function SummaryKpi({
  icon: Icon,
  title,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType
  title: string
  value: string | number
  sub: string
  highlight?: "critical" | "warning"
}) {
  const borderClass =
    highlight === "critical"
      ? "border-red-200 bg-red-50/30"
      : highlight === "warning"
      ? "border-amber-200 bg-amber-50/30"
      : ""
  const iconClass =
    highlight === "critical"
      ? "text-red-500"
      : highlight === "warning"
      ? "text-amber-500"
      : "text-muted-foreground"
  const valueClass =
    highlight === "critical"
      ? "text-red-700"
      : highlight === "warning"
      ? "text-amber-700"
      : ""

  return (
    <Card className={borderClass}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
