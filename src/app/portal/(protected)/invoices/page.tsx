"use client"

import { usePortalSession } from "@/components/providers/PortalProvider"
import { usePortalInvoices } from "@/hooks/portal/usePortalInvoices"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Receipt } from "lucide-react"

const STATUS_CONFIG = {
  pending:   { label: "Pendente",  color: "bg-blue-100 text-blue-700" },
  paid:      { label: "Pago",      color: "bg-green-100 text-green-700" },
  overdue:   { label: "Em atraso", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelado", color: "bg-slate-100 text-slate-600" },
} as const

export default function PortalInvoicesPage() {
  const { account, tenant } = usePortalSession()
  const { data: invoices = [], isLoading } = usePortalInvoices(tenant.id, account.id)

  const totalPending = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0)
  const totalPaid    = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Faturas e pagamentos da sua conta.</p>
      </div>

      {invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total em aberto</p>
            <p className="text-xl font-bold">{totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total pago</p>
            <p className="text-xl font-bold text-green-600">{totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Receipt className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">Nenhuma fatura encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status]
            const amount = inv.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            const dueDate = new Date(inv.due_date).toLocaleDateString("pt-BR")
            const paidAt = inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : null
            return (
              <div key={inv.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{inv.title}</p>
                    {inv.reference && <p className="text-xs text-muted-foreground mt-0.5">Ref: {inv.reference}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{amount}</p>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block", cfg.color)}>{cfg.label}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Vencimento: {dueDate}</span>
                  {paidAt && <span>Pago em: {paidAt}</span>}
                  {inv.notes && <span className="truncate">{inv.notes}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
