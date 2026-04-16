import { Building2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/components/shared/UserAvatar"
import type { AccountRisk } from "@/hooks/dashboard/useDashboardData"

// Static risk config — outside component
const RISK_CONFIG = {
  high: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
    label: "Alto",
    rowBorder: "border-red-100",
    rowHover: "hover:bg-red-50/50",
    accentBar: "bg-red-500",
  },
  medium: {
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    label: "Médio",
    rowBorder: "border-amber-100",
    rowHover: "hover:bg-amber-50/50",
    accentBar: "bg-amber-400",
  },
  low: {
    dot: "bg-slate-300",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    label: "Baixo",
    rowBorder: "border-border",
    rowHover: "hover:bg-[#f8f9fa]",
    accentBar: "bg-slate-300",
  },
} as const

export function AccountsAtRiskCard({ accounts }: { accounts: AccountRisk[] }) {
  const highCount = accounts.filter((a) => a.riskLevel === "high").length

  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden h-full flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", highCount > 0 ? "bg-red-100" : "bg-[#022448]/8")}>
            <Building2 className={cn("h-3.5 w-3.5", highCount > 0 ? "text-red-600" : "text-[#022448]/50")} />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">Contas com atenção</h3>
          {highCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 ring-1 ring-red-200">
              {highCount} crítica{highCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {accounts.length > 0 && (
          <Link
            href="/accounts"
            className="text-[10px] font-semibold text-muted-foreground hover:text-[#F5A623] flex items-center gap-1 transition-colors"
          >
            Ver clientes
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex-1">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum cliente requer atenção no momento.
          </p>
        ) : (
          <div className="space-y-1.5">
            {accounts.map((acc) => {
              const cfg = RISK_CONFIG[acc.riskLevel]
              return (
                <Link
                  key={acc.id}
                  href={`/accounts/${acc.id}`}
                  className={cn(
                    "crm-card flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    cfg.rowBorder, cfg.rowHover
                  )}
                >
                  <UserAvatar displayName={acc.name} size={28} className="shrink-0" />
                  <p className="text-sm font-semibold text-[#022448] flex-1 truncate">{acc.name}</p>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    {acc.expiredContracts > 0 && (
                      <span className="text-red-600 font-bold">
                        {acc.expiredContracts}v
                      </span>
                    )}
                    {acc.expiringContracts > 0 && (
                      <span className="text-amber-600 font-bold">
                        {acc.expiringContracts}exp
                      </span>
                    )}
                    {acc.openAlerts > 0 && (
                      <span className="text-muted-foreground font-medium">
                        {acc.openAlerts} alerta{acc.openAlerts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", cfg.badge)}>
                    {cfg.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
