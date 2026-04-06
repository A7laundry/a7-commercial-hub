import { createServiceClient } from "@/lib/supabase/service"
import { PageHeader } from "@/components/shared/PageHeader"
import { UsersTable } from "./UsersTable"

async function getAdminUsers() {
  const service = createServiceClient()

  // Fetch all auth users (up to 1000)
  const { data: { users }, error } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (error) throw error

  // Fetch all tenant memberships with tenant names
  const { data: memberships } = await service
    .from("tenant_users")
    .select("user_id, role, tenant_id, tenants(name)")

  return users.map((u) => {
    const m = memberships?.find((mb) => mb.user_id === u.id)
    const provider =
      (u.app_metadata?.provider as string) ??
      u.identities?.[0]?.provider ??
      "email"

    return {
      id: u.id,
      email: u.email ?? "—",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      provider,
      tenant_name: m ? (m.tenants as { name: string } | null)?.name ?? null : null,
      tenant_id: m?.tenant_id ?? null,
      role: m?.role ?? null,
    }
  })
}

export default async function AdminUsersPage() {
  const users = await getAdminUsers()

  return (
    <>
      <PageHeader
        title="Usuários"
        description={`${users.length} usuário${users.length !== 1 ? "s" : ""} registrado${users.length !== 1 ? "s" : ""}`}
      />
      <UsersTable users={users} />
    </>
  )
}
