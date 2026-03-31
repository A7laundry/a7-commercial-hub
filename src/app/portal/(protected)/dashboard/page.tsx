"use client"

import { usePortalSession } from "@/components/providers/PortalProvider"
import { usePortalContracts } from "@/hooks/portal/usePortalContracts"
import { usePortalInvoices } from "@/hooks/portal/usePortalInvoices"
import { usePortalDocuments } from "@/hooks/portal/usePortalDocuments"
import { FileText, Receipt, FolderOpen, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function PortalDashboardPage() {
  const { account, tenant } = usePortalSession()
  const { data: contracts = [] } = usePortalContracts(tenant.id, account.id)
  const { data: invoices = [] } = usePortalInvoices(tenant.id, account.id)
  const { data: documents = [] } = usePortalDocuments(tenant.id, account.id)

  const activeContracts   = contracts.filter((c) => c.status === "active")
  const expiringContracts = contracts.filter((c) => c.status === "expiring")
  const overdueInvoices   = invoices.filter((i) => i.status === "overdue")
  const pendingInvoices   = invoices.filter((i) => i.status === "pending")
  const expiredDocs       = documents.filter((d) => d._status === "expired")

  const alerts: Array<{ label: string; severity: "critical" | "warning" }> = []
  if (overdueInvoices.length > 0)
    alerts.push({ label: `${overdueInvoices.length} fatura${overdueInvoices.length > 1 ? "s" : ""} em atraso`, severity: "critical" })
  if (expiringContracts.length > 0)
    alerts.push({ label: `${expiringContracts.length} contrato${expiringContracts.length > 1 ? "s" : ""} próximo${expiringContracts.length > 1 ? "s" : ""} do vencimento`, severity: "warning" })
  if (expiredDocs.length > 0)
    alerts.push({ label: `${expiredDocs.length} documento${expiredDocs.length > 1 ? "s" : ""} com validade expirada`, severity: "warning" })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Bem-vindo, {account.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aqui estão as informações da sua conta.</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium border",
              a.severity === "critical" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
            )}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {a.label}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard href="/portal/contracts" icon={FileText} label="Contratos ativos" value={activeContracts.length}
          sub={expiringContracts.length > 0 ? `${expiringContracts.length} vencendo` : undefined} subColor="text-amber-600" />
        <KpiCard href="/portal/invoices" icon={Receipt} label="Faturas pendentes" value={pendingInvoices.length}
          sub={overdueInvoices.length > 0 ? `${overdueInvoices.length} em atraso` : undefined} subColor="text-red-600" />
        <KpiCard href="/portal/documents" icon={FolderOpen} label="Documentos" value={documents.length}
          sub={expiredDocs.length > 0 ? `${expiredDocs.length} expirados` : undefined} subColor="text-amber-600" />
        <KpiCard href="/portal/support" icon={CheckCircle} label="Contato" value="WhatsApp" isText />
      </div>

      {expiringContracts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Contratos vencendo em breve
          </h2>
          <div className="space-y-2">
            {expiringContracts.map((c) => (
              <Link key={c.id} href="/portal/contracts"
                className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vence em {new Date(c.ends_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Vencendo</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ href, icon: Icon, label, value, sub, subColor, isText }: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  sub?: string
  subColor?: string
  isText?: boolean
}) {
  return (
    <Link href={href} className="bg-card border border-border rounded-lg p-4 hover:bg-muted/40 transition-colors block">
      <Icon className="w-5 h-5 text-muted-foreground mb-2" />
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("font-bold", isText ? "text-base" : "text-2xl")}>{value}</p>
      {sub && <p className={cn("text-xs mt-0.5", subColor)}>{sub}</p>}
    </Link>
  )
}
