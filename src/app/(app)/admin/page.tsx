import { createServiceClient } from "@/lib/supabase/service"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, CreditCard, Smartphone, Clock, CheckCircle2 } from "lucide-react"

async function getAdminStats() {
  const service = createServiceClient()

  const [
    { count: orgCount },
    { count: subCount },
    { data: subs },
    { count: waCount },
  ] = await Promise.all([
    service.from("tenants").select("*", { count: "exact", head: true }),
    service.from("tenant_users").select("*", { count: "exact", head: true }),
    service.from("subscriptions").select("status, plan"),
    service
      .from("whatsapp_integrations")
      .select("*", { count: "exact", head: true })
      .eq("status", "connected"),
  ])

  const activeSubs = subs?.filter((s) => s.status === "active").length ?? 0
  const trialSubs = subs?.filter((s) => s.status === "trialing").length ?? 0
  const paidOrgs = subs?.filter((s) => s.plan !== "free" && s.status === "active").length ?? 0

  return {
    orgs: orgCount ?? 0,
    users: subCount ?? 0,
    activeSubs,
    trialSubs,
    waConnected: waCount ?? 0,
    paidOrgs,
  }
}

export default async function AdminPage() {
  const stats = await getAdminStats()

  const cards = [
    { icon: Building2, label: "Organizações",       value: stats.orgs,       color: "text-blue-400" },
    { icon: Users,     label: "Usuários (membros)",  value: stats.users,      color: "text-violet-400" },
    { icon: CheckCircle2, label: "Assinaturas ativas", value: stats.activeSubs, color: "text-emerald-400" },
    { icon: Clock,     label: "Em trial",            value: stats.trialSubs,  color: "text-amber-400" },
    { icon: CreditCard, label: "Orgs pagas",         value: stats.paidOrgs,   color: "text-emerald-400" },
    { icon: Smartphone, label: "WhatsApp conectado", value: stats.waConnected, color: "text-green-400" },
  ]

  return (
    <>
      <PageHeader
        title="Painel Admin"
        description="Visão geral do SaaS — usuários, organizações e assinaturas"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
