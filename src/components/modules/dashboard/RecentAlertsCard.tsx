import { Bell, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import type { RecentAlert } from "@/hooks/dashboard/useDashboardData"

const SEVERITY_CONFIG = {
  info: { dot: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
  warning: { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  critical: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50 border-red-100" },
} as const

export function RecentAlertsCard({ alerts }: { alerts: RecentAlert[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Alertas abertos
          </span>
          {alerts.length > 0 && (
            <Link
              href="/alerts"
              className="text-xs font-normal text-primary hover:underline flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum alerta aberto. Tudo em ordem.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const cfg = SEVERITY_CONFIG[a.severity]
              return (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${cfg.bg}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${cfg.text}`}>
                      {a.title}
                    </p>
                    {a.account_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{a.account_name}</p>
                    )}
                  </div>
                  {a.contract_id && (
                    <Link
                      href={`/contracts/${a.contract_id}`}
                      className="shrink-0 text-xs text-primary hover:underline mt-0.5"
                    >
                      Ver
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
