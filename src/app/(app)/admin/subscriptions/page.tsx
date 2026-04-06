import { createServiceClient } from "@/lib/supabase/service"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  trialing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  past_due: "bg-red-500/10 text-red-600 border-red-500/20",
  canceled: "bg-muted text-muted-foreground",
  paused:   "bg-muted text-muted-foreground",
}

const PLAN_PRICES: Record<string, string> = {
  free: "R$ 0", pro: "R$ 297/mês", scale: "R$ 697/mês",
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

async function getAdminSubscriptions() {
  const service = createServiceClient()
  const { data } = await service
    .from("subscriptions")
    .select("*, tenants(name)")
    .order("created_at", { ascending: false })

  return data ?? []
}

export default async function AdminSubscriptionsPage() {
  const subs = await getAdminSubscriptions()

  const active   = subs.filter((s) => s.status === "active").length
  const trialing = subs.filter((s) => s.status === "trialing").length
  const issues   = subs.filter((s) => ["past_due", "canceled"].includes(s.status)).length

  return (
    <>
      <PageHeader
        title="Assinaturas"
        description={`${active} ativas · ${trialing} em trial · ${issues} com problema`}
      />

      <div className="border rounded-lg overflow-x-auto text-sm">
        <table className="w-full">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Organização</th>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Trial até</th>
              <th className="text-left px-4 py-3">Renova em</th>
              <th className="text-left px-4 py-3">Stripe Customer</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhuma assinatura encontrada
                </td>
              </tr>
            )}
            {subs.map((sub) => {
              const tenant = sub.tenants as { name: string } | null
              return (
                <tr key={sub.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{tenant?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[11px] capitalize">{sub.plan}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[11px] border ${STATUS_COLORS[sub.status] ?? ""}`}>
                      {sub.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {PLAN_PRICES[sub.plan] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(sub.trial_end)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(sub.current_period_end)}</td>
                  <td className="px-4 py-3">
                    {sub.stripe_customer_id ? (
                      <code className="text-[11px] text-muted-foreground font-mono">
                        {sub.stripe_customer_id}
                      </code>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs italic">sem Stripe</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
