import { FileText, ArrowRight } from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ContractSummary } from "@/hooks/dashboard/useDashboardData"

export function ExpiringContractsCard({ contracts }: { contracts: ContractSummary[] }) {
  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden h-full flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100">
            <FileText className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">Contratos vencendo</h3>
        </div>
        {contracts.length > 0 && (
          <Link
            href="/contracts?status=expiring"
            className="text-[10px] font-semibold text-muted-foreground hover:text-[#F5A623] flex items-center gap-1 transition-colors"
          >
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex-1">
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum contrato vencendo nos próximos 30 dias.
          </p>
        ) : (
          <div className="space-y-1.5">
            {contracts.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="crm-card flex items-center justify-between rounded-lg bg-[#f8f9fa] px-3 py-2.5 hover:bg-amber-50/60 transition-colors border border-transparent hover:border-amber-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#022448] truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.account_name}</p>
                </div>
                <div className="ml-3 flex items-center gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <span className={cn(
                    "text-xs font-bold whitespace-nowrap",
                    c.daysUntilExpiry <= 7 ? "text-red-600" : "text-amber-600"
                  )}>
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
                className="block text-xs font-semibold text-[#022448] hover:text-[#F5A623] text-center pt-2 transition-colors"
              >
                +{contracts.length - 5} contratos adicionais
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
