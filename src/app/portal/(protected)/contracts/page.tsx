"use client"

import { usePortalSession } from "@/components/providers/PortalProvider"
import { usePortalContracts } from "@/hooks/portal/usePortalContracts"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

const STATUS_CONFIG = {
  active:    { label: "Ativo",       color: "bg-green-100 text-green-700" },
  expiring:  { label: "Vencendo",    color: "bg-amber-100 text-amber-700" },
  expired:   { label: "Vencido",     color: "bg-red-100 text-red-700" },
  draft:     { label: "Rascunho",    color: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelado",   color: "bg-slate-100 text-slate-600" },
} as const

export default function PortalContractsPage() {
  const { account, tenant } = usePortalSession()
  const { data: contracts = [], isPending: isLoading } = usePortalContracts(tenant.id, account.id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Contratos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Seus contratos vigentes e histórico.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">Nenhum contrato encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft
            const totalFormatted = c.total_value.toLocaleString("pt-BR", { style: "currency", currency: c.currency ?? "BRL" })
            return (
              <div key={c.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{c.title}</p>
                      {c.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.notes}</p>}
                    </div>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", cfg.color)}>{cfg.label}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4">
                  <div><p className="text-xs text-muted-foreground">Valor total</p><p className="text-sm font-medium mt-0.5">{totalFormatted}</p></div>
                  <div><p className="text-xs text-muted-foreground">Início</p><p className="text-sm font-medium mt-0.5">{new Date(c.starts_at).toLocaleDateString("pt-BR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vencimento</p><p className="text-sm font-medium mt-0.5">{new Date(c.ends_at).toLocaleDateString("pt-BR")}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
