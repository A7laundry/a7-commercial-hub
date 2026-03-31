import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TenantProvider } from "@/components/providers/TenantProvider"
import { AppShell } from "@/components/layout/AppShell"
import type { Tenant, TenantUser } from "@/types"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: membership } = await supabase
    .from("tenant_users")
    .select("*, tenants(*)")
    .eq("user_id", user.id)
    .single()

  if (!membership) redirect("/onboarding")

  const tenant = membership.tenants as Tenant
  const currentUser: TenantUser & { email: string } = {
    id: membership.id,
    tenant_id: membership.tenant_id,
    user_id: membership.user_id,
    role: membership.role,
    created_at: membership.created_at,
    email: user.email ?? "",
  }

  return (
    <TenantProvider tenant={tenant} currentUser={currentUser}>
      <AppShell>{children}</AppShell>
    </TenantProvider>
  )
}
