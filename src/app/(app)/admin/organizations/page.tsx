import { createServiceClient } from "@/lib/supabase/service"
import { PageHeader } from "@/components/shared/PageHeader"
import { OrgsTable } from "./OrgsTable"

async function getAdminOrgs() {
  const service = createServiceClient()

  const [
    { data: tenants },
    { data: memberships },
    { data: subs },
    { data: integrations },
    { data: { users } },
  ] = await Promise.all([
    service.from("tenants").select("id, name, slug, created_at").order("created_at", { ascending: false }),
    service.from("tenant_users").select("tenant_id, user_id, role"),
    service.from("subscriptions").select("tenant_id, plan, status"),
    service.from("whatsapp_integrations").select("tenant_id, status"),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  // Build user email lookup map
  const userMap = new Map(users.map((u) => [u.id, u.email ?? "—"]))

  return (tenants ?? []).map((tenant) => {
    const members = memberships?.filter((m) => m.tenant_id === tenant.id) ?? []
    const owner = members.find((m) => m.role === "owner")
    const sub = subs?.find((s) => s.tenant_id === tenant.id)
    const wa = integrations?.find((i) => i.tenant_id === tenant.id)

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      created_at: tenant.created_at,
      owner_email: owner ? (userMap.get(owner.user_id) ?? null) : null,
      member_count: members.length,
      plan: sub?.plan ?? "free",
      status: sub?.status ?? "trialing",
      whatsapp_connected: wa?.status === "connected",
    }
  })
}

export default async function AdminOrgsPage() {
  const orgs = await getAdminOrgs()

  return (
    <>
      <PageHeader
        title="Organizações"
        description={`${orgs.length} organização${orgs.length !== 1 ? "s" : ""} no sistema`}
      />
      <OrgsTable orgs={orgs} />
    </>
  )
}
