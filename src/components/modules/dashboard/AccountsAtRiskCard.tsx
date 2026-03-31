import { Building2, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import type { AccountRisk } from "@/hooks/dashboard/useDashboardData"

const RISK_CONFIG = {
  high: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700",
    label: "Alto",
    row: "border-red-100",
  },
  medium: {
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    label: "Médio",
    row: "border-amber-100",
  },
  low: {
    dot: "bg-green-400",
    badge: "bg-green-100 text-green-700",
    label: "Baixo",
    row: "border-muted",
  },
} as const

export function AccountsAtRiskCard({ accounts }: { accounts: AccountRisk[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Contas com atenção necessária
          </span>
          {accounts.length > 0 && (
            <Link
              href="/accounts"
              className="text-xs font-normal text-primary hover:underline flex items-center gap-1"
            >
              Ver contas
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma conta requer atenção no momento.
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => {
              const cfg = RISK_CONFIG[acc.riskLevel]
              return (
                <Link
                  key={acc.id}
                  href={`/accounts/${acc.id}`}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors ${cfg.row}`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
                  <p className="text-sm font-medium flex-1 truncate">{acc.name}</p>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                    {acc.expiredContracts > 0 && (
                      <span className="text-red-600 font-medium">
                        {acc.expiredContracts} vencido{acc.expiredContracts !== 1 ? "s" : ""}
                      </span>
                    )}
                    {acc.expiringContracts > 0 && (
                      <span className="text-amber-600 font-medium">
                        {acc.expiringContracts} vencendo
                      </span>
                    )}
                    {acc.openAlerts > 0 && (
                      <span className="text-muted-foreground">
                        {acc.openAlerts} alerta{acc.openAlerts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
