"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

type State = { error: string | null }

export async function createTenantAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const name = formData.get("name") as string
  const slug = formData.get("slug") as string

  // Verify the user is authenticated via the session client
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado." }

  // Use service role to bypass RLS for the onboarding bootstrap:
  // new users have no tenant_id yet, so RLS blocks their first INSERT.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name, slug })
    .select()
    .single()

  if (tenantError) {
    if (tenantError.code === "23505") return { error: "Esse slug já está em uso." }
    return { error: tenantError.message }
  }

  const { error: memberError } = await admin
    .from("tenant_users")
    .insert({ tenant_id: tenant.id, user_id: user.id, role: "owner" })

  if (memberError) return { error: memberError.message }

  // Initialize onboarding_state and activation_metrics rows for the new tenant.
  // These are non-critical — don't fail the whole action if they error.
  try {
    await Promise.all([
      admin
        .from("onboarding_state")
        .insert({ tenant_id: tenant.id }),
      admin
        .from("activation_metrics")
        .insert({ tenant_id: tenant.id }),
    ])
  } catch {
    // intentionally swallowed — rows will be created lazily if missing
  }

  redirect("/welcome")
}
