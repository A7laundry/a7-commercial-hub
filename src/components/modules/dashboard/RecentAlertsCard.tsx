import { Bell, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { RecentAlert } from "@/hooks/dashboard/useDashboardData"

// Static severity config — outside component
const SEVERITY_CONFIG = {
  info:     { dot: "bg-blue-400",  text: "text-blue-800",  rowBg: "bg-blue-50/70 hover:bg-blue-50",   rowBorder: "border-blue-100",  iconBg: "bg-blue-100",  icon: "text-blue-600"  },
  warning:  { dot: "bg-amber-400", text: "text-amber-800", rowBg: "bg-amber-50/70 hover:bg-amber-50", rowBorder: "border-amber-100", iconBg: "bg-amber-100", icon: "text-amber-600" },
  critical: { dot: "bg-red-500",   text: "text-red-800",   rowBg: "bg-red-50/70 hover:bg-red-50",     rowBorder: "border-red-100",   iconBg: "bg-red-100",   icon: "text-red-600"   },
} as const

export function RecentAlertsCard({ alerts }: { alerts: RecentAlert[] }) {
  const criticalCount = alerts.filter((a) => a.severity === "critical").length

  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden h-full flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", criticalCount > 0 ? "bg-red-100" : "bg-slate-100")}>
            <Bell className={cn("h-3.5 w-3.5", criticalCount > 0 ? "text-red-600" : "text-slate-500")} />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">Alertas abertos</h3>
          {criticalCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 ring-1 ring-red-200">
              {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <Link
            href="/alerts"
            className="text-[10px] font-semibold text-muted-foreground hover:text-[#F5A623] flex items-center gap-1 transition-colors"
          >
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex-1">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum alerta aberto. Tudo em ordem.
          </p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((a) => {
              const cfg = SEVERITY_CONFIG[a.severity]
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    cfg.rowBg, cfg.rowBorder
                  )}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold leading-tight", cfg.text)}>
                      {a.title}
                    </p>
                    {a.account_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{a.account_name}</p>
                    )}
                  </div>
                  {a.contract_id && (
                    <Link
                      href={`/contracts/${a.contract_id}`}
                      className="shrink-0 text-xs font-semibold text-[#022448] hover:text-[#F5A623] mt-0.5 transition-colors"
                    >
                      Ver
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
