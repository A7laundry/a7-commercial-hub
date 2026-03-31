import { FileText, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import Link from "next/link"
import type { ContractSummary } from "@/hooks/dashboard/useDashboardData"

export function ExpiringContractsCard({ contracts }: { contracts: ContractSummary[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Contratos vencendo
          </span>
          {contracts.length > 0 && (
            <Link
              href="/contracts?status=expiring"
              className="text-xs font-normal text-primary hover:underline flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum contrato vencendo nos próximos 30 dias.
          </p>
        ) : (
          <div className="space-y-2">
            {contracts.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 hover:bg-muted/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.account_name}</p>
                </div>
                <div className="ml-3 flex items-center gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      c.daysUntilExpiry <= 7 ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {c.daysUntilExpiry === 0
                      ? "hoje"
                      : c.daysUntilExpiry === 1
                      ? "amanhã"
                      : `em ${c.daysUntilExpiry}d`}
                  </span>
                </div>
              </Link>
            ))}
            {contracts.length > 5 && (
              <Link
                href="/contracts?status=expiring"
                className="block text-xs text-primary hover:underline text-center pt-1"
              >
                +{contracts.length - 5} contratos adicionais
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
