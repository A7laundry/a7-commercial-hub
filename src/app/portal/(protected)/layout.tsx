import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PortalProvider } from "@/components/providers/PortalProvider"
import { PortalShell } from "@/components/portal/PortalShell"
import type { PortalClient, Account, Tenant } from "@/types"

export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/portal/login")

  const { data: portalClient } = await supabase
    .from("portal_clients")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  // Also check by email for first-time magic link login (user_id not yet set)
  const resolvedClient = portalClient ?? (
    await supabase
      .from("portal_clients")
      .select("*")
      .eq("email", user.email ?? "")
      .eq("active", true)
      .maybeSingle()
  ).data

  if (!resolvedClient) redirect("/portal/login")

  // Link user_id on first login
  if (!resolvedClient.user_id) {
    await supabase
      .from("portal_clients")
      .update({ user_id: user.id })
      .eq("id", resolvedClient.id)
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", resolvedClient.account_id)
    .single()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", resolvedClient.tenant_id)
    .single()

  if (!account || !tenant) redirect("/portal/login")

  const session = {
    portalClient: resolvedClient as PortalClient,
    account: account as Account,
    tenant: tenant as Tenant,
  }

  return (
    <PortalProvider session={session}>
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  )
}
